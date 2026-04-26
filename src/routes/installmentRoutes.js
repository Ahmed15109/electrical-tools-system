const express = require('express');
const { 
    getInstallments, 
    getInstallment, 
    createInstallment, 
    updateInstallment, 
    deleteInstallment, 
    getInstallmentsByCustomer, 
    payInstallment,
    cancelInstallmentPayment
} = require('../controllers/installmentController');

const router = express.Router();

router.route('/customer/:id').get(getInstallmentsByCustomer);
router.route('/:id/pay').post(payInstallment);
router.route('/:id/cancel').put(cancelInstallmentPayment);

router.route('/')
    .get(getInstallments)
    .post(createInstallment);

router.route('/:id')
    .get(getInstallment)
    .put(updateInstallment)
    .delete(deleteInstallment);

module.exports = router;
