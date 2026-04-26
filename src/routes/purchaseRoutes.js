const express = require('express');
const {
    getPurchases, getPurchase, createPurchase,
    updatePurchase, deletePurchase, createSupplierPayment
} = require('../controllers/purchaseController');

const router = express.Router();

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.post('/supplier-payment', createSupplierPayment);

router.route('/:id')
    .get(getPurchase)
    .put(updatePurchase)
    .delete(deletePurchase);

module.exports = router;
