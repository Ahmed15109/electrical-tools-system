const { Sale, Product, Installment, Payment, SystemVault, Customer } = require('../models');
const { toCents, calculateInterest, distributeInstallments, toSafeNumber } = require('../utils/money');

exports.getSales = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows: _sales } = await Sale.findAndCountAll({
            include: [
                { model: Customer, as: 'customerObj' },
                { model: Installment, as: 'installments' }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });


        const allProducts = await Product.findAll();
        const pMap = {};
        allProducts.forEach(p => pMap[p._id] = p.toJSON());

        const sales = _sales.map(s => {
            const json = s.toJSON();
            json.customer = json.customerObj || json.customer;
            json.invoiceNumber = `INV-${1000 + json._id}`;


            if (json.products && Array.isArray(json.products)) {
                json.products = json.products.map(item => ({
                    ...item,
                    product: pMap[item.product] || item.product
                }));
            }
            return json;
        });

        res.status(200).json({ success: true, count: count, data: sales });
    } catch (error) {
        console.error('[Sales Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSale = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المبيعة مفقود أو غير صالح' });
        }
        const _sale = await Sale.findByPk(id, {
            include: [
                { model: Customer, as: 'customerObj' },
                { model: Installment, as: 'installments' }
            ]
        });
        if (!_sale) return res.status(404).json({ success: false, message: 'المبيعة غير موجودة' });

                const json = _sale.toJSON();
        json.customer = json.customerObj || json.customer;
        json.invoiceNumber = `INV-${1000 + json._id}`;

        const allProducts = await Product.findAll();
        const pMap = {};
        allProducts.forEach(p => pMap[p._id] = p.toJSON());

        if (json.products && Array.isArray(json.products)) {
            json.products = json.products.map(item => ({
                ...item,
                product: pMap[item.product] || item.product
            }));
        }

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        console.error(`[Sales Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const db = require('../models');

exports.createSale = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { customer, products, paymentMethod, interestRate, months, downPayment, saleDate } = req.body;
        const activeDate = saleDate ? new Date(saleDate) : new Date();

        if (!customer || customer === 'undefined' || customer === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى تحديد العميل بشكل صحيح' });
        }

        const customerExists = await Customer.findByPk(customer, { transaction: t });
        if (!customerExists) {
            await t.rollback();
            return res.status(404).json({ success: false, message: `العميل غير موجود في قاعدة البيانات (ID: ${customer})` });
        }

        if (!products || products.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى إضافة منتج واحد على الأقل' });
        }

        let totalPriceCents = 0;
        const productUpdates = [];
        const saleProducts = [];

        console.log('[Sales Backend] Creating sale (Integer Based) with products:', products);

        for (let item of products) {
            if (!item.product || item.product === 'undefined' || item.product === 'null') {
                await t.rollback();
                return res.status(400).json({ success: false, message: `معرف المنتج مفقود أو غير صالح للكمية: ${item.quantity}` });
            }
            const product = await Product.findByPk(item.product, { transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `المنتج غير موجود بـ ID: ${item.product}` });
            }
            if (product.stock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `المخزون غير كافٍ للمنتج: ${product.name} (المتاح: ${product.stock})` });
            }

            let itemPriceCents = (item.price !== undefined && item.price !== null) 
                                 ? Number(item.price) || 0 
                                 : product.price; 
            
            if (itemPriceCents <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `السعر لا يمكن أن يكون صفراً أو سالباً للمنتج: ${product.name}` });
            }

            totalPriceCents += toSafeNumber(itemPriceCents) * (Number(item.quantity) || 0);
            productUpdates.push({ productDoc: product, deductQuantity: item.quantity });
            saleProducts.push({ product: product._id, quantity: item.quantity, price: itemPriceCents });
        }


        for (let u of productUpdates) {
            u.productDoc.stock -= u.deductQuantity;
            await u.productDoc.save({ transaction: t });
        }

        const rateBps        = Math.round(Number(interestRate)) || 0; 
        const numMonths      = Number(months) || 0;
        const dpCents        = toSafeNumber(downPayment);

        const dpCapped           = Math.min(dpCents, totalPriceCents);
        const afterDownCents     = Math.max(0, totalPriceCents - dpCapped);
        const interestAmountCents= paymentMethod === 'installment' ? calculateInterest(afterDownCents, rateBps) : 0;
        
        const finalAmountCents   = toSafeNumber(totalPriceCents) + toSafeNumber(interestAmountCents);
        const remainingCents     = Math.max(0, toSafeNumber(afterDownCents) + toSafeNumber(interestAmountCents));

        const installmentList    = distributeInstallments(remainingCents, numMonths);
        const monthlyAmountCents = installmentList.length > 0 ? installmentList[0] : 0; 

        if (dpCents < 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'المقدم لا يمكن أن يكون سالباً' });
        }
        if (dpCents > finalAmountCents) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'المقدم لا يمكن أن يتجاوز الإجمالي النهائي' });
        }

        const sale = await Sale.create({
            customer,
            products: saleProducts,
            totalPrice: totalPriceCents,
            interestRate: rateBps,
            interestAmount: interestAmountCents,
            finalAmount: finalAmountCents,
            downPayment: dpCents,
            remainingAmount: remainingCents,
            monthlyInstallment: monthlyAmountCents,
            durationMonths: numMonths,
            paymentMethod,
            saleDate: activeDate,
            createdAt: activeDate,
            updatedAt: activeDate
        }, { transaction: t });

        const productNames = saleProducts.map((p, i) => productUpdates[i].productDoc.name).join('، ');

        if (paymentMethod === 'cash') {
            await Payment.create({
                sale: sale._id,
                customer,
                amount: finalAmountCents,
                paymentMethod: 'cash',
                type: 'in',
                source: 'sale',
                description: `بيع نقدي - ${productNames}`,
                paymentDate: activeDate,
                createdAt: activeDate,
                updatedAt: activeDate
            }, { transaction: t });

            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
            vault.totalCashBalance += finalAmountCents;
            await vault.save({ transaction: t });

        } else if (paymentMethod === 'installment') {
            if (numMonths <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'يرجى تحديد عدد الأشهر' });
            }

            if (dpCents > 0) {
                await Payment.create({
                    sale: sale._id,
                    customer,
                    amount: dpCents,
                    paymentMethod: 'cash',
                    type: 'in',
                    source: 'sale',
                    description: `مقدم من العميل - ${productNames}`,
                    paymentDate: activeDate,
                    createdAt: activeDate,
                    updatedAt: activeDate
                }, { transaction: t });

                let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
                if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
                vault.totalCashBalance += dpCents;
                await vault.save({ transaction: t });
            }

            const now = activeDate;
            const year = now.getFullYear();
            const month = now.getMonth();
            const date = now.getDate();

            for (let i = 1; i <= numMonths; i++) {
                const targetMonth = month + i;
                const dueDate = new Date(year, targetMonth, date, 12, 0, 0, 0); 

                if (dueDate.getMonth() !== (targetMonth % 12 + 12) % 12) {
                    dueDate.setDate(0); 
                }

                const monthAmount = installmentList[i-1];

                await Installment.create({
                    sale:       sale._id,
                    customer:   customer,
                    amount:     monthAmount,
                    paidAmount: 0,
                    remainingAmount: monthAmount,
                    dueDate,
                    status:     'pending',
                    createdAt:  activeDate,
                    updatedAt:  activeDate
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(201).json({ success: true, data: sale });
    } catch (error) {
        await t.rollback();
        console.error('[Sales Backend] Create Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateSale = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المبيعة مفقود أو غير صالح' });
        }
        const sale = await Sale.findByPk(id);
        if (!sale) return res.status(404).json({ success: false, message: 'المبيعة غير موجودة' });
        await sale.update(req.body);
        res.status(200).json({ success: true, data: sale });
    } catch (error) {
        console.error(`[Sales Backend] Update Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteSale = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`[Sales Backend] Attempting deletion. ID: "${id}"`);
        if (!id || id === 'undefined' || id === 'null') {
            console.error('[Sales Backend] Delete rejected: Invalid ID');
            return res.status(400).json({ success: false, message: 'معرف المبيعة مفقود أو غير صالح' });
        }
        const sale = await Sale.findByPk(id);
        if (!sale) return res.status(404).json({ success: false, message: 'المبيعة غير موجودة' });
        await sale.destroy();
        console.log(`[Sales Backend] Sale ${id} deleted successfully`);
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(`[Sales Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.cancelSale = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        console.log(`[CancelSale] Start: ${id}`);

        if (!id || id === 'undefined' || id === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'معرف الفاتورة مفقود' });
        }

        const sale = await Sale.findByPk(id, { transaction: t });
        if (!sale) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        if (sale.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'هذه الفاتورة ملغاة بالفعل' });
        }

        if (sale.products && Array.isArray(sale.products)) {
            for (let item of sale.products) {
                const product = await Product.findByPk(item.product, { transaction: t });
                if (product) {
                    product.stock += Number(item.quantity) || 0;
                    await product.save({ transaction: t });
                }
            }
        }
        console.log(`[CancelSale] Stock restored`);

        const payments = await Payment.findAll({ where: { sale: id }, transaction: t });
        for (let payment of payments) {
            if (payment.type === 'in' && !payment.isDeleted) {
                let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
                if (vault) {
                    vault.totalCashBalance -= payment.amount;
                    await vault.save({ transaction: t });
                }

                await Payment.create({
                    amount: payment.amount,
                    type: 'out',
                    source: 'sale_cancel',
                    description: `إلغاء فاتورة - عكس دفعة (${payment.description || ''})`,
                    paymentDate: new Date(),
                    paymentMethod: payment.paymentMethod || 'cash',
                    reference: payment.reference || `CANCEL-${id}`,
                    customer: sale.customer,
                    sale: sale._id,
                    isDeleted: false
                }, { transaction: t });

                payment.description = (payment.description || '') + ' (معكوسة)';
                await payment.save({ transaction: t });
            }
        }
        console.log(`[CancelSale] Payments reversed`);

        await Installment.destroy({ where: { sale: id }, transaction: t });
        console.log(`[CancelSale] Installments removed`);

        sale.status = 'cancelled';
        await sale.save({ transaction: t });

        await t.commit();
        console.log(`[CancelSale] Completed successfully: ${id}`);
        res.status(200).json({ success: true, message: 'تم إلغاء المبيعة بنجاح واستعادة المخزون والمبالغ' });

    } catch (error) {
        if (t) await t.rollback();
        console.error(`[CancelSale] ERROR for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: 'فشل في إلغاء المبيعة: ' + error.message });
    }
};

