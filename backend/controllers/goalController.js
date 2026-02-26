const Goal = require('../models/Goal');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');
const { createInAppNotification } = require('../utils/notifications');

// @desc    Get all goals for a user
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query)
      .sort({ priority: -1, targetDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Goal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: goals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get goal by ID
// @route   GET /api/goals/:id
// @access  Private
const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.status(200).json({ success: true, data: goal });
  } catch (err) {
    console.error('Error fetching goal:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get goal statistics
// @route   GET /api/goals/stats
// @access  Private
const getGoalStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const stats = await Goal.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalTarget: { $sum: '$targetAmount' },
          totalCurrent: { $sum: '$currentAmount' }
        }
      }
    ]);

    const totalGoals = await Goal.countDocuments({ userId: req.user._id });
    const activeGoals = await Goal.countDocuments({ userId: req.user._id, status: 'active' });
    const completedGoals = await Goal.countDocuments({ userId: req.user._id, status: 'completed' });

    res.status(200).json({
      success: true,
      data: {
        totalGoals,
        activeGoals,
        completedGoals,
        statsByStatus: stats
      }
    });
  } catch (err) {
    console.error('Error fetching goal stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Goal name is required' });
    }

    if (!req.body.targetAmount || req.body.targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Target amount must be positive' });
    }

    if (!req.body.targetDate) {
      return res.status(400).json({ success: false, message: 'Target date is required' });
    }

    const goal = await Goal.create({
      userId: req.user._id,
      name: req.body.name.trim(),
      description: req.body.description || '',
      category: req.body.category || 'other',
      targetAmount: req.body.targetAmount,
      currentAmount: req.body.currentAmount || 0,
      targetDate: req.body.targetDate,
      priority: req.body.priority || 'medium',
      status: 'active'
    });

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    console.error('Error creating goal:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create goal' });
  }
};

// @desc    Update a goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const allowedFields = ['name', 'description', 'targetAmount', 'currentAmount', 'targetDate', 'priority', 'status', 'category'];
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        goal[key] = req.body[key];
      }
    });

    if (goal.targetAmount > 0) {
      const percentComplete = (goal.currentAmount / goal.targetAmount) * 100;
      if (percentComplete >= 100) {
        goal.status = 'completed';
      }
    }

    goal = await goal.save();

    const user = await User.findById(req.user._id);

    const goalDetails = {
      goalName: goal.name,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      currency: 'INR'
    };

    if (user?.preferences?.notifications?.email !== false) {
      emailHelpers.sendGoalUpdateNotification(user.email, goalDetails);
    }

    await createInAppNotification({
      userId: req.user._id,
      type: 'goal_progress',
      title: goal.status === 'completed' ? 'Goal Completed' : 'Goal Updated',
      message: goal.status === 'completed'
        ? `Congrats! You completed "${goal.name}".`
        : `"${goal.name}" progress updated to Rs${goal.currentAmount.toLocaleString('en-IN')} of Rs${goal.targetAmount.toLocaleString('en-IN')}.`,
      priority: goal.status === 'completed' ? 'high' : 'medium',
      relatedId: goal._id,
      relatedModel: 'Goal',
      metadata: {
        amount: goal.currentAmount,
        category: 'goal'
      }
    });

    res.status(200).json({ success: true, data: goal });
  } catch (err) {
    console.error('Error updating goal:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update goal' });
  }
};

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.status(200).json({ success: true, message: 'Goal deleted successfully' });
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete goal' });
  }
};

// @desc    Add progress to a goal
// @route   POST /api/goals/:id/add-progress
// @access  Private
const addGoalProgress = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Progress amount must be positive' });
    }

    let goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    goal.currentAmount += amount;

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
      goal.currentAmount = goal.targetAmount;
    }

    goal = await goal.save();

    await createInAppNotification({
      userId: req.user._id,
      type: 'goal_progress',
      title: goal.status === 'completed' ? 'Goal Completed' : 'Goal Progress Added',
      message: goal.status === 'completed'
        ? `Congrats! You completed "${goal.name}".`
        : `Added Rs${amount.toLocaleString('en-IN')} to "${goal.name}".`,
      priority: goal.status === 'completed' ? 'high' : 'medium',
      relatedId: goal._id,
      relatedModel: 'Goal',
      metadata: {
        amount,
        category: 'goal'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Progress added successfully',
      data: goal
    });
  } catch (err) {
    console.error('Error adding goal progress:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to add progress' });
  }
};

// @desc    Get goals by priority
// @route   GET /api/goals/priority/:priority
// @access  Private
const getGoalsByPriority = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { priority } = req.params;
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority level' });
    }

    const goals = await Goal.find({
      userId: req.user._id,
      priority: priority,
      status: 'active'
    }).sort({ targetDate: 1 });

    res.status(200).json({ success: true, data: goals });
  } catch (err) {
    console.error('Error fetching goals by priority:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  getGoals,
  getGoal,
  getGoalStats,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalProgress,
  getGoalsByPriority
};
