const express = require('express');
const { getBanks, addBank, updateBank, deleteBank } = require('../controllers/bank.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validateBankPayload } = require('../middleware/validation');
const { apiLimiter, settingsWriteLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', apiLimiter, getBanks);
router.post('/', protect, settingsWriteLimiter, authorize('admin'), validateBankPayload, addBank);
router.put('/:id', protect, settingsWriteLimiter, authorize('admin'), validateObjectId, validateBankPayload, updateBank);
router.delete('/:id', protect, settingsWriteLimiter, authorize('admin'), validateObjectId, deleteBank);

module.exports = router;
