const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { listPendingKyc, approveKyc, rejectKyc } = require('../controllers/adminKyc.controller');

router.use(protect);
router.use(authorize('admin'));
router.use(apiLimiter);

router.get('/', listPendingKyc);
router.post('/:userId/approve', approveKyc);
router.post('/:userId/reject', rejectKyc);

module.exports = router;
