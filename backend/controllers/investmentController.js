const Investment = require('../models/Investment');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');

// @desc    Get all investments for a user
// @route   GET /api/investments
// @access  Private
const getInvestments = async (req, res) => {
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

    const investments = await Investment.find(query)
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Investment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: investments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching investments:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get investment by ID
// @route   GET /api/investments/:id
// @access  Private
const getInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    res.status(200).json({ success: true, data: investment });
  } catch (err) {
    console.error('Error fetching investment:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get investment portfolio summary
// @route   GET /api/investments/portfolio/summary
// @access  Private
const getPortfolioSummary = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const summary = await Investment.aggregate([
      { $match: { userId: req.user._id, status: 'active' } },
      {
        $group: {
          _id: '$type',
          totalValue: { $sum: '$totalValue' },
          totalInvested: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: '$_id',
          _id: 0,
          totalValue: 1,
          totalInvested: 1,
          profitLoss: { $subtract: ['$totalValue', '$totalInvested'] },
          count: 1
        }
      }
    ]);

    const totalInvested = summary.reduce((sum, s) => sum + s.totalInvested, 0);
    const totalValue = summary.reduce((sum, s) => sum + s.totalValue, 0);
    const totalProfitLoss = totalValue - totalInvested;

    res.status(200).json({
      success: true,
      data: {
        byType: summary,
        total: {
          totalInvested,
          totalValue,
          totalProfitLoss,
          percentageReturn: totalInvested > 0 ? ((totalProfitLoss / totalInvested) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (err) {
    console.error('Error fetching investment summary:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Create a new investment
// @route   POST /api/investments
// @access  Private
const createInvestment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Investment name is required' });
    }

    if (!req.body.type) {
      return res.status(400).json({ success: false, message: 'Investment type is required' });
    }

    if (!req.body.purchasePrice || req.body.purchasePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Valid purchase price is required' });
    }

    if (!req.body.quantity || req.body.quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    const investment = await Investment.create({
      userId: req.user._id,
      name: req.body.name.trim(),
      type: req.body.type,
      symbol: req.body.symbol || '',
      purchasePrice: req.body.purchasePrice,
      quantity: req.body.quantity,
      currentPrice: req.body.currentPrice || req.body.purchasePrice,
      totalValue: (req.body.currentPrice || req.body.purchasePrice) * req.body.quantity,
      purchaseDate: req.body.purchaseDate || new Date(),
      status: 'active',
      notes: req.body.notes || ''
    });

    res.status(201).json({ success: true, data: investment });
  } catch (err) {
    console.error('Error creating investment:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create investment' });
  }
};

// @desc    Update an investment
// @route   PUT /api/investments/:id
// @access  Private
const updateInvestment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    const oldValue = investment.totalValue;

    const allowedFields = ['name', 'purchasePrice', 'quantity', 'currentPrice', 'purchaseDate', 'status', 'notes'];
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        investment[key] = req.body[key];
      }
    });

    if (investment.currentPrice && investment.quantity) {
      investment.totalValue = investment.currentPrice * investment.quantity;
    }

    investment = await investment.save();

    const user = await User.findById(req.user._id);
    const change = investment.totalValue - (investment.purchasePrice * investment.quantity);

    const investmentDetails = {
      instrumentName: investment.name,
      currentValue: investment.totalValue,
      currency: 'INR',
      change: parseFloat(change.toFixed(2)),
      percentage: ((change / (investment.purchasePrice * investment.quantity)) * 100).toFixed(2),
      updatedAt: new Date()
    };

    emailHelpers.sendInvestmentNotification(user.email, investmentDetails);

    res.status(200).json({ success: true, data: investment });
  } catch (err) {
    console.error('Error updating investment:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update investment' });
  }
};

// @desc    Delete an investment
// @route   DELETE /api/investments/:id
// @access  Private
const deleteInvestment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    res.status(200).json({ success: true, message: 'Investment deleted successfully' });
  } catch (err) {
    console.error('Error deleting investment:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete investment' });
  }
};

// @desc    Get investment statistics
// @route   GET /api/investments/stats
// @access  Private
const getInvestmentStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const stats = await Investment.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalInvested: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } }
        }
      }
    ]);

    const typeStats = await Investment.aggregate([
      { $match: { userId: req.user._id, status: 'active' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byType: typeStats
      }
    });
  } catch (err) {
    console.error('Error fetching investment stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  getInvestments,
  getInvestment,
  getPortfolioSummary,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestmentStats
};
