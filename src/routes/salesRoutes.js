const express = require('express');
const { getSales, getSale, createSale, updateSale, deleteSale, cancelSale } = require('../controllers/salesController');

const router = express.Router();

router.route('/')
    .get(getSales)
    .post(createSale);

router.route('/:id')
    .get(getSale)
    .put(updateSale)
    .delete(deleteSale);

router.post('/:id/cancel', cancelSale);

module.exports = router;
