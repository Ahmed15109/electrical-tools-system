const db = require('../models');
const { Supplier, Purchase, PurchaseItem, SupplierPayment, Product } = db;
const { QueryTypes, Op } = require('sequelize');
const sequelize = db.sequelize;
const { toSafeNumber } = require('../utils/money');




const _balanceCache = new Map();
const CACHE_TTL_MS = 60_000; 

function getCachedBalance(supplierId) {
    const entry = _balanceCache.get(supplierId);
    if (!entry) return null;
    if (Date.now() - entry.updatedAt > CACHE_TTL_MS) {
        _balanceCache.delete(supplierId);
        return null;
    }
    return entry.balance;
}

function setCachedBalance(supplierId, balance) {
    _balanceCache.set(supplierId, { balance, updatedAt: Date.now() });
}

function invalidateBalanceCache(supplierId) {
    if (supplierId) {
        _balanceCache.delete(Number(supplierId));
    } else {
        _balanceCache.clear(); 
    }
}


exports._invalidateBalanceCache = invalidateBalanceCache;




async function batchComputeBalances(supplierIds) {
    if (!supplierIds || supplierIds.length === 0) return new Map();

    const idList = supplierIds.join(',');

    
    const rows = await sequelize.query(`
        SELECT 
            s._id,
            COALESCE(p.totalPurchases, 0) as totalPurchases,
            COALESCE(sp.totalPaid, 0) as totalPaid
        FROM Suppliers s
        LEFT JOIN (
            SELECT supplier, SUM(totalAmount) as totalPurchases 
            FROM Purchases 
            WHERE supplier IN (${idList})
            GROUP BY supplier
        ) p ON p.supplier = s._id
        LEFT JOIN (
            SELECT supplier, SUM(amount) as totalPaid 
            FROM SupplierPayments 
            WHERE supplier IN (${idList})
            GROUP BY supplier
        ) sp ON sp.supplier = s._id
        WHERE s._id IN (${idList})
    `, { type: QueryTypes.SELECT });

    const balanceMap = new Map();
    for (const row of rows) {
        const balance = toSafeNumber(row.totalPurchases) - toSafeNumber(row.totalPaid);
        balanceMap.set(row._id, balance);
        setCachedBalance(row._id, balance);
    }
    return balanceMap;
}


async function computeSingleBalance(supplierId) {
    const cached = getCachedBalance(supplierId);
    if (cached !== null) return cached;

    const [result] = await sequelize.query(`
        SELECT 
            COALESCE((SELECT SUM(totalAmount) FROM Purchases WHERE supplier = :id), 0) as totalPurchases,
            COALESCE((SELECT SUM(amount) FROM SupplierPayments WHERE supplier = :id), 0) as totalPaid
    `, { replacements: { id: supplierId }, type: QueryTypes.SELECT });

    const balance = toSafeNumber(result.totalPurchases) - toSafeNumber(result.totalPaid);
    setCachedBalance(supplierId, balance);
    return balance;
}




