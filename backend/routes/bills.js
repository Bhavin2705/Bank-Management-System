const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const { protect } = require('../middleware/auth');

// Get all bills for a user
router.get('/', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const bills = await Bill.find({ userId: req.user._id });
    res.json({ success: true, data: bills });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Create a new bill
router.post('/', protect, async (req, res) => {
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
      'utilities': 'electricity',
      'electricity': 'electricity',
      'water': 'water',
      'gas': 'gas',
      'internet': 'internet',
      'phone': 'phone',
      'cable_tv': 'cable_tv',
      'insurance': 'insurance',
      'loan': 'loan',
      'credit_card': 'credit_card',
      'rent': 'rent',
      'property_tax': 'property_tax',
      'vehicle': 'vehicle',
      'medical': 'medical',
      'education': 'education',
      'other': 'other'
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
});

// Update a bill
router.put('/:id', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: bill });
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update bill' });
  }
});

// Delete a bill
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: bill });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to delete bill' });
  }
});

module.exports = router;
