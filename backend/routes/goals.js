const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateGoal } = require('../middleware/validation');
const {
  getGoals,
  getGoal,
  getGoalStats,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalProgress,
  getGoalsByPriority
} = require('../controllers/goalController');

// Get all goals for a user
router.get('/', protect, getGoals);

// Get goal statistics
router.get('/stats', protect, getGoalStats);

// Get goals by priority
router.get('/priority/:priority', protect, getGoalsByPriority);

// Get goal by ID
router.get('/:id', protect, getGoal);

// Create a new goal
router.post('/', protect, validateGoal, createGoal);

// Add progress to a goal
router.post('/:id/add-progress', protect, addGoalProgress);

// Update a goal
router.put('/:id', protect, validateGoal, updateGoal);

// Delete a goal
router.delete('/:id', protect, deleteGoal);

module.exports = router;
