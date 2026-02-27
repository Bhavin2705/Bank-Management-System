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

router.get('/', protect, getBills);

router.get('/stats', protect, getBillStats);

router.get('/:id', protect, getBill);

router.post('/', protect, createBill);

router.post('/:id/pay', protect, payBill);

router.put('/:id', protect, updateBill);

router.delete('/:id', protect, deleteBill);

module.exports = router;
