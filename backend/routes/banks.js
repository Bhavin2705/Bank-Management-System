const express = require('express');
const { getBanks } = require('../controllers/userController');

const router = express.Router();

// @desc    Get list of popular banks
// @route   GET /api/banks
// @access  Public
router.get('/', getBanks);

module.exports = router;