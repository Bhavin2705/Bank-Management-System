const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { getBankById, validateIFSC } = require('../utils/banks');

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
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

        // Get total count for pagination
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

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
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

        // Check if user owns this transaction or is admin
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

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
    try {
        const { type, amount, description, category, recipientId, recipientAccount, recipientName } = req.body;

        // Get current user balance
        const user = await User.findById(req.user._id);
        let newBalance = user.balance;

        // Calculate new balance
        if (type === 'credit') {
            newBalance += amount;
        } else if (type === 'debit') {
            if (user.balance < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient balance'
                });
            }
            newBalance -= amount;
        }

        // Create transaction
        const transaction = await Transaction.create({
            userId: req.user._id,
            type,
            amount,
            balance: newBalance,
            description,
            category: category || 'other',
            recipientId,
            recipientAccount,
            recipientName
        });

        // Update user balance
        await User.findByIdAndUpdate(req.user._id, { balance: newBalance });

        // If this is a transfer, create corresponding transaction for recipient
        if (type === 'transfer' && recipientId) {
            const recipient = await User.findById(recipientId);
            if (recipient) {
                const recipientNewBalance = recipient.balance + amount;

                await Transaction.create({
                    userId: recipientId,
                    type: 'credit',
                    amount,
                    balance: recipientNewBalance,
                    description: `Transfer from ${user.name}`,
                    category: 'transfer'
                });

                await User.findByIdAndUpdate(recipientId, { balance: recipientNewBalance });
            }
        }

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error creating transaction'
        });
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Check if user owns this transaction or is admin
        if (transaction.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this transaction'
            });
        }

        // Only allow updating certain fields
        const allowedFields = ['description', 'category'];
        const updates = {};

        allowedFields.forEach(field => {
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

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Check if user owns this transaction or is admin
        if (transaction.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this transaction'
            });
        }

        // Reverse the transaction effect on balance
        const user = await User.findById(req.user._id);
        let newBalance = user.balance;

        if (transaction.type === 'credit') {
            newBalance -= transaction.amount;
        } else if (transaction.type === 'debit') {
            newBalance += transaction.amount;
        }

        // Update user balance
        await User.findByIdAndUpdate(req.user._id, { balance: newBalance });

        // Delete transaction
        await Transaction.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {},
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error deleting transaction'
        });
    }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
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

// @desc    Get transaction categories
// @route   GET /api/transactions/categories
// @access  Private
const getTransactionCategories = async (req, res) => {
    try {
        const categories = [
            'deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping',
            'food', 'transport', 'entertainment', 'utilities', 'salary',
            'investment', 'loan', 'fee', 'interest', 'other'
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

// @desc    Validate/Preview transfer details
// @route   POST /api/transactions/validate-transfer
// @access  Private
const validateTransferDetails = async (req, res) => {
    try {
        const {
            recipientAccount,
            recipientPhone,
            recipientBank,
            amount,
            description
        } = req.body;

        // First, try to find recipient in our system
        let recipient = null;
        let multipleAccounts = false;
        let availableAccounts = [];

        if (recipientAccount) {
            recipient = await User.findOne({ accountNumber: recipientAccount });
        } else if (recipientPhone) {
            const users = await User.find({ phone: recipientPhone });
            if (users.length === 1) {
                recipient = users[0];
            } else if (users.length > 1) {
                multipleAccounts = true;
                availableAccounts = users.map(u => ({
                    _id: u._id,
                    name: u.name,
                    accountNumber: u.accountNumber,
                    bankDetails: u.bankDetails
                }));

                return res.status(300).json({
                    success: false,
                    error: 'Multiple accounts found',
                    message: 'Multiple accounts found for this phone number. Please specify which account to transfer to.',
                    accounts: availableAccounts,
                    needsAccountSelection: true
                });
            }
        }

        // Determine transfer type
        let isInternalTransfer = false;
        let transferType = 'external';

        if (recipient) {
            isInternalTransfer = true;
            transferType = 'internal';
        } else {
            isInternalTransfer = false;
            transferType = 'external';
        }

        // Check if sender is trying to transfer to themselves
        if (recipient && recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot transfer to your own account'
            });
        }

        // Get sender balance
        const sender = await User.findById(req.user._id);

        // Calculate fees
        const processingFee = isInternalTransfer ? 0 : Math.max(10, amount * 0.005);
        const totalDebit = amount + processingFee;

        // Check if sender has sufficient balance
        const hasSufficientBalance = sender.balance >= totalDebit;

        const preview = {
            transferAmount: amount,
            processingFee,
            totalDebit,
            transferType,
            recipientFound: !!recipient,
            recipientName: recipient ? recipient.name : 'External Account',
            recipientBank: recipient ? recipient.bankDetails : recipientBank,
            senderBalance: sender.balance,
            hasSufficientBalance,
            estimatedArrival: isInternalTransfer ? 'Instant' : '2-3 business days'
        };

        res.status(200).json({
            success: true,
            data: preview,
            message: hasSufficientBalance
                ? `Transfer preview: ₹${amount.toLocaleString('en-IN')} transfer${processingFee > 0 ? ` + ₹${processingFee.toLocaleString('en-IN')} fee = ₹${totalDebit.toLocaleString('en-IN')} total` : ''}`
                : 'Insufficient balance for this transfer'
        });
    } catch (error) {
        console.error('Transfer validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error validating transfer'
        });
    }
};

