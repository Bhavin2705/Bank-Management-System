const RecurringPayment = require('../models/RecurringPayment');

const ensureAuthenticatedUser = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return false;
  }
  return true;
};

const getRecurringPayments = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    const payments = await RecurringPayment.find({ userId: req.user._id });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error('Error fetching recurring payments:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createRecurringPayment = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    const payment = await RecurringPayment.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error('Error creating recurring payment:', err);
    res.status(400).json({ success: false, message: 'Failed to create recurring payment' });
  }
};

const updateRecurringPayment = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    const payment = await RecurringPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Recurring payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Error updating recurring payment:', err);
    res.status(400).json({ success: false, message: 'Failed to update recurring payment' });
  }
};

const deleteRecurringPayment = async (req, res) => {
  try {
    if (!ensureAuthenticatedUser(req, res)) return;
    const payment = await RecurringPayment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Recurring payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Error deleting recurring payment:', err);
    res.status(400).json({ success: false, message: 'Failed to delete recurring payment' });
  }
};

module.exports = {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment
};
