const express = require('express');
const {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionStats,
    getTransactionCategories,
    validateTransferDetails,
    transferMoney
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const {
    validateObjectId,
    validatePagination,
    validateTransaction,
    validateTransfer
} = require('../middleware/validation');
const { apiLimiter, transactionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Transaction routes
router.get('/categories', getTransactionCategories);
router.get('/stats', getTransactionStats);
router.post('/validate-transfer', validateTransfer, validateTransferDetails); // Preview transfer details
router.post('/transfer', transactionLimiter, validateTransfer, transferMoney);

router.get('/', validatePagination, getTransactions);
router.post('/', transactionLimiter, validateTransaction, createTransaction);

router.get('/:id', validateObjectId, getTransaction);
router.put('/:id', validateObjectId, updateTransaction);
router.delete('/:id', validateObjectId, deleteTransaction);

module.exports = router;
