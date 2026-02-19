const express = require('express');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getBanks,
    getBankMetrics
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.get('/banks', getBanks);

router.use(protect);

router.get('/stats', authorize('admin'), getUserStats);
router.get('/bank-metrics', authorize('admin'), getBankMetrics);

router.get('/', authorize('admin'), validatePagination, getUsers);
router.get('/:id', validateObjectId, getUser);
router.put('/:id', validateObjectId, updateUser);
router.delete('/:id', authorize('admin'), validateObjectId, deleteUser);

module.exports = router;
