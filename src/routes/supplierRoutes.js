const express = require('express');
const {
    getSuppliers, getSupplier, createSupplier, updateSupplier,
    deleteSupplier, getSupplierStatement
} = require('../controllers/supplierController');

const router = express.Router();

router.route('/').get(getSuppliers).post(createSupplier);

router.get('/:id/statement', getSupplierStatement);

router.route('/:id')
    .get(getSupplier)
    .put(updateSupplier)
    .delete(deleteSupplier);

module.exports = router;
