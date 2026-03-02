const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');
const { createInAppNotification } = require('../utils/notifications');

const ensureAuthenticatedUser = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return false;
  }
  return true;
};

const findOwnedBill = (req, billId) => Bill.findOne({ _id: billId, userId: req.user._id });

const getBills = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;

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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createBill = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;

    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Bill name is required' });
    }
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

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
    res.status(400).json({ success: false, message: 'Failed to create bill' });
  }
};

const updateBill = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    let bill = await findOwnedBill(req, req.params.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    Object.assign(bill, req.body);
    bill = await bill.save();

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(400).json({ success: false, message: 'Failed to update bill' });
  }
};

const deleteBill = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;

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
    res.status(500).json({ success: false, message: 'Failed to delete bill' });
  }
};

const payBill = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    const bill = await findOwnedBill(req, req.params.id);

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

    if (req.user?.preferences?.notifications?.email !== false) {
      emailHelpers.sendBillPaymentNotification(req.user.email, billDetails);
    }

    await createInAppNotification({
      userId: req.user._id,
      type: 'bill_paid',
      title: 'Bill Paid Successfully',
      message: `${bill.name} bill paid for Rs ${paymentAmount.toLocaleString('en-IN')}.`,
      priority: 'medium',
      relatedId: bill._id,
      relatedModel: 'Bill',
      metadata: {
        amount: paymentAmount,
        category: 'bill_payment'
      }
    });

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
    res.status(400).json({ success: false, message: 'Failed to pay bill' });
  }
};

const getBillStats = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;

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
    res.status(500).json({ success: false, message: 'Server error' });
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