exports.getSuppliers = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let queryOptions = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        };

        if (search) {
            queryOptions.where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { count, rows } = await Supplier.findAndCountAll(queryOptions);

        
        const supplierIds = rows.map(s => s._id);
        const balanceMap = await batchComputeBalances(supplierIds);

        const suppliers = rows.map(s => {
            const json = s.toJSON();
            json.balance = balanceMap.get(s._id) || 0;
            return json;
        });

        res.status(200).json({ success: true, count, data: suppliers });
    } catch (error) {
        console.error('[Suppliers Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSupplier = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المورد مفقود أو غير صالح' });
        }
        const supplier = await Supplier.findByPk(id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'المورد غير موجود' });
        }

        const json = supplier.toJSON();
        json.balance = await computeSingleBalance(id);

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        console.error(`[Suppliers Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSupplier = async (req, res) => {
    try {
        console.log('[Suppliers Backend] POST Payload:', req.body);

        const { name, phone } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'اسم المورد غير صالح' });
        }

        if (!phone || phone.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'رقم هاتف المورد مطلوب' });
        }

        const supplier = await Supplier.create({ name: name.trim(), phone: phone.trim() });
        res.status(201).json({ success: true, data: supplier });
    } catch (error) {
        console.error('[Suppliers Backend] Create Error:', error);

        let message = 'فشل في إنشاء مورد';
        if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'رقم الهاتف مسجل مسبقاً لمورد آخر';
        }

        res.status(400).json({ success: false, message });
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المورد مفقود أو غير صالح' });
        }

        const { name, phone } = req.body;

        if (name && name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'اسم المورد غير صالح' });
        }

        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });

        await supplier.update({
            ...(name && { name: name.trim() }),
            ...(phone && { phone: phone.trim() })
        });

        res.status(200).json({ success: true, data: supplier });
    } catch (error) {
        console.error(`[Suppliers Backend] Update Error for ID ${req.params.id}:`, error);

        let message = 'فشل في تحديث بيانات المورد';
        if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'رقم الهاتف مسجل مسبقاً لمورد آخر';
        }

        res.status(400).json({ success: false, message });
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المورد مفقود أو غير صالح' });
        }
        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });

        const purchasesCount = await Purchase.count({ where: { supplier: id } });
        const paymentsCount = await SupplierPayment.count({ where: { supplier: id } });

        if (purchasesCount > 0 || paymentsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف المورد لوجود فواتير مشتريات أو مدفوعات مرتبطة به.'
            });
        }

        invalidateBalanceCache(id);
        await supplier.destroy();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(`[Suppliers Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getSupplierStatement = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });

        
        const purchases = await Purchase.findAll({
            where: { supplier: req.params.id },
            include: [{ model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'productObj' }] }],
            order: [['createdAt', 'ASC']]
        });

        const payments = await SupplierPayment.findAll({
            where: { supplier: req.params.id },
            order: [['createdAt', 'ASC']]
        });

        
        const transactions = [];

        for (const purchase of purchases) {
            let productNames = '';
            if (purchase.items && Array.isArray(purchase.items)) {
                productNames = purchase.items
                    .map(item => `${item.productObj?.name || 'منتج'} ×${item.quantity}`)
                    .join('، ');
            }

            transactions.push({
                _id: purchase._id,
                date: purchase.createdAt,
                type: 'purchase',
                invoiceNumber: `PUR-${1000 + purchase._id}`,
                description: `شراء - ${productNames}`,
                owed: toSafeNumber(purchase.totalAmount),
                paid: 0
            });
        }

        for (const payment of payments) {
            transactions.push({
                _id: payment._id,
                date: payment.createdAt || payment.paymentDate,
                type: 'payment',
                invoiceNumber: `PAY-${1000 + payment._id}`,
                description: payment.description || 'دفعة للمورد',
                owed: 0,
                paid: toSafeNumber(payment.amount)
            });
        }

        
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        
        let running = 0;
        let totalPurchases = 0;
        let totalPaid = 0;

        for (const t of transactions) {
            running += t.owed - t.paid;
            t.balance = running;
            totalPurchases += t.owed;
            totalPaid += t.paid;
        }

        const balance = totalPurchases - totalPaid;

        
        setCachedBalance(supplier._id, balance);

        
        Supplier.update({ cachedBalance: balance }, { where: { _id: supplier._id } }).catch(() => {});

        
        const displayTransactions = [...transactions].reverse();

        res.status(200).json({
            success: true,
            supplier: {
                id: supplier._id,
                _id: supplier._id,
                name: supplier.name,
                phone: supplier.phone,
                balance
            },
            summary: { totalPurchases, totalPaid, balance },
            transactions: displayTransactions
        });
    } catch (error) {
        console.error('[Suppliers Backend] Statement Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
