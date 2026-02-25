const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all budgets for a user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
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

    const budgets = await Budget.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Budget.countDocuments(query);

    res.status(200).json({
      success: true,
      data: budgets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get budget by ID
// @route   GET /api/budgets/:id
// @access  Private
const getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    console.error('Error fetching budget:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get budget summary
// @route   GET /api/budgets/summary
// @access  Private
const getBudgetSummary = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const summary = await Budget.aggregate([
      { $match: { userId: req.user._id, status: 'active' } },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$amount' },
          totalSpent: { $sum: '$spent' },
          budgetCount: { $sum: 1 },
          overBudgetCount: {
            $sum: { $cond: [{ $gte: ['$spent', '$amount'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: summary.length > 0 ? summary[0] : {}
    });
  } catch (err) {
    console.error('Error fetching budget summary:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Budget name is required' });
    }

    if (!req.body.category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({ success: false, message: 'Budget amount must be positive' });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      name: req.body.name.trim(),
      category: req.body.category,
      amount: req.body.amount,
      period: req.body.period || 'monthly',
      status: 'active',
      spent: 0
    });

    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    console.error('Error creating budget:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create budget' });
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    // Update allowed fields
    const allowedFields = ['name', 'amount', 'period', 'status', 'spent'];
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        budget[key] = req.body[key];
      }
    });

    // Check if over budget
    if (budget.spent > budget.amount) {
      budget.status = 'over_budget';
    } else if (budget.status === 'over_budget') {
      budget.status = 'active';
    }

    budget = await budget.save();

    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update budget' });
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.status(200).json({ success: true, message: 'Budget deleted successfully' });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete budget' });
  }
};

// @desc    Update budget spent amount based on transactions
// @route   POST /api/budgets/:id/update-spent
// @access  Private
const updateBudgetSpent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    // Get transactions for this category
    const transactions = await Transaction.find({
      userId: req.user._id,
      category: budget.category,
      type: 'debit'
    });

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    budget.spent = totalSpent;

    // Update status if needed
    if (budget.spent > budget.amount) {
      budget.status = 'over_budget';
    } else if (budget.status === 'over_budget') {
      budget.status = 'active';
    }

    await budget.save();

    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    console.error('Error updating budget spent:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update budget' });
  }
};

// @desc    Get budget statistics
// @route   GET /api/budgets/stats
// @access  Private
const getBudgetStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const stats = await Budget.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$amount' },
          totalSpent: { $sum: '$spent' }
        }
      }
    ]);

    const categoryStats = await Budget.aggregate([
      { $match: { userId: req.user._id, status: 'active' } },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          spent: { $sum: '$spent' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byCategory: categoryStats
      }
    });
  } catch (err) {
    console.error('Error fetching budget stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  getBudgets,
  getBudget,
  getBudgetSummary,
  createBudget,
  updateBudget,
  deleteBudget,
  updateBudgetSpent,
  getBudgetStats
};
