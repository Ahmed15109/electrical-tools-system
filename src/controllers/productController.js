const { Product, Sale, PurchaseItem } = require('../models');
const { Op } = require('sequelize');
const { toCents, toSafeNumber } = require('../utils/money');

exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

                const { count, rows } = await Product.findAndCountAll({
             limit: parseInt(limit),
             offset: parseInt(offset),
             order: [['createdAt', 'DESC']]
        });

                res.status(200).json({ success: true, count, data: rows });
    } catch (error) {
        console.error('[Products Backend] Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المنتج مفقود أو غير صالح' });
        }
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error(`[Products Backend] Get Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.price !== undefined) {
            payload.price = toSafeNumber(payload.price);
        }
        const product = await Product.create(payload);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error('[Products Backend] Create Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المنتج مفقود أو غير صالح' });
        }
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        const payload = { ...req.body };
        if (payload.price !== undefined) {
            payload.price = toSafeNumber(payload.price);
        }
        await product.update(payload);
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error(`[Products Backend] Update Error for ID ${req.params.id}:`, error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`[Products Backend] Attempting deletion. Received ID: "${id}"`);
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'معرف المنتج مفقود أو غير صالح' });
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }



        const salesCount = await Sale.count({
            where: {
                [Op.or]: [
                    { products: { [Op.like]: `%"product":${id}%` } },
                    { products: { [Op.like]: `%"product":"${id}"%` } }
                ]
            }
        });


        const purchasesCount = await PurchaseItem.count({ where: { product: id } });

        if (salesCount > 0 || purchasesCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف هذا المنتج لوجوده في فواتير بيع أو شراء سابقة. يرجى تصفيره بدلاً من حذفه.'
            });
        }

        await product.destroy();
        console.log(`[Products Backend] Product ${id} deleted successfully`);
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(`[Products Backend] Delete Error for ID ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
