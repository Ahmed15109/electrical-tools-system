const { Customer, Sale, Installment, Payment, SystemVault } = require('../models');

const { Op } = require('sequelize');
const { toSafeNumber } = require('../utils/money');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalCustomers = await Customer.count();


        const totalSalesRes = await Sale.sequelize.query(`
            SELECT SUM(COALESCE(finalAmount, totalPrice)) as total FROM Sales
        `, { type: Sale.sequelize.QueryTypes.SELECT });
        const totalSales = toSafeNumber(totalSalesRes[0]?.total);


        const pendingInstallments = await Installment.count({ where: { status: 'pending' } });
        const overdueInstallments = await Installment.count({ 
            where: { 
                status: 'pending',
                dueDate: { [Op.lt]: new Date() }
            } 
        });


        const totalInRes = await Payment.sum('amount', { where: { type: 'in', isDeleted: false } });
        const totalOutRes = await Payment.sum('amount', { where: { type: 'out', isDeleted: false } });

                const totalRevenue = toSafeNumber(totalInRes);
        const vaultBalance = totalRevenue - toSafeNumber(totalOutRes);


        const revenueTrend = await Payment.sequelize.query(`
            SELECT strftime('%Y-%m-%d', paymentDate) as date, SUM(amount) as total 
            FROM Payments 
            WHERE type = 'in' AND isDeleted = false 
            GROUP BY date 
            ORDER BY date DESC 
            LIMIT 30
        `, { type: Sale.sequelize.QueryTypes.SELECT });


        const recentActivity = await Sale.sequelize.query(`
            SELECT 'sale' as type, _id as id, finalAmount as value, saleDate as date FROM Sales
            UNION ALL
            SELECT 'payment' as type, _id as id, amount as value, paymentDate as date FROM Payments WHERE type = 'in' AND isDeleted = false
            UNION ALL
            SELECT 'customer' as type, _id as id, 0 as value, createdAt as date FROM Customers
            ORDER BY date DESC 
            LIMIT 7
        `, { type: Sale.sequelize.QueryTypes.SELECT });


        res.status(200).json({
            success: true,
            totalCustomers: totalCustomers || 0,
            totalSales: toSafeNumber(totalSales),
            totalRevenue: toSafeNumber(totalRevenue),
            vaultBalance: toSafeNumber(vaultBalance),
            pendingInstallments: pendingInstallments || 0,
            overdueInstallments: overdueInstallments || 0,
            revenueTrend: revenueTrend ? revenueTrend.reverse().map(r => ({ ...r, total: toSafeNumber(r.total) })) : [],
            recentActivity: recentActivity ? recentActivity.map(a => ({ ...a, value: toSafeNumber(a.value) })) : []
        });
    } catch (error) {
        console.error('[Dashboard Stats Error] CRASH:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            totalCustomers: 0,
            totalSales: 0,
            totalRevenue: 0,
            vaultBalance: 0,
            pendingInstallments: 0,
            overdueInstallments: 0,
            salesTrend: [],
            revenueTrend: []
        });
    }
};

exports.getTreasurySummary = async (req, res) => {
    try {
        const totalInRes = await Payment.sum('amount', { where: { type: 'in', isDeleted: false } });
        const totalOutRes = await Payment.sum('amount', { where: { type: 'out', isDeleted: false } });

                const totalIn = totalInRes || 0;
        const totalOut = totalOutRes || 0;
        const balance = totalIn - totalOut;


        let vault = await SystemVault.findOne({ where: { identifier: 'main_vault' } });
        const cachedBalance = vault ? vault.totalCashBalance : 0;


        if (Math.abs(cachedBalance - balance) > 0) {
            console.warn(`[Treasury Recon] Mismatch detected! Payments SUM: ${balance}, Vault Cache: ${cachedBalance}. Forcing reconciliation...`);
            if (!vault) {
                await SystemVault.create({ identifier: 'main_vault', totalCashBalance: balance });
            } else {
                vault.totalCashBalance = balance;
                await vault.save();
            }
        }

        res.status(200).json({
            success: true,
            totalIn: toSafeNumber(totalIn),
            totalOut: toSafeNumber(totalOut),
            balance: toSafeNumber(balance) 
        });
    } catch (error) {
        console.error('[Treasury Summary Error]', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