// @desc    Transfer money between users
// @route   POST /api/transactions/transfer
// @access  Private
const transferMoney = async (req, res) => {
    try {
        const {
            recipientAccount,
            recipientPhone,
            recipientBank,
            amount,
            description
        } = req.body;
        let recipient = null;
        if (recipientAccount) {
            recipient = await User.findOne({ accountNumber: recipientAccount });
        } else if (recipientPhone) {
            const users = await User.find({ phone: recipientPhone });
            if (users.length === 1) {
                recipient = users[0];
            } else if (users.length > 1) {
                return res.status(300).json({
                    success: false,
                    error: 'Multiple accounts found',
                    message: 'Multiple accounts found for this phone number. Please specify account number instead.',
                    accounts: users.map(u => ({
                        _id: u._id,
                        name: u.name,
                        accountNumber: u.accountNumber,
                        bankDetails: u.bankDetails
                    })),
                    needsAccountSelection: true
                });
            }
        }

        // Determine transfer type based on whether recipient exists and their bank
        let isInternalTransfer = false;
        let transferType = 'external';

        if (recipient) {
            // Recipient exists in our system - always treat as internal transfer
            isInternalTransfer = true;
            transferType = 'internal';
        } else {
            // Recipient doesn't exist in our system - truly external
            isInternalTransfer = false;
            transferType = 'external';

            // Validate external transfer requirements
            if (!recipientBank || !recipientBank.ifscCode || !recipientBank.bankName) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient bank details are required for external transfers'
                });
            }

            if (!recipientAccount) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient account number is required for external transfers'
                });
            }
        }

        // Check if sender is trying to transfer to themselves
        if (recipient && recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot transfer to your own account'
            });
        }

        // Check sender balance
        const sender = await User.findById(req.user._id);
        if (sender.balance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }

        // For external transfers, add processing fee
        const processingFee = isInternalTransfer ? 0 : Math.max(10, amount * 0.005); // ₹10 or 0.5% whichever is higher
        const totalDebit = amount + processingFee;

        if (sender.balance < totalDebit) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance including processing fee'
            });
        }

        // Create transactions
        const senderNewBalance = sender.balance - totalDebit;

        // Sender transaction - record the actual transfer amount, not total debit
        const senderTransaction = await Transaction.create({
            userId: req.user._id,
            type: 'debit',
            transferType,
            amount: amount, // Record the actual transfer amount
            balance: senderNewBalance,
            description: description || `Transfer to ${recipient ? recipient.name : recipientAccount}`,
            category: 'transfer',
            recipientId: recipient ? recipient._id : null,
            recipientAccount,
            recipientName: recipient ? recipient.name : (req.body.recipientName || 'External Account'),
            recipientBank: recipientBank || null
        });

        // For internal transfers (recipient exists in our system), create corresponding credit transaction
        if (isInternalTransfer && recipient) {
            const recipientNewBalance = recipient.balance + amount;

            await Transaction.create({
                userId: recipient._id,
                type: 'credit',
                transferType: transferType,
                amount,
                balance: recipientNewBalance,
                description: `Transfer from ${sender.name}`,
                category: 'transfer'
            });

            await User.findByIdAndUpdate(recipient._id, { balance: recipientNewBalance });
        }

        // For external transfers, create a separate fee transaction
        if (!isInternalTransfer && processingFee > 0) {
            await Transaction.create({
                userId: req.user._id,
                type: 'debit',
                transferType: 'fee',
                amount: processingFee,
                balance: senderNewBalance, // Balance remains the same since fee is already deducted
                description: `Processing fee for transfer to ${recipientAccount}`,
                category: 'fee'
            });
        }

        // Update sender balance
        await User.findByIdAndUpdate(req.user._id, { balance: senderNewBalance });

        let message = `Successfully transferred ₹${amount.toLocaleString('en-IN')} to ${recipient ? recipient.name : recipientAccount}`;
        if (!isInternalTransfer) {
            message += ` (${recipientBank ? recipientBank.bankName : 'External Bank'})`;
            if (processingFee > 0) {
                message += `. Processing fee: ₹${processingFee.toLocaleString('en-IN')} (Total debited: ₹${totalDebit.toLocaleString('en-IN')})`;
            }
        }

        res.status(201).json({
            success: true,
            data: {
                transaction: senderTransaction,
                message,
                transferType,
                transferAmount: amount,
                processingFee: isInternalTransfer ? 0 : processingFee,
                totalDebited: isInternalTransfer ? amount : totalDebit
            }
        });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error processing transfer'
        });
    }
};

module.exports = {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionStats,
    getTransactionCategories,
    validateTransferDetails,
    transferMoney
};
