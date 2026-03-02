const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailHelpers = require('../utils/emailHelpers');
const { createInAppNotification } = require('../utils/notifications');

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

const roundTwo = (v) => {
    if (typeof v !== 'number') v = Number(v) || 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
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

const findRecipientByAccountOrPhone = async (recipientAccount, recipientPhone) => {
    if (recipientAccount) {
        const recipient = await User.findOne({ accountNumber: recipientAccount });
        return { recipient, users: [] };
    }

    if (recipientPhone) {
        const users = await User.find({ phone: recipientPhone });
        if (users.length === 1) {
            return { recipient: users[0], users };
        }
        return { recipient: null, users };
    }

    return { recipient: null, users: [] };
};

const getTransferMeta = (recipient) => ({
    isInternalTransfer: !!recipient,
    transferType: recipient ? 'internal' : 'external'
});

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
    let session;
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

        const numericAmount = roundTwo(Number(amount));
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }
        const finalDescription = description && description.trim().length > 0 ? description.trim() : (type === 'credit' ? 'Credit transaction' : 'Debit transaction');
        const normalizedCategory = typeof category === 'string' ? category.trim() : '';
        const defaultCategory = type === 'credit' ? 'deposit' : type === 'debit' ? 'withdrawal' : 'transfer';
        const finalCategory = normalizedCategory || defaultCategory;

        session = await mongoose.startSession();
        let transaction;
        let user;

        await session.withTransaction(async () => {
            user = await User.findById(req.user._id).session(session);
            if (!user) {
                const err = new Error('User not found');
                err.statusCode = 404;
                throw err;
            }
            let newBalance = roundTwo(Number(user.balance));
            if (type === 'credit') {
                newBalance = roundTwo(newBalance + numericAmount);
            } else if (type === 'debit') {
                if (newBalance < numericAmount) {
                    const err = new Error('Insufficient balance');
                    err.statusCode = 400;
                    throw err;
                }
                newBalance = roundTwo(newBalance - numericAmount);
            }

            transaction = (await Transaction.create([{
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
            }], { session }))[0];

            await User.updateOne({ _id: req.user._id }, { balance: newBalance }, { session });

            if (type === 'transfer' && recipientId) {
                const recipient = await User.findById(recipientId).session(session);
                if (recipient) {
                    const recipientNewBalance = roundTwo(Number(recipient.balance) + numericAmount);

                    await Transaction.create([{
                        userId: recipientId,
                        type: 'credit',
                        amount: numericAmount,
                        balance: recipientNewBalance,
                        description: `Transfer from ${user.name}`,
                        category: 'transfer'
                    }], { session });

                    await User.updateOne({ _id: recipientId }, { balance: recipientNewBalance }, { session });
                }
            }
        });

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
            message: `Rs ${numericAmount.toLocaleString('en-IN')} ${type === 'credit' ? 'credited to' : 'debited from'} your account.`,
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

        let emailSent = false;
        if (user?.preferences?.notifications?.email !== false) {
            emailHelpers.sendTransactionNotification(user.email, transactionDetails)
                .then((sent) => { emailSent = !!sent; })
                .catch(() => { });
        }

        const transactionData = transaction.toObject();
        transactionData.delivery = {
            notificationCreated: !!createdNotification,
            emailSent
        };

        res.status(201).json({ success: true, data: transactionData });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Server error creating transaction'
        });
    } finally {
        if (session) {
            session.endSession();
        }
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

const deleteTransaction = async (req, res) => {
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
                error: 'Not authorized to delete this transaction'
            });
        }

        const balanceOwnerId = transaction.userId;
        const balanceOwner = await User.findById(balanceOwnerId);

        if (!balanceOwner) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let newBalance = Number(balanceOwner.balance) || 0;

        if (transaction.type === 'credit') {
            newBalance -= Number(transaction.amount) || 0;
        } else if (transaction.type === 'debit') {
            newBalance += Number(transaction.amount) || 0;
        }

        await User.findByIdAndUpdate(balanceOwnerId, { balance: roundTwo(newBalance) });

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
        const {
            recipientAccount,
            recipientPhone,
            recipientBank,
            amount,
            description
        } = req.body;

        const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);

        if (users.length > 1) {
            return res.status(300).json({
                success: false,
                error: 'Multiple accounts found',
                message: 'Multiple accounts found for this phone number. Please specify which account to transfer to.',
                accounts: users.map(u => ({
                    _id: u._id,
                    name: u.name,
                    accountNumber: u.accountNumber,
                    bankDetails: u.bankDetails
                })),
                needsAccountSelection: true
            });
        }
        const { isInternalTransfer, transferType } = getTransferMeta(recipient);

        if (recipient && recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot transfer to your own account'
            });
        }

        const sender = await User.findById(req.user._id);

        const amt = roundTwo(Number(amount));
        const processingFee = 0;
        const totalDebit = roundTwo(amt + processingFee);

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

