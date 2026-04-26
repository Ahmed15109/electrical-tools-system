const db = require('../models');
const { Purchase, PurchaseItem, Product, Supplier, SupplierPayment, SystemVault, Payment } = db;
const sequelize = db.sequelize;
const { QueryTypes } = require('sequelize');
const { toCents, toSafeNumber } = require('../utils/money');


const { _invalidateBalanceCache } = require('./supplierController');


async function updateCachedBalance(supplierId, transaction) {
    const [result] = await sequelize.query(`
        SELECT 
            COALESCE((SELECT SUM(totalAmount) FROM Purchases WHERE supplier = :id), 0) as totalPurchases,
            COALESCE((SELECT SUM(amount) FROM SupplierPayments WHERE supplier = :id), 0) as totalPaid
    `, { replacements: { id: supplierId }, type: QueryTypes.SELECT, transaction });

    const balance = (result.totalPurchases || 0) - (result.totalPaid || 0);
    await Supplier.update({ cachedBalance: balance }, { where: { _id: supplierId }, transaction });
    return balance;
}

exports.getPurchases = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows: purchases } = await Purchase.findAndCountAll({
            include: [
                { model: Supplier, as: 'supplierObj' },
                { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'productObj' }] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        const data = purchases.map(p => {
            const json = p.toJSON();
            json.supplier = json.supplierObj || json.supplier;
            return json;
        });

        res.status(200).json({ success: true, count, data });
    } catch (error) {
        console.error('[Purchases Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPurchase = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف الفاتورة مفقود أو غير صالح' });
        }

        const purchase = await Purchase.findByPk(id, {
            include: [
                { model: Supplier, as: 'supplierObj' },
                { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'productObj' }] }
            ]
        });

        if (!purchase) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

        const json = purchase.toJSON();
        json.supplier = json.supplierObj || json.supplier;
        res.status(200).json({ success: true, data: json });
    } catch (error) {
        console.error(`[Purchases Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPurchase = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { supplier: supplierId, products, paidAmount: rawPaid, purchaseDate } = req.body;
        const activeDate = purchaseDate ? new Date(purchaseDate) : new Date();

        if (!supplierId || supplierId === 'undefined' || supplierId === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى تحديد المورد بشكل صحيح' });
        }

        const supplierDoc = await Supplier.findByPk(supplierId, { transaction: t });
        if (!supplierDoc) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'المورد غير موجود' });
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى إضافة منتج واحد على الأقل' });
        }

        let totalAmountCents = 0;
        const itemsToCreate = [];
        const stockUpdates = [];

        for (const item of products) {
            if (!item.product || item.product === 'undefined') {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'معرف المنتج مفقود' });
            }

            const product = await Product.findByPk(item.product, { transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `المنتج غير موجود بـ ID: ${item.product}` });
            }

            const qty = Number(item.quantity) || 0;
            const costCents = toSafeNumber(item.costPrice);

            if (qty <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `الكمية غير صالحة للمنتج: ${product.name}` });
            }
            if (costCents < 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `سعر التكلفة غير صالح للمنتج: ${product.name}` });
            }

            totalAmountCents += qty * costCents;
            itemsToCreate.push({ product: product._id, quantity: qty, costPrice: costCents });
            stockUpdates.push({ productDoc: product, addQuantity: qty });
        }

        const paidAmountCents = Math.max(0, toSafeNumber(rawPaid));

        if (paidAmountCents > totalAmountCents) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة' });
        }

        const remainingAmountCents = totalAmountCents - paidAmountCents;

        const purchase = await Purchase.create({
            supplier: supplierId,
            totalAmount: totalAmountCents,
            paidAmount: paidAmountCents,
            remainingAmount: remainingAmountCents,
            purchaseDate: activeDate,
            createdAt: activeDate,
            updatedAt: activeDate
        }, { transaction: t });

        for (const item of itemsToCreate) {
            await PurchaseItem.create({
                purchase: purchase._id,
                product: item.product,
                quantity: item.quantity,
                costPrice: item.costPrice
            }, { transaction: t });
        }

        for (const u of stockUpdates) {
            u.productDoc.stock += u.addQuantity;
            await u.productDoc.save({ transaction: t });
        }

        if (paidAmountCents > 0) {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (!vault) {
                vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
            }
            vault.totalCashBalance -= paidAmountCents;
            await vault.save({ transaction: t });

            const productNames = stockUpdates.map(u => u.productDoc.name).join('، ');
            await SupplierPayment.create({
                supplier: supplierId,
                purchase: purchase._id,
                amount: paidAmountCents,
                description: `دفعة مع فاتورة شراء - ${productNames}`,
                paymentDate: activeDate,
                createdAt: activeDate,
                updatedAt: activeDate
            }, { transaction: t });

            await Payment.create({
                amount: paidAmountCents,
                type: 'out',
                source: 'purchase',
                description: `شراء من ${supplierDoc?.name || 'مورد غير معروف'} - ${productNames}`,
                paymentMethod: 'cash',
                paymentDate: activeDate,
                createdAt: activeDate,
                updatedAt: activeDate,
                reference: `purchase_${purchase._id}`
            }, { transaction: t });
        }

        await updateCachedBalance(supplierId, t);
        await t.commit();
        _invalidateBalanceCache(supplierId);

        console.log(`[Purchases Backend] Purchase ${purchase._id} created successfully (Integer Based). Total: ${totalAmountCents}, Paid: ${paidAmountCents}`);
        res.status(201).json({ success: true, data: purchase });

    } catch (error) {
        await t.rollback();
        console.error('[Purchases Backend] Create Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updatePurchase = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'معرف الفاتورة مفقود أو غير صالح' });
        }

        const purchase = await Purchase.findByPk(id, {
            include: [{ model: PurchaseItem, as: 'items' }],
            transaction: t
        });
        if (!purchase) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        const { products: newProducts, paidAmount: newRawPaid } = req.body;


        for (const oldItem of purchase.items) {
            const product = await Product.findByPk(oldItem.product, { transaction: t });
            if (product) {
                product.stock -= oldItem.quantity; 
                await product.save({ transaction: t });
            }
        }

        const oldPayments = await SupplierPayment.findAll({
            where: { purchase: purchase._id },
            transaction: t
        });
        let oldTotalPaidCents = 0;
        for (const op of oldPayments) {
            oldTotalPaidCents += op.amount;
        }
        if (oldTotalPaidCents > 0) {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (vault) {
                vault.totalCashBalance += oldTotalPaidCents; 
                await vault.save({ transaction: t });
            }
        }

        await SupplierPayment.destroy({ where: { purchase: purchase._id }, transaction: t });
        await Payment.destroy({ where: { reference: `purchase_${purchase._id}` }, transaction: t });
        await PurchaseItem.destroy({ where: { purchase: purchase._id }, transaction: t });

        if (!newProducts || !Array.isArray(newProducts) || newProducts.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى إضافة منتج واحد على الأقل' });
        }

        let newTotalAmountCents = 0;
        const newItemsToCreate = [];
        const newStockUpdates = [];

        for (const item of newProducts) {
            const product = await Product.findByPk(item.product, { transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `المنتج غير موجود بـ ID: ${item.product}` });
            }
            const qty = Number(item.quantity) || 0;
            const costCents = toSafeNumber(item.costPrice);

            newTotalAmountCents += qty * costCents;
            newItemsToCreate.push({ product: product._id, quantity: qty, costPrice: costCents });
            newStockUpdates.push({ productDoc: product, addQuantity: qty });
        }

        const newPaidAmountCents = Math.max(0, toSafeNumber(newRawPaid));
        if (newPaidAmountCents > newTotalAmountCents) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة' });
        }
        const newRemainingAmountCents = newTotalAmountCents - newPaidAmountCents;

        for (const u of newStockUpdates) {
            u.productDoc.stock += u.addQuantity;
            await u.productDoc.save({ transaction: t });
        }

        for (const item of newItemsToCreate) {
            await PurchaseItem.create({
                purchase: purchase._id,
                product: item.product,
                quantity: item.quantity,
                costPrice: item.costPrice
            }, { transaction: t });
        }

        if (newPaidAmountCents > 0) {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
            vault.totalCashBalance -= newPaidAmountCents;
            await vault.save({ transaction: t });

            const productNames = newStockUpdates.map(u => u.productDoc.name).join('، ');
            await SupplierPayment.create({
                supplier: purchase.supplier,
                purchase: purchase._id,
                amount: newPaidAmountCents,
                description: `دفعة مع فاتورة شراء (تعديل) - ${productNames}`,
                paymentDate: new Date()
            }, { transaction: t });

            const supplierDoc = await Supplier.findByPk(purchase.supplier, { transaction: t });
            await Payment.create({
                amount: newPaidAmountCents,
                type: 'out',
                source: 'purchase',
                description: `شراء من ${supplierDoc?.name || 'مورد'} (تعديل) - ${productNames}`,
                paymentMethod: 'cash',
                paymentDate: new Date(),
                reference: `purchase_${purchase._id}`
            }, { transaction: t });
        }

        await purchase.update({
            totalAmount: newTotalAmountCents,
            paidAmount: newPaidAmountCents,
            remainingAmount: newRemainingAmountCents
        }, { transaction: t });

        await updateCachedBalance(purchase.supplier, t);
        await t.commit();
        _invalidateBalanceCache(purchase.supplier);
        res.status(200).json({ success: true, data: purchase });

    } catch (error) {
        await t.rollback();
        console.error(`[Purchases Backend] Update Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deletePurchase = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'معرف الفاتورة مفقود أو غير صالح' });
        }

        const purchase = await Purchase.findByPk(id, {
            include: [{ model: PurchaseItem, as: 'items' }],
            transaction: t
        });
        if (!purchase) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        for (const item of purchase.items) {
            const product = await Product.findByPk(item.product, { transaction: t });
            if (product) {
                product.stock -= item.quantity;
                if (product.stock < 0) product.stock = 0; 
                await product.save({ transaction: t });
            }
        }

        const relatedPayments = await SupplierPayment.findAll({
            where: { purchase: purchase._id },
            transaction: t
        });
        let totalPaidBackCents = 0;
        for (const p of relatedPayments) {
            totalPaidBackCents += p.amount;
        }
        if (totalPaidBackCents > 0) {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (vault) {
                vault.totalCashBalance += totalPaidBackCents; 
                await vault.save({ transaction: t });
            }
        }

        const deletedSupplierId = purchase.supplier;
        await SupplierPayment.destroy({ where: { purchase: purchase._id }, transaction: t });
        await Payment.destroy({ where: { reference: `purchase_${purchase._id}` }, transaction: t });
        await PurchaseItem.destroy({ where: { purchase: purchase._id }, transaction: t });
        await purchase.destroy({ transaction: t });

        await updateCachedBalance(deletedSupplierId, t);
        await t.commit();
        _invalidateBalanceCache(deletedSupplierId);
        console.log(`[Purchases Backend] Purchase ${id} deleted (Integer Based).`);
        res.status(200).json({ success: true, data: {} });

    } catch (error) {
        await t.rollback();
        console.error(`[Purchases Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSupplierPayment = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { supplier: supplierId, amount, description } = req.body;

        if (!supplierId) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى تحديد المورد' });
        }

        const supplierDoc = await Supplier.findByPk(supplierId, { transaction: t });
        if (!supplierDoc) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'المورد غير موجود' });
        }

        const amountCents = toSafeNumber(amount);
        if (amountCents <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ صحيح' });
        }

        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
        if (!vault) {
            vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
        }
        vault.totalCashBalance -= amountCents;
        await vault.save({ transaction: t });

        const payment = await SupplierPayment.create({
            supplier: supplierId,
            amount: amountCents,
            description: description || 'دفعة للمورد',
            paymentDate: new Date()
        }, { transaction: t });

        await Payment.create({
            amount: amountCents,
            type: 'out',
            source: 'supplier_payment',
            description: `دفعة للمورد ${supplierDoc?.name || 'مورد غير معروف'} - ${description || 'دفعة للمورد'}`,
            paymentMethod: 'cash',
            paymentDate: new Date(),
            reference: `supplier_payment_${payment._id}`
        }, { transaction: t });

        await updateCachedBalance(supplierId, t);
        await t.commit();
        _invalidateBalanceCache(supplierId);

        res.status(201).json({ success: true, data: payment });

    } catch (error) {
        await t.rollback();
        console.error('[Purchases Backend] Supplier Payment Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

