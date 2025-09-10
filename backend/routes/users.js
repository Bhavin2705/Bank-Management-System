const express = require('express');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getUserByAccountNumber,
    getBanks,
    updateUserRole,
    updateUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Public route for banks list (must be before protect middleware)
router.get('/banks', getBanks);

// All routes below require authentication
router.use(protect);

// Admin only routes
router.get('/stats', authorize('admin'), getUserStats);
router.get('/account/:accountNumber', authorize('admin'), getUserByAccountNumber);
router.put('/:id/role', authorize('admin'), validateObjectId, updateUserRole);
router.put('/:id/status', authorize('admin'), validateObjectId, updateUserStatus);

// General user routes (admin can access all, users can access their own)
router.get('/', authorize('admin'), validatePagination, getUsers);
router.get('/:id', validateObjectId, getUser);
router.put('/:id', validateObjectId, updateUser);
router.delete('/:id', authorize('admin'), validateObjectId, deleteUser);

module.exports = router;
