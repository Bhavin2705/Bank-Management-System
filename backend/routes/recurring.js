const express = require('express');
const router = express.Router();
const RecurringPayment = require('../models/RecurringPayment');
const { protect } = require('../middleware/auth');

// Get all recurring payments for a user
router.get('/', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const payments = await RecurringPayment.find({ userId: req.user._id });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error('Error fetching recurring payments:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Create a new recurring payment
router.post('/', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const payment = await RecurringPayment.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error('Error creating recurring payment:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create recurring payment' });
  }
});

// Update a recurring payment
router.put('/:id', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const payment = await RecurringPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Recurring payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Error updating recurring payment:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update recurring payment' });
  }
});

// Delete a recurring payment
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const payment = await RecurringPayment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: 'Recurring payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Error deleting recurring payment:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to delete recurring payment' });
  }
});

module.exports = router;
