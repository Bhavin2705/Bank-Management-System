const express = require('express');
const { getBanks, addBank, updateBank, deleteBank } = require('../controllers/bank.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

router.get('/', getBanks);
router.post('/', protect, authorize('admin'), addBank);
router.put('/:id', protect, authorize('admin'), validateObjectId, updateBank);
router.delete('/:id', protect, authorize('admin'), validateObjectId, deleteBank);

module.exports = router;
