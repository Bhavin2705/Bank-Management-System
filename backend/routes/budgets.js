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

// Get all budgets for a user
router.get('/', protect, getBudgets);

// Get budget summary
router.get('/summary', protect, getBudgetSummary);

// Get budget statistics
router.get('/stats', protect, getBudgetStats);

// Get budget by ID
router.get('/:id', protect, getBudget);

// Create a new budget
router.post('/', protect, validateBudget, createBudget);

// Update budget spent amount
router.post('/:id/update-spent', protect, updateBudgetSpent);

// Update a budget
router.put('/:id', protect, validateBudget, updateBudget);

// Delete a budget
router.delete('/:id', protect, deleteBudget);

module.exports = router;
