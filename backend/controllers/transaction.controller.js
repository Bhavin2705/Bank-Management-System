const Transaction = require('../models/Transaction');
const transactionService = require('../services/transaction.service');
const transferService = require('../services/transfer.service');

const sendServiceError = (res, error, fallbackMessage) => {
    if (error.statusCode) {
        if (error.responseBody) {
            return res.status(error.statusCode).json(error.responseBody);
        }

        return res.status(error.statusCode).json({
            success: false,
            error: error.message
        });
    }

    return res.status(500).json({
        success: false,
        error: fallbackMessage
    });
};

const getTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const options = {
            limit,
            skip,
            type: req.query.type,
            category: req.query.category,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const transactions = await Transaction.getUserTransactions(req.user._id, options);

        const total = await Transaction.countDocuments({
            userId: req.user._id,
            ...(options.type && { type: options.type }),
            ...(options.category && { category: options.category }),
            ...(options.startDate && options.endDate && {
                createdAt: {
                    $gte: new Date(options.startDate),
                    $lte: new Date(options.endDate)
                }
            })
        });

        res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting transactions'
        });
    }
};

const getUserTransactionsAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const userId = req.params.id;

        const transactions = await Transaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await Transaction.countDocuments({ userId });

        res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting user transactions'
        });
    }
};

const getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('recipientId', 'name accountNumber')
            .populate('billId', 'name type')
            .populate('investmentId', 'name type');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        if (transaction.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this transaction'
            });
        }

        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting transaction'
        });
    }
};

const createTransaction = async (req, res) => {
    try {
        const result = await transactionService.createTransaction({
            userId: req.user._id,
            body: req.body
        });

        if (result.duplicateIgnored) {
            return res.status(200).json({
                success: true,
                data: result.existingTransaction,
                duplicateIgnored: true
            });
        }

        return res.status(201).json({
            success: true,
            data: result.transactionData
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return sendServiceError(res, error, 'Server error creating transaction');
    }
};

const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        if (transaction.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this transaction'
            });
        }

        const allowedFields = ['description', 'category'];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: updatedTransaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating transaction'
        });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        await transactionService.deleteTransaction({
            userId: req.user._id,
            transactionId: req.params.id
        });

        res.status(200).json({
            success: true,
            data: {},
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        return sendServiceError(res, error, 'Server error deleting transaction');
    }
};

const getTransactionStats = async (req, res) => {
    try {
        const period = req.query.period || 'month';
        const stats = await Transaction.getTransactionStats(req.user._id, period);

        res.status(200).json({
            success: true,
            data: stats[0] || {
                totalCredits: 0,
                totalDebits: 0,
                transactionCount: 0,
                categories: []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting transaction statistics'
        });
    }
};

const getTransactionCategories = async (req, res) => {
    try {
        const categories = [
            'deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping',
            'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary',
            'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'
        ];

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting categories'
        });
    }
};

const validateTransferDetails = async (req, res) => {
    try {
        const result = await transferService.validateTransferDetails({
            userId: req.user._id,
            body: req.body
        });

        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('Transfer validation error:', error);
        return sendServiceError(res, error, 'Server error validating transfer');
    }
};

const transferMoney = async (req, res) => {
    try {
        const result = await transferService.transferMoney({
            userId: req.user._id,
            body: req.body
        });

        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('Transfer error:', error);
        return sendServiceError(res, error, 'Server error processing transfer');
    }
};

module.exports = {
    getTransactions,
    getUserTransactionsAdmin,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionStats,
    getTransactionCategories,
    validateTransferDetails,
    transferMoney
};
