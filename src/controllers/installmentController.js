const { Installment, Payment, SystemVault, Customer, Sale, Product } = require('../models');
const { Op } = require('sequelize');
const { toCents, toSafeNumber } = require('../utils/money');

exports.getInstallments = async (req, res) => {
    try {
        const _installments = await Installment.findAll({
            include: [
                { model: Sale, as: 'saleObj' },
                { model: Customer, as: 'customerObj' }
            ],
            order: [['dueDate', 'ASC']]
        });

        const allProducts = await Product.findAll();
        const pMap = {};
        allProducts.forEach(p => pMap[p._id] = p.toJSON());

        const installments = _installments.map(i => {
            const json = i.get({ plain: true });

            json.customerId = json.customerObj; 
            json.saleId     = json.saleObj;
            
            if (json.saleId && json.saleId.products && Array.isArray(json.saleId.products)) {
                json.saleId.products = json.saleId.products.map(item => ({
                    ...item,
                    product: pMap[item.product] || item.product
                }));
            }
            return json;
        });

        res.status(200).json({ success: true, count: installments.length, data: installments });
    } catch (error) {
        console.error('[Installments Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInstallment = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف القسط مفقود أو غير صالح' });
        }
        const _installment = await Installment.findByPk(id, {
            include: [
                { model: Sale, as: 'saleObj' },
                { model: Customer, as: 'customerObj' }
            ]
        });
        if (!_installment) {
            return res.status(404).json({ success: false, message: 'القسط غير موجود' });
        }
        const json = _installment.toJSON();
        json.saleId = json.saleObj || json.sale;
        json.customerId = json.customerObj || json.customer;

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        console.error(`[Installments Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInstallmentsByCustomer = async (req, res) => {
    try {
        const _installments = await Installment.findAll({ 
            where: { customer: req.params.id },
            include: [
                { model: Sale, as: 'saleObj' },
                { model: Customer, as: 'customerObj' }
            ]
        });
        const allProducts = await Product.findAll();
        const pMap = {};
        allProducts.forEach(p => pMap[p._id] = p.toJSON());

        const installments = _installments.map(i => {
            const json = i.toJSON();
            json.saleId = json.saleObj || json.sale;
            json.customerId = json.customerObj || json.customer;
            
            if (json.saleId && json.saleId.products && Array.isArray(json.saleId.products)) {
                json.saleId.products = json.saleId.products.map(item => ({
                    ...item,
                    product: pMap[item.product] || item.product
                }));
            }
            return json;
        });
        res.status(200).json({ success: true, count: installments.length, data: installments });
    } catch (error) {
        console.error(`[Installments Backend] Fetch for Customer Error:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createInstallment = async (req, res) => {
    try {

        const payload = { ...req.body };
        if (payload.saleId) payload.sale = payload.saleId;
        if (payload.customerId) payload.customer = payload.customerId;

        const installment = await Installment.create(payload);
        res.status(201).json({ success: true, data: installment });
    } catch (error) {
        console.error('[Installments Backend] Create Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateInstallment = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف القسط مفقود أو غير صالح' });
        }
        const installment = await Installment.findByPk(id);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'القسط غير موجود' });
        }
        const payload = { ...req.body };
        if (payload.saleId) payload.sale = payload.saleId;
        if (payload.customerId) payload.customer = payload.customerId;

        await installment.update(payload);
        res.status(200).json({ success: true, data: installment });
    } catch (error) {
        console.error(`[Installments Backend] Update Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteInstallment = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف القسط مفقود أو غير صالح' });
        }
        const installment = await Installment.findByPk(id);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'القسط غير موجود' });
        }
        await installment.destroy();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(`[Installments Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const db = require('../models');

exports.payInstallment = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        const amountToPay = Number(req.body.amount);
        const rawDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
        const paymentDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
        
        console.log(`[Installment] Payment start: ID ${id}, Amount: ${amountToPay}, Date: ${paymentDate}`);

        const installment = await Installment.findByPk(id, { transaction: t });
        if (!installment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'القسط غير موجود' });
        }

        if (installment.status === 'paid') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'هذا القسط مدفوع بالكامل بالفعل' });
        }

        if (installment.remainingAmount === null) {
            installment.remainingAmount = installment.amount - (installment.paidAmount || 0);
        }

        if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > installment.remainingAmount) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'مبلغ غير صالح' });
        }

        installment.paidAmount = Number(installment.paidAmount) + amountToPay;
        installment.remainingAmount = Number(installment.remainingAmount) - amountToPay;

        if (installment.remainingAmount === 0) {
            installment.status = 'paid';
            installment.paidAt = new Date(); // Keep as completion timestamp
        } else {
            installment.status = 'partial';
        }

        await installment.save({ transaction: t });

        let customerName = 'العميل';
        if (installment.customer) {
            const customerDoc = await Customer.findByPk(installment.customer, { transaction: t });
            if (customerDoc) customerName = customerDoc.name;
        }

        await Payment.create({
            sale: installment.sale,
            installment: installment._id,
            customer: installment.customer,
            amount: amountToPay,
            paymentDate: paymentDate, // Use the user-provided date
            paymentMethod: 'cash',
            type: 'in',
            source: 'installment',
            description: `دفعة قسط ${installment.status === 'paid' ? 'كاملة' : 'جزئية'} من ${customerName}`
        }, { transaction: t });

        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
        if (!vault) {
            vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
        }
        vault.totalCashBalance = toSafeNumber(vault.totalCashBalance) + amountToPay;
        await vault.save({ transaction: t });

        await t.commit();
        console.log(`[Installment] Paid: ${amountToPay}, Remaining: ${installment.remainingAmount}`);
        res.status(200).json({ success: true, data: installment });
    } catch (error) {
        if (t) await t.rollback();
        console.error(`[Installment] Pay Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.cancelInstallmentPayment = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        const { reason } = req.body;

        console.log(`[CancelPayment] Attempting cancellation for installment ID: ${id}`);

        const installment = await Installment.findByPk(id, { transaction: t });
        if (!installment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'القسط غير موجود' });
        }

        const payment = await Payment.findOne({
            where: {
                installment: installment._id,
                source: 'installment',
                isDeleted: false
            },
            order: [['createdAt', 'DESC']],
            transaction: t
        });

        if (!payment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'لا توجد دفعات نشطة لهذا القسط لإلغائها' });
        }

        // Reverse financial impact
        installment.paidAmount = Math.max(0, toSafeNumber(installment.paidAmount) - toSafeNumber(payment.amount));
        installment.remainingAmount = installment.amount - installment.paidAmount;

        if (installment.paidAmount === 0) {
            installment.status = 'pending';
            installment.paidAt = null;
        } else if (installment.paidAmount < installment.amount) {
            installment.status = 'partial';
            installment.paidAt = null;
        } else {
            installment.status = 'paid';
        }

        await installment.save({ transaction: t });

        payment.isDeleted = true;
        payment.cancelledAt = new Date();
        payment.cancelReason = reason || 'إلغاء الدفعة';
        await payment.save({ transaction: t });

        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
        if (vault) {
            vault.totalCashBalance = toSafeNumber(vault.totalCashBalance) - toSafeNumber(payment.amount);
            await vault.save({ transaction: t });
        }

        await t.commit();
        console.log(`[CancelPayment] Completed successfully. Reverted: ${payment.amount}`);
        res.status(200).json({ success: true, data: installment });

    } catch (error) {
        if (t) await t.rollback();
        console.error(`[CancelPayment] ERROR for installment ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
