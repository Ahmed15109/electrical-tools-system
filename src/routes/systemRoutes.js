const express = require('express');
const { resetSystem } = require('../controllers/systemController');

const router = express.Router();


router.delete('/reset', resetSystem);

module.exports = router;
