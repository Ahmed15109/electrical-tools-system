const express = require('express');
const { getDashboardStats, getTreasurySummary } = require('../controllers/statsController');

const router = express.Router();

router.get('/', getDashboardStats);
router.get('/treasury', getTreasurySummary);

module.exports = router;
