const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');

// @desc    Get all bills for a user
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res) => {
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

    const bills = await Bill.find(query)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Bill.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bills,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    console.error('Error fetching bill:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Create a new bill
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate required fields
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Bill name is required' });
    }
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Map category to valid bill type
    const categoryTypeMap = {
      utilities: 'electricity',
      electricity: 'electricity',
      water: 'water',
      gas: 'gas',
      internet: 'internet',
      phone: 'phone',
      cable_tv: 'cable_tv',
      insurance: 'insurance',
      loan: 'loan',
      credit_card: 'credit_card',
      rent: 'rent',
      property_tax: 'property_tax',
      vehicle: 'vehicle',
      medical: 'medical',
      education: 'education',
      other: 'other'
    };

    const billType = categoryTypeMap[req.body.category] || categoryTypeMap[req.body.type] || 'other';

    // Provide defaults for required fields if not supplied
    const billData = {
      userId: req.user._id,
      type: billType,
      name: req.body.name.trim(),
      description: req.body.description || '',
      billNumber: req.body.billNumber || `BILL-${Date.now()}`,
      accountNumber: req.body.accountNumber || req.user._id.toString().slice(-8),
      amount: req.body.amount,
      dueDate: req.body.dueDate || new Date(),
      status: req.body.status || 'pending'
    };

    const bill = await Bill.create(billData);

    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create bill' });
  }
};

// @desc    Update a bill
// @route   PUT /api/bills/:id
// @access  Private
const updateBill = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Update bill fields
    Object.assign(bill, req.body);
    bill = await bill.save();

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update bill' });
  }
};

// @desc    Delete a bill
// @route   DELETE /api/bills/:id
// @access  Private
const deleteBill = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const bill = await Bill.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.status(200).json({ success: true, message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete bill' });
  }
};

// @desc    Pay a bill
// @route   POST /api/bills/:id/pay
// @access  Private
const payBill = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Bill already paid' });
    }

    const paymentAmount = req.body.amount || bill.amount;

    if (paymentAmount < 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be positive' });
    }

    const reference = `BILLPAY-${bill._id}-${Date.now()}`;

    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'debit',
      amount: paymentAmount,
      balance: req.user.balance - paymentAmount,
      description: `Payment for ${bill.name}`,
      category: 'bill_payment',
      status: 'completed',
      billId: bill._id,
      reference: reference
    });

    bill.status = 'paid';
    bill.paidAmount = (bill.paidAmount || 0) + paymentAmount;
    bill.paidDate = new Date();
    bill.transactionId = transaction._id;
    await bill.save();

    req.user.balance -= paymentAmount;
    await req.user.save();

    const billDetails = {
      billName: bill.name,
      amount: paymentAmount,
      currency: 'INR',
      referenceNumber: reference,
      date: new Date()
    };

    emailHelpers.sendBillPaymentNotification(req.user.email, billDetails);

    res.status(200).json({
      success: true,
      message: 'Bill paid successfully',
      data: {
        bill,
        transaction
      }
    });
  } catch (err) {
    console.error('Error paying bill:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to pay bill' });
  }
};

// @desc    Get bill statistics
// @route   GET /api/bills/stats
// @access  Private
const getBillStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const stats = await Bill.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalBills = await Bill.countDocuments({ userId: req.user._id });
    const pendingBills = await Bill.countDocuments({ userId: req.user._id, status: 'pending' });
    const paidBills = await Bill.countDocuments({ userId: req.user._id, status: 'paid' });
    const overdueBills = await Bill.countDocuments({
      userId: req.user._id,
      status: 'overdue',
      dueDate: { $lt: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        totalBills,
        pendingBills,
        paidBills,
        overdueBills,
        statsByStatus: stats
      }
    });
  } catch (err) {
    console.error('Error fetching bill stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  getBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
  payBill,
  getBillStats
};
