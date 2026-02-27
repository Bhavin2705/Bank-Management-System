const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateInvestment } = require('../middleware/validation');
const {
  getInvestments,
  getInvestment,
  getPortfolioSummary,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestmentStats
} = require('../controllers/investmentController');

// Get all investments for a user
router.get('/', protect, getInvestments);

// Get portfolio summary
router.get('/portfolio/summary', protect, getPortfolioSummary);

// Get investment statistics
router.get('/stats', protect, getInvestmentStats);

// Get investment by ID
router.get('/:id', protect, getInvestment);

// Create a new investment
router.post('/', protect, validateInvestment, createInvestment);

// Update an investment
router.put('/:id', protect, validateInvestment, updateInvestment);

// Delete an investment
router.delete('/:id', protect, deleteInvestment);

module.exports = router;
