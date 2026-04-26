const { Customer, Sale, Installment, Payment, db } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const { toCents, toSafeNumber } = require('../utils/money');

exports.getCustomers = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const query = `
            SELECT 
                c.*,
                (
                    COALESCE(c.openingBalance, 0) +
                    (SELECT COALESCE(SUM(COALESCE(finalAmount, totalPrice)), 0) FROM Sales WHERE customer = c._id AND status != 'cancelled') -
                    (SELECT COALESCE(SUM(amount), 0) FROM Payments WHERE customer = c._id AND type = 'in' AND isDeleted = false) +
                    (SELECT COALESCE(SUM(amount), 0) FROM Payments WHERE customer = c._id AND type = 'out' AND isDeleted = false)
                ) as balance
            FROM Customers c
            ${search ? `WHERE c.name LIKE :search OR c.nationalId LIKE :search` : ''}
            ORDER BY c.createdAt DESC
            LIMIT :limit OFFSET :offset
        `;

        const customers = await Customer.sequelize.query(query, {
            replacements: {
                search: `%${search}%`,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            type: QueryTypes.SELECT
        });

        const countRes = await Customer.count({
            where: search ? {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { nationalId: { [Op.like]: `%${search}%` } }
                ]
            } : {}
        });

        res.status(200).json({ 
            success: true, 
            count: countRes, 
            data: customers.map(c => ({
                ...c,
                id: c._id, 
                balance: toSafeNumber(c.balance)
            })) 
        });
    } catch (error) {
        console.error('[Customers Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerSuggestions = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.trim().length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const safeQuery = query.trim();
        const isNumeric = /^\d+$/.test(safeQuery);

                let whereClause;
        if (isNumeric) {
            whereClause = { nationalId: { [Op.like]: `${safeQuery}%` } };
        } else {
            whereClause = { name: { [Op.like]: `%${safeQuery}%` } };
        }

        const customers = await Customer.findAll({
            where: whereClause,
            limit: 10,
            attributes: ['_id', 'name', 'nationalId', 'nationalIdImage']
        });

        res.status(200).json({ success: true, data: customers });
    } catch (error) {
         console.error('[Customers Backend] Suggestions Error:', error.message);
         res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف العميل مفقود أو غير صالح' });
        }
        const query = `
            SELECT 
                c.*,
                (
                    COALESCE(c.openingBalance, 0) +
                    (SELECT COALESCE(SUM(COALESCE(finalAmount, totalPrice)), 0) FROM Sales WHERE customer = c._id AND status != 'cancelled') -
                    (SELECT COALESCE(SUM(amount), 0) FROM Payments WHERE customer = c._id AND type = 'in' AND isDeleted = false) +
                    (SELECT COALESCE(SUM(amount), 0) FROM Payments WHERE customer = c._id AND type = 'out' AND isDeleted = false)
                ) as balance
            FROM Customers c
            WHERE c._id = :id
        `;

        const results = await Customer.sequelize.query(query, {
            replacements: { id },
            type: QueryTypes.SELECT
        });

        if (!results || results.length === 0) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        const customer = results[0];
        res.status(200).json({ 
            success: true, 
            data: {
                ...customer,
                id: customer._id,
                balance: toSafeNumber(customer.balance)
            } 
        });
    } catch (error) {
        console.error(`[Customers Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        console.log('[Customers Backend] POST Payload:', req.body);

                const { name, phone, nationalId, openingBalance } = req.body;


        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'اسم العميل غير صالح' });
        }


        if (phone && phone.trim() !== '') {
            if (phone.trim().length !== 11 || !/^\d+$/.test(phone.trim())) {
                return res.status(400).json({ success: false, message: 'رقم الهاتف يجب أن يكون 11 رقماً بالضبط' });
            }
        }


        if (nationalId && nationalId.trim() !== '') {
            const cleanId = nationalId.trim();
            if (cleanId.length !== 14 || !/^\d+$/.test(cleanId)) {
                return res.status(400).json({ success: false, message: 'الرقم القومي يجب أن يكون 14 رقماً بالضبط' });
            }
            req.body.nationalId = cleanId;
        } else {
            req.body.nationalId = null;
        }


        const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;
        const cleanEmail = req.body.email && req.body.email.trim() !== '' ? req.body.email.trim() : null;
        const openingBalanceCents = toSafeNumber(openingBalance);

        const customer = await Customer.create({
            ...req.body,
            phone: cleanPhone,
            email: cleanEmail,
            openingBalance: openingBalanceCents
        });
        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        console.error('[Customers Backend] Create Error:', error);

                let message = 'فشل في إنشاء عميل';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(e => e.message).join(' | ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'هذا العميل أو البريد الإلكتروني مسجل مسبقاً';
        }

        res.status(400).json({ success: false, message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف العميل مفقود أو غير صالح' });
        }

        console.log('[Customers Backend] PUT Payload:', req.body);
        const { name, phone, nationalId, openingBalance } = req.body;


        if (name && name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'اسم العميل غير صالح' });
        }


        if (phone && (phone.length !== 11 || !/^\d+$/.test(phone))) {
            return res.status(400).json({ success: false, message: 'رقم الهاتف يجب أن يكون 11 رقماً بالضبط' });
        }


        if (nationalId && nationalId.trim() !== '') {
            const cleanId = nationalId.trim();
            if (cleanId.length !== 14 || !/^\d+$/.test(cleanId)) {
                return res.status(400).json({ success: false, message: 'الرقم القومي يجب أن يكون 14 رقماً بالضبط' });
            }
            req.body.nationalId = cleanId;
        } else {
            req.body.nationalId = null;
        }


        const updatePhone = phone && phone.trim() !== '' ? phone.trim() : null;
        const updateEmail = req.body.email && req.body.email.trim() !== '' ? req.body.email.trim() : null;

        const customer = await Customer.findByPk(id);
        if (!customer) return res.status(404).json({ success: false, message: '\u0627\u0644\u0639\u0645\u064a\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });

        const updatedData = {
            ...req.body,
            phone: updatePhone,
            email: updateEmail,
        };
        if (openingBalance !== undefined) {
            updatedData.openingBalance = toSafeNumber(openingBalance);
        }

        await customer.update(updatedData);
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        console.error(`[Customers Backend] Update Error for ID ${req.params.id}:`, error);

                let message = 'فشل في تحديث بيانات العميل';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(e => e.message).join(' | ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'بيانات هذا العميل (مثل البريد أو الرقم القومي) مستخدمة بالفعل';
        }

        res.status(400).json({ success: false, message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف العميل مفقود أو غير صالح' });
        }
        const customer = await Customer.findByPk(id);
        if (!customer) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

        const salesCount = await Sale.count({ where: { customer: id } });
        const installmentsCount = await Installment.count({ where: { customer: id } });
        const paymentsCount = await Payment.count({ where: { customer: id } });

        if (salesCount > 0 || installmentsCount > 0 || paymentsCount > 0) {
             return res.status(400).json({ 
                 success: false, 
                 message: 'لا يمكن حذف العميل لوجود معاملات مالية أو فواتير مرتبطة به.' 
             });
        }

        await customer.destroy();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(`[Customers Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerBalances = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let saleDateCond = '';
        let paymentDateCond = '';
        const replacements = {};

        if (startDate || endDate) {
            if (startDate && endDate) {
                saleDateCond = ` AND saleDate BETWEEN :startDate AND :endDate`;
                paymentDateCond = ` AND paymentDate BETWEEN :startDate AND :endDate`;
                replacements.startDate = new Date(startDate).toISOString();
                replacements.endDate = new Date(endDate).toISOString();
            } else if (startDate) {
                saleDateCond = ` AND saleDate >= :startDate`;
                paymentDateCond = ` AND paymentDate >= :startDate`;
                replacements.startDate = new Date(startDate).toISOString();
            } else if (endDate) {
                saleDateCond = ` AND saleDate <= :endDate`;
                paymentDateCond = ` AND paymentDate <= :endDate`;
                replacements.endDate = new Date(endDate).toISOString();
            }
        }

        const query = `
            SELECT 
                c._id, c.name, c.phone, COALESCE(c.openingBalance, 0) as openingBalance,
                (SELECT COALESCE(SUM(COALESCE(finalAmount, totalPrice)), 0) FROM Sales WHERE customer = c._id AND status != 'cancelled' ${saleDateCond}) as totalSales,
                (SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) FROM Payments WHERE customer = c._id AND isDeleted = false ${paymentDateCond}) as totalPaid
            FROM Customers c
        `;

                let balances = await Customer.sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        balances = balances.map(b => ({
            ...b,
            openingBalance: toSafeNumber(b.openingBalance),
            totalSales: toSafeNumber(b.totalSales),
            totalPaid: toSafeNumber(b.totalPaid),
            remainingBalance: (toSafeNumber(b.openingBalance) + toSafeNumber(b.totalSales)) - toSafeNumber(b.totalPaid)
        }));

        res.status(200).json({ success: true, count: balances.length, data: balances });
    } catch (error) {
        console.error('[Customers Backend] Balances Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerStatement = async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

        const sales = await Sale.findAll({ 
            where: { customer: req.params.id }, 
            order: [['createdAt', 'ASC']]
        });

        const payments = await Payment.findAll({ 
            where: { customer: req.params.id }, 
            order: [['createdAt', 'ASC']]
        });

        const installments = await Installment.findAll({ 
            where: { customer: req.params.id }, 
            order: [['dueDate', 'ASC']]
        });

        const transactions = [];


        const Product = require('../models').Product;
        const allProducts = await Product.findAll();
        const pMap = {};
        allProducts.forEach(p => pMap[p._id] = p.name);

        for (const sale of sales) {
            let productNames = '';
            if (sale.products && Array.isArray(sale.products)) {
                productNames = sale.products
                    .map(p => `${pMap[p.product] || 'منتج'} ×${p.quantity}`)
                    .join('، ');
            }

                        transactions.push({
                _id: sale._id,
                date: sale.createdAt,
                type: 'sale',
                invoiceNumber: `INV-${1000 + sale._id}`,
                description: `بيع - ${productNames}${sale.status === 'cancelled' ? ' (ملغاة)' : ''}`,
                debit: sale.status === 'cancelled' ? 0 : toSafeNumber(sale.finalAmount || sale.totalPrice),
                credit: 0,
                status: sale.status
            });
        }

        for (const payment of payments) {
            transactions.push({
                _id: payment._id,
                date: payment.createdAt || payment.paymentDate,
                type: 'payment',
                invoiceNumber: `REC-${1000 + payment._id}`,
                description: payment.description || 'دفعة',
                debit: payment.type === 'out' ? toSafeNumber(payment.amount) : 0,
                credit: payment.type === 'in' ? toSafeNumber(payment.amount) : 0,
                isDeleted: payment.isDeleted
            });
        }

        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        let running = 0;
        for (const t of transactions) {
            if (!t.isDeleted) {
                running += t.debit - t.credit;
            }
            t.balance = running;
        }

        const totalSales   = transactions.filter(t => t.type === 'sale' && !t.isDeleted).reduce((s, t) => s + t.debit, 0);
        const totalPaid    = transactions.filter(t => t.type === 'payment' && !t.isDeleted).reduce((s, t) => s + t.credit, 0);
        const balance      = totalSales - totalPaid;

                const now = new Date();
        const overdueCount = installments.filter(i => i.status === 'pending' && new Date(i.dueDate) < now).length;

        const displayTransactions = [...transactions].reverse();

        res.status(200).json({
            success: true,
            customer: {
                id: customer._id,
                _id: customer._id,
                name: customer?.name || 'عميل غير معروف',
                phone: customer.phone,
                address: customer.address,
                balance
            },
            summary: { totalSales, totalPaid, balance, overdueCount },
            transactions: displayTransactions,
            installments
        });
    } catch (error) {
        console.error('[Customers Backend] Statement Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
