const express = require('express');
const { getPayments, getPayment, createPayment, updatePayment, deletePayment, addExpense, addManual } = require('../controllers/paymentController');

const router = express.Router();

router.route('/')
    .get(getPayments)
    .post(createPayment);

router.post('/expense', addExpense);
router.post('/manual', addManual);

router.route('/:id')
    .get(getPayment)
    .put(updatePayment)
    .delete(deletePayment);

module.exports = router;
