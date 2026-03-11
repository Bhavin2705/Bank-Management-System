const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { apiLimiter, transactionLimiter } = require('../middleware/rateLimit');
const { validateRecurringCreate, validateRecurringUpdate, validateObjectId } = require('../middleware/validation');
const {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment
} = require('../controllers/recurring.controller');

router.use(protect);
router.use(apiLimiter);

router.get('/', getRecurringPayments);
router.post('/', transactionLimiter, validateRecurringCreate, createRecurringPayment);
router.put('/:id', validateObjectId, validateRecurringUpdate, updateRecurringPayment);
router.delete('/:id', validateObjectId, deleteRecurringPayment);

module.exports = router;