const transferMoney = async (req, res) => {
    let session;
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
        const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);
        if (users.length > 1) {
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
        const { isInternalTransfer, transferType } = getTransferMeta(recipient);

        if (!isInternalTransfer) {

            if (!recipientBank || !recipientBank.bankName) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient bank details are required for external transfers'
                });
            }

            if (!recipientAccount && !recipientPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient account number or phone number is required for external transfers'
                });
            }
        }

        if (recipient && recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot transfer to your own account'
            });
        }

        const amt = roundTwo(Number(amount));
        if (!Number.isFinite(amt) || amt <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }
        const processingFee = 0;
        const totalDebit = roundTwo(amt + processingFee);
        session = await mongoose.startSession();
        let sender;
        let senderTransaction;
        let recipientEmail = null;
        let recipientTransactionId = null;
        let recipientTransactionCreatedAt = null;

        await session.withTransaction(async () => {
            sender = await User.findById(req.user._id).session(session);
            if (!sender) {
                const err = new Error('Sender not found');
                err.statusCode = 404;
                throw err;
            }

            if (sender.balance < amt) {
                const err = new Error('Insufficient balance');
                err.statusCode = 400;
                throw err;
            }

            if (sender.balance < totalDebit) {
                const err = new Error('Insufficient balance including processing fee');
                err.statusCode = 400;
                throw err;
            }

            const senderNewBalance = roundTwo(Number(sender.balance) - totalDebit);
            sender.balance = senderNewBalance;
            await sender.save({ validateBeforeSave: false, session });

            senderTransaction = (await Transaction.create([{
                userId: req.user._id,
                type: 'debit',
                transferType,
                amount: isInternalTransfer ? amt : totalDebit,
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
            }], { session }))[0];

            if (isInternalTransfer && recipient) {
                const recipientInTx = await User.findById(recipient._id).session(session);
                if (!recipientInTx) {
                    const err = new Error('Recipient not found');
                    err.statusCode = 404;
                    throw err;
                }
                const recipientNewBalance = roundTwo(Number(recipientInTx.balance) + amt);

                const recipientTransaction = (await Transaction.create([{
                    userId: recipientInTx._id,
                    type: 'credit',
                    transferType: 'internal',
                    amount: amt,
                    balance: recipientNewBalance,
                    description: `Transfer from ${sender.name}`,
                    category: 'transfer',
                    recipientId: req.user._id,
                    recipientAccount: sender.accountNumber,
                    recipientName: sender.name
                }], { session }))[0];

                recipientInTx.balance = recipientNewBalance;
                await recipientInTx.save({ validateBeforeSave: false, session });
                recipientEmail = recipientInTx.email;
                recipientTransactionId = recipientTransaction._id;
                recipientTransactionCreatedAt = recipientTransaction.createdAt;
            }
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
        let senderEmailSent = false;
        if (sender?.preferences?.notifications?.email !== false) {
            emailHelpers.sendTransactionNotification(sender.email, {
                type: 'debit',
                amount: amt,
                currency: 'INR',
                description: senderTransaction.description,
                timestamp: senderTransaction.createdAt
            }).then((sent) => { senderEmailSent = !!sent; }).catch(() => { });
        }


        let recipientNotificationCreated = false;
        let recipientEmailSent = false;

        if (isInternalTransfer && recipient) {
            const recipientNotification = await createInAppNotification({
                userId: recipient._id,
                type: 'transaction',
                title: 'Money Received',
                message: `Rs${amt.toLocaleString('en-IN')} received from ${sender.name}.`,
                relatedId: recipientTransactionId || senderTransaction._id,
                relatedModel: 'Transaction',
                metadata: {
                    amount: amt,
                    category: 'transfer'
                }
            });
            recipientNotificationCreated = !!recipientNotification;

            if (recipientEmail) {
                emailHelpers.sendTransactionNotification(recipientEmail, {
                    type: 'credit',
                    amount: amt,
                    currency: 'INR',
                    description: `Transfer from ${sender.name}`,
                    timestamp: recipientTransactionCreatedAt || new Date()
                }).then((sent) => { recipientEmailSent = !!sent; }).catch(() => { });
            }
        }

        let message = `Successfully transferred Rs${amt.toLocaleString('en-IN')} to ${recipient ? recipient.name : recipientAccount}`;
        if (!isInternalTransfer) {
            message += ` (${recipientBank ? recipientBank.bankName : 'External Bank'})`;
            if (processingFee > 0) {
                message += `. Processing fee: Rs${processingFee.toLocaleString('en-IN')} (Total debited: Rs${totalDebit.toLocaleString('en-IN')})`;
            }
        }

        message += `\nNote: A processing fee of Rs${processingFee.toLocaleString('en-IN')} was deducted. Total debited from your account: Rs${totalDebit.toLocaleString('en-IN')}.`;

        res.status(201).json({
            success: true,
            data: {
                transaction: senderTransaction,
                message,
                transferType,
                transferAmount: amt,
                processingFee: isInternalTransfer ? 0 : processingFee,
                totalDebited: isInternalTransfer ? amt : totalDebit,
                delivery: {
                    sender: {
                        notificationCreated: !!senderNotification,
                        emailSent: senderEmailSent
                    },
                    recipient: {
                        notificationCreated: recipientNotificationCreated,
                        emailSent: recipientEmailSent
                    }
                }
            }
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }
        console.error('Transfer error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error processing transfer'
        });
    } finally {
        if (session) {
            session.endSession();
        }
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
