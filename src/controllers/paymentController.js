const { Payment, Installment, SystemVault, Customer, Sale } = require('../models');
const { toCents, toSafeNumber } = require('../utils/money');

exports.getPayments = async (req, res) => {
    try {
        const _payments = await Payment.findAll({
            include: [
                { model: Installment, as: 'installmentObj' },
                { model: Sale, as: 'saleObj' },
                { model: Customer, as: 'customerObj' }
            ]
        });
        const prefixMap = {
            sale: 'REC-',
            installment: 'REC-',
            expense: 'EXP-',
            manual: 'MNL-',
            refund: 'REF-',
            supplier_payment: 'PAY-',
            purchase: 'PAY-'
        };

        const payments = _payments.map(p => {
            const json = p.toJSON();
            const prefix = prefixMap[p.source] || 'TRN-';
            json.invoiceNumber = `${prefix}${1000 + p._id}`;
            json.installment = json.installmentObj || json.installment;
            json.sale = json.saleObj || json.sale;
            json.customer = json.customerObj || json.customer;
            return json;
        });
        res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        console.error('[Payments Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPayment = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف الدفع مفقود أو غير صالح' });
        }
        const _payment = await Payment.findByPk(id, {
            include: [
                { model: Installment, as: 'installmentObj' },
                { model: Sale, as: 'saleObj' },
                { model: Customer, as: 'customerObj' }
            ]
        });
        if (!_payment) {
            return res.status(404).json({ success: false, message: 'بيانات الدفع غير موجودة' });
        }
        const json = _payment.toJSON();
        
        const prefixMap = {
            sale: 'REC-',
            installment: 'REC-',
            expense: 'EXP-',
            manual: 'MNL-',
            refund: 'REF-',
            supplier_payment: 'PAY-',
            purchase: 'PAY-'
        };
        const prefix = prefixMap[_payment.source] || 'TRN-';
        json.invoiceNumber = `${prefix}${1000 + _payment._id}`;
        
        json.installment = json.installmentObj || json.installment;
        json.sale = json.saleObj || json.sale;
        json.customer = json.customerObj || json.customer;

                res.status(200).json({ success: true, data: json });
    } catch (error) {
        console.error(`[Payments Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const recalculateSchedules = (installmentDoc) => {





};

exports.createPayment = async (req, res) => {
    const t = await Payment.sequelize.transaction();
    try {
        const amountCents = toSafeNumber(req.body.amount);
        if (amountCents <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى تقديم مبلغ دفع صحيح' });
        }

        const payment = await Payment.create({ ...req.body, amount: amountCents }, { transaction: t });

        if (!paymentMethod || paymentMethod === 'cash') {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (!vault) {
                vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
            }
            vault.totalCashBalance += amountCents;
            await vault.save({ transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        await t.rollback();
        console.error('[Payments Backend] Create Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updatePayment = async (req, res) => {
    const t = await Payment.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'معرف الدفع مفقود أو غير صالح' });
        }
        const existingPayment = await Payment.findByPk(id, { transaction: t });
        if (!existingPayment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'بيانات الدفع غير موجودة' });
        }

        const oldAmount = existingPayment.amount;
        const newAmountCents = req.body.amount ? toSafeNumber(req.body.amount) : oldAmount;

        if (newAmountCents <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'يرجى تقديم مبلغ دفع صحيح' });
        }

        await existingPayment.update({ ...req.body, amount: newAmountCents }, { transaction: t });

        const isOldCash = !existingPayment.paymentMethod || existingPayment.paymentMethod === 'cash';
        const isNewCash = !req.body.paymentMethod || req.body.paymentMethod === 'cash';

        if (isOldCash || isNewCash) {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });

            if (isOldCash) vault.totalCashBalance -= oldAmount;
            if (isNewCash) vault.totalCashBalance += newAmountCents;

                        await vault.save({ transaction: t });
        }

        await t.commit();
        res.status(200).json({ success: true, data: existingPayment });
    } catch (error) {
        await t.rollback();
        console.error(`[Payments Backend] Update Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    const t = await Payment.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'معرف الدفع مفقود أو غير صالح' });
        }
        const payment = await Payment.findByPk(id, { transaction: t });
        if (!payment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'بيانات الدفع غير موجودة' });
        }

        if (!payment.paymentMethod || payment.paymentMethod === 'cash') {
            let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
            if (vault) {
                const wasIn = payment.type === 'in' || !payment.type;
                if (wasIn) vault.totalCashBalance -= payment.amount;
                else vault.totalCashBalance += payment.amount;
                await vault.save({ transaction: t });
            }
        }

        await payment.destroy({ transaction: t });

        await t.commit();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        await t.rollback();
        console.error(`[Payments Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addExpense = async (req, res) => {
    const t = await Payment.sequelize.transaction();
    try {
        const { amount, description } = req.body;

        const amountCents = toSafeNumber(amount);
        if (amountCents <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'يرجى إدخال مبلغ صحيح' });
        }

        const payment = await Payment.create({
            amount: amountCents,
            type: 'out',
            source: 'expense',
            description: description || 'مصروف',
            paymentMethod: 'cash'
        }, { transaction: t });

        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
        if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
        vault.totalCashBalance -= amountCents;
        await vault.save({ transaction: t });

        await t.commit();
        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        await t.rollback();
        console.error('[Payments Backend] Add Expense Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.addManual = async (req, res) => {
    const t = await Payment.sequelize.transaction();
    try {
        const { amount, description } = req.body;

        const amountCents = toSafeNumber(amount);
        if (amountCents <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'يرجى إدخال مبلغ صحيح' });
        }

        const payment = await Payment.create({
            amount: amountCents,
            type: 'in',
            source: 'manual',
            description: description || 'إضافة رصيد يدوي',
            paymentMethod: 'cash'
        }, { transaction: t });

        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' }, transaction: t });
        if (!vault) vault = await SystemVault.create({ identifier: 'main_vault', totalCashBalance: 0 }, { transaction: t });
        vault.totalCashBalance += amountCents;
        await vault.save({ transaction: t });

        await t.commit();
        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        await t.rollback();
        console.error('[Payments Backend] Add Manual Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};
