const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');
const { createInAppNotification } = require('../utils/notifications');

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

// Helper to avoid floating point precision issues: round to 2 decimals (paise)
const roundTwo = (v) => {
    if (typeof v !== 'number') v = Number(v) || 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
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
    console.log('[Transaction Controller] Creating transaction for user:', req.user._id);
    try {
        const {
            type,
            amount,
            description,
            category,
            recipientId,
            recipientAccount,
            recipientName,
            clientRequestId
        } = req.body;

        if (clientRequestId) {
            const existingTransaction = await Transaction.findOne({
                userId: req.user._id,
                clientRequestId
            });
            if (existingTransaction) {
                return res.status(200).json({ success: true, data: existingTransaction, duplicateIgnored: true });
            }
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const numericAmount = roundTwo(Number(amount));
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }
        let newBalance = roundTwo(Number(user.balance));

        if (type === 'credit') {
            newBalance = roundTwo(newBalance + numericAmount);
        } else if (type === 'debit') {
            if (newBalance < numericAmount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient balance'
                });
            }
            newBalance = roundTwo(newBalance - numericAmount);
        }

        const finalDescription = description && description.trim().length > 0 ? description.trim() : (type === 'credit' ? 'Credit transaction' : 'Debit transaction');
        const normalizedCategory = typeof category === 'string' ? category.trim() : '';
        const defaultCategory = type === 'credit' ? 'deposit' : type === 'debit' ? 'withdrawal' : 'transfer';
        const finalCategory = normalizedCategory || defaultCategory;

        const transaction = await Transaction.create({
            userId: req.user._id,
            type,
            amount: numericAmount,
            balance: newBalance,
            description: finalDescription,
            category: finalCategory,
            clientRequestId,
            recipientId,
            recipientAccount,
            recipientName
        });
        console.log('[Transaction Controller] Transaction created:', transaction);

        await User.findByIdAndUpdate(req.user._id, { balance: newBalance });

        const transactionDetails = {
            type: type,
            amount: numericAmount,
            currency: 'INR',
            description: finalDescription,
            timestamp: transaction.createdAt
        };

        const createdNotification = await createInAppNotification({
            userId: req.user._id,
            type: 'transaction',
            title: type === 'credit' ? 'Deposit Successful' : 'Withdrawal Successful',
            message: `Rs${numericAmount.toLocaleString('en-IN')} ${type === 'credit' ? 'credited to' : 'debited from'} your account.`,
            relatedId: transaction._id,
            relatedModel: 'Transaction',
            metadata: {
                amount: numericAmount,
                category: finalCategory
            }
        });
        if (!createdNotification) {
            console.warn('In-app notification was not created for transaction:', transaction._id.toString());
        }

        if (user?.preferences?.notifications?.email !== false) {
            await emailHelpers.sendTransactionNotification(user.email, transactionDetails);
        }

        if (type === 'transfer' && recipientId) {
            const recipient = await User.findById(recipientId);
            if (recipient) {
                const recipientNewBalance = roundTwo(Number(recipient.balance) + numericAmount);

                await Transaction.create({
                    userId: recipientId,
                    type: 'credit',
                    amount: numericAmount,
                    balance: recipientNewBalance,
                    description: `Transfer from ${user.name}`,
                    category: 'transfer'
                });

                await User.findByIdAndUpdate(recipientId, { balance: recipientNewBalance });

                const recipientTransactionDetails = {
                    type: 'credit',
                    amount: numericAmount,
                    currency: 'INR',
                    description: `Transfer from ${user.name}`,
                    timestamp: new Date()
                };

                if (recipient?.preferences?.notifications?.email !== false) {
                    await emailHelpers.sendTransactionNotification(recipient.email, recipientTransactionDetails);
                }
            }
        }

        try {
            const rawDoc = await mongoose.connection.db.collection('transactions').findOne({ _id: transaction._id });
            const count = await mongoose.connection.db.collection('transactions').countDocuments();
            console.log('[Raw Collection] findOne result:', rawDoc);
            console.log('[Raw Collection] countDocuments:', count);
            if (!rawDoc) {
                console.error('Transaction not found in raw collection after create:', transaction._id);
                return res.status(500).json({ success: false, error: 'Transaction not persisted to raw collection' });
            }
        } catch (rawErr) {
            console.error('Error checking raw collection:', rawErr);
        }

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        console.error('Error creating transaction:', error);
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

        // Calculate fees (use rounded amount to avoid floating precision issues)
        const amt = roundTwo(Number(amount));
        // No processing fee for any transfers (internal or external)
        const processingFee = 0;
        const totalDebit = roundTwo(amt + processingFee);

        // Check if sender has sufficient balance
        const hasSufficientBalance = sender.balance >= totalDebit;

        const preview = {
            transferAmount: amt,
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
                ? `Transfer preview: Rs${amt.toLocaleString('en-IN')} transfer${processingFee > 0 ? ` + Rs${processingFee.toLocaleString('en-IN')} fee = Rs${totalDebit.toLocaleString('en-IN')} total` : ''}`
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
            description,
            clientRequestId
        } = req.body;

        if (clientRequestId) {
            const existingTransfer = await Transaction.findOne({
                userId: req.user._id,
                clientRequestId,
                category: 'transfer'
            });
            if (existingTransfer) {
                return res.status(200).json({
                    success: true,
                    data: {
                        transaction: existingTransfer,
                        message: 'Transfer already processed.',
                        transferType: existingTransfer.transferType || 'internal',
                        transferAmount: existingTransfer.amount,
                        processingFee: 0,
                        totalDebited: existingTransfer.amount
                    },
                    duplicateIgnored: true
                });
            }
        }
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
            if (!recipientBank || !recipientBank.bankName) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient bank details are required for external transfers'
                });
            }

            // Only require recipientAccount if not transferring by phone number
            if (!recipientAccount && !recipientPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient account number or phone number is required for external transfers'
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

        // Check sender balance (use rounded amount)
        const sender = await User.findById(req.user._id);
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'Sender not found'
            });
        }
        const amt = roundTwo(Number(amount));
        if (sender.balance < amt) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }

        // For external transfers, add processing fee (rounded)
        // No processing fee for any transfers
        const processingFee = 0;
        const totalDebit = roundTwo(amt + processingFee);

        if (sender.balance < totalDebit) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance including processing fee'
            });
        }

        // Calculate new balance (rounded)
        const senderNewBalance = roundTwo(Number(sender.balance) - totalDebit);

        // Update sender balance FIRST before creating transactions
        sender.balance = senderNewBalance;
        await sender.save({ validateBeforeSave: false });

        // Sender transaction - record the actual transfer amount, not total debit
        const senderTransaction = await Transaction.create({
            userId: req.user._id,
            type: 'debit',
            transferType,
            amount: isInternalTransfer ? amt : totalDebit, // For external, include fee in amount
            balance: senderNewBalance,
            clientRequestId,
            description: isInternalTransfer
                ? (description || `Transfer to ${recipient ? recipient.name : recipientAccount}`)
                : `${description || `Transfer to ${recipient ? recipient.name : recipientAccount}`} (includes processing fee Rs${processingFee.toLocaleString('en-IN')})`,
            category: 'transfer',
            recipientId: recipient ? recipient._id : null,
            recipientAccount,
            recipientName: recipient ? recipient.name : (req.body.recipientName || 'External Account'),
            recipientBank: recipientBank || null
        });

        const senderNotification = await createInAppNotification({
            userId: req.user._id,
            type: 'transaction',
            title: 'Transfer Sent',
            message: `Rs${amt.toLocaleString('en-IN')} transferred ${recipient ? `to ${recipient.name}` : 'to external account'}.`,
            relatedId: senderTransaction._id,
            relatedModel: 'Transaction',
            metadata: {
                amount: amt,
                category: 'transfer'
            }
        });
        if (!senderNotification) {
            console.warn('In-app notification was not created for transfer sender transaction:', senderTransaction._id.toString());
        }

        if (sender?.preferences?.notifications?.email !== false) {
            await emailHelpers.sendTransactionNotification(sender.email, {
                type: 'debit',
                amount: amt,
                currency: 'INR',
                description: senderTransaction.description,
                timestamp: senderTransaction.createdAt
            });
        }

        // No separate fee transaction; fee is included in main debit transaction

        // For internal transfers, create corresponding credit transaction for recipient
        if (isInternalTransfer && recipient) {
            const recipientNewBalance = roundTwo(Number(recipient.balance) + amt);

            const recipientTransaction = await Transaction.create({
                userId: recipient._id,
                type: 'credit',
                transferType: 'internal',
                amount: amt,
                balance: recipientNewBalance,
                description: `Transfer from ${sender.name}`,
                category: 'transfer',
                recipientId: req.user._id, // Reference back to sender
                recipientAccount: sender.accountNumber,
                recipientName: sender.name
            });

            const recipientNotification = await createInAppNotification({
                userId: recipient._id,
                type: 'transaction',
                title: 'Money Received',
                message: `Rs${amt.toLocaleString('en-IN')} received from ${sender.name}.`,
                relatedId: recipientTransaction._id,
                relatedModel: 'Transaction',
                metadata: {
                    amount: amt,
                    category: 'transfer'
                }
            });
            if (!recipientNotification) {
                console.warn('In-app notification was not created for transfer recipient transaction:', recipientTransaction._id.toString());
            }

            if (recipient?.preferences?.notifications?.email !== false) {
                await emailHelpers.sendTransactionNotification(recipient.email, {
                    type: 'credit',
                    amount: amt,
                    currency: 'INR',
                    description: recipientTransaction.description,
                    timestamp: recipientTransaction.createdAt
                });
            }

            // Update recipient balance
            recipient.balance = recipientNewBalance;
            await recipient.save({ validateBeforeSave: false });
        }

        let message = `Successfully transferred Rs${amt.toLocaleString('en-IN')} to ${recipient ? recipient.name : recipientAccount}`;
        if (!isInternalTransfer) {
            message += ` (${recipientBank ? recipientBank.bankName : 'External Bank'})`;
            if (processingFee > 0) {
                message += `. Processing fee: Rs${processingFee.toLocaleString('en-IN')} (Total debited: Rs${totalDebit.toLocaleString('en-IN')})`;
            }
        }

        // Always inform user about fee and total debit
        message += `\nNote: A processing fee of Rs${processingFee.toLocaleString('en-IN')} was deducted. Total debited from your account: Rs${totalDebit.toLocaleString('en-IN')}.`;

        res.status(201).json({
            success: true,
            data: {
                transaction: senderTransaction,
                message,
                transferType,
                transferAmount: amt,
                processingFee: isInternalTransfer ? 0 : processingFee,
                totalDebited: isInternalTransfer ? amt : totalDebit
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
