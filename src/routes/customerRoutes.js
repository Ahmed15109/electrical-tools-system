const express = require('express');
const {
    getCustomers, getCustomer, createCustomer, updateCustomer,
    deleteCustomer, getCustomerBalances, getCustomerStatement
} = require('../controllers/customerController');

const router = express.Router();

router.route('/report/balances').get(getCustomerBalances);

router.route('/').get(getCustomers).post(createCustomer);

router.get('/:id/statement', getCustomerStatement);

router.route('/:id')
    .get(getCustomer)
    .put(updateCustomer)
    .delete(deleteCustomer);

module.exports = router;
