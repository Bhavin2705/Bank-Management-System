const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment
} = require('../controllers/recurring.controller');

router.use(protect);

router.get('/', getRecurringPayments);
router.post('/', createRecurringPayment);
router.put('/:id', updateRecurringPayment);
router.delete('/:id', deleteRecurringPayment);

module.exports = router;
