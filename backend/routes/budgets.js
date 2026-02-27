const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBudget } = require('../middleware/validation');
const {
  getBudgets,
  getBudget,
  getBudgetSummary,
  createBudget,
  updateBudget,
  deleteBudget,
  updateBudgetSpent,
  getBudgetStats
} = require('../controllers/budgetController');

router.get('/', protect, getBudgets);

router.get('/summary', protect, getBudgetSummary);

router.get('/stats', protect, getBudgetStats);

router.get('/:id', protect, getBudget);

router.post('/', protect, validateBudget, createBudget);

router.post('/:id/update-spent', protect, updateBudgetSpent);

router.put('/:id', protect, validateBudget, updateBudget);

router.delete('/:id', protect, deleteBudget);

module.exports = router;
