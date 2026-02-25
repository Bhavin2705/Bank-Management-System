const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
  payBill,
  getBillStats
} = require('../controllers/billController');

// Get all bills for a user
router.get('/', protect, getBills);

// Get bill statistics
router.get('/stats', protect, getBillStats);

// Get bill by ID
router.get('/:id', protect, getBill);

// Create a new bill
router.post('/', protect, createBill);

// Pay a bill
router.post('/:id/pay', protect, payBill);

// Update a bill
router.put('/:id', protect, updateBill);

// Delete a bill
router.delete('/:id', protect, deleteBill);

module.exports = router;
