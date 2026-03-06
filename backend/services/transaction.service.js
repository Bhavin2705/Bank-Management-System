const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const notificationService = require('./notification.service');
const { roundTwo } = require('../helpers/transaction.helpers');
const { createServiceError } = require('./service-error');
const useDbTransactions = String(process.env.ENABLE_DB_TRANSACTIONS || 'true').toLowerCase() === 'true';
const isTransactionUnsupportedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('transaction numbers are only allowed on a replica set member or mongos')
        || message.includes('replicaset')
        || message.includes('not supported')
        || message.includes('standalone');
};

const createTransaction = async ({ userId, body }) => {
    const {
        type,
        amount,
        description,
        category,
        recipientId,
        recipientAccount,
        recipientName,
        clientRequestId
    } = body;

    if (clientRequestId) {
        const existingTransaction = await Transaction.findOne({ userId, clientRequestId });
        if (existingTransaction) {
            return { existingTransaction, duplicateIgnored: true };
        }
    }

    const numericAmount = roundTwo(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw createServiceError('Invalid amount', 400);
    }

    const finalDescription = description && description.trim().length > 0
        ? description.trim()
        : (type === 'credit' ? 'Credit transaction' : 'Debit transaction');
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    const defaultCategory = type === 'credit' ? 'deposit' : type === 'debit' ? 'withdrawal' : 'transfer';
    const finalCategory = normalizedCategory || defaultCategory;

    let session;
    try {
        let transaction;
        let user;

        const createWithoutSession = async () => {
            user = await User.findById(userId);
            if (!user) {
                throw createServiceError('User not found', 404);
            }

            let newBalance = roundTwo(Number(user.balance));
            if (type === 'credit') {
                newBalance = roundTwo(newBalance + numericAmount);
            } else if (type === 'debit') {
                if (newBalance < numericAmount) {
                    throw createServiceError('Insufficient balance', 400);
                }
                newBalance = roundTwo(newBalance - numericAmount);
            }

            transaction = await Transaction.create({
                userId,
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

            await User.updateOne({ _id: userId }, { balance: newBalance });

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

                    await User.updateOne({ _id: recipientId }, { balance: recipientNewBalance });
                }
            }
        };

        if (useDbTransactions) {
            try {
                session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    user = await User.findById(userId).session(session);
                    if (!user) {
                        throw createServiceError('User not found', 404);
                    }

                    let newBalance = roundTwo(Number(user.balance));
                    if (type === 'credit') {
                        newBalance = roundTwo(newBalance + numericAmount);
                    } else if (type === 'debit') {
                        if (newBalance < numericAmount) {
                            throw createServiceError('Insufficient balance', 400);
                        }
                        newBalance = roundTwo(newBalance - numericAmount);
                    }

                    transaction = (await Transaction.create([{
                        userId,
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

                    await User.updateOne({ _id: userId }, { balance: newBalance }, { session });

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
            } catch (transactionError) {
                if (isTransactionUnsupportedError(transactionError)) {
                    await createWithoutSession();
                } else {
                    throw transactionError;
                }
            }
        } else {
            await createWithoutSession();
        }

        const createdNotification = await notificationService.createNotification({
            userId,
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

        const emailSent = notificationService.sendTransactionEmailIfEnabled({
            user,
            details: {
                type,
                amount: numericAmount,
                currency: 'INR',
                description: finalDescription,
                timestamp: transaction.createdAt
            }
        });

        const transactionData = transaction.toObject();
        transactionData.delivery = {
            notificationCreated: !!createdNotification,
            emailSent
        };

        return { transactionData, duplicateIgnored: false };
    } finally {
        if (session) session.endSession();
    }
};

const deleteTransaction = async ({ userId, transactionId }) => {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
        throw createServiceError('Transaction not found', 404);
    }

    if (transaction.userId.toString() !== userId.toString()) {
        throw createServiceError('Not authorized to delete this transaction', 403);
    }

    const balanceOwner = await User.findById(transaction.userId);
    if (!balanceOwner) {
        throw createServiceError('User not found', 404);
    }

    let newBalance = Number(balanceOwner.balance) || 0;

    if (transaction.type === 'credit') {
        newBalance -= Number(transaction.amount) || 0;
    } else if (transaction.type === 'debit') {
        newBalance += Number(transaction.amount) || 0;
    }

    await User.findByIdAndUpdate(transaction.userId, { balance: roundTwo(newBalance) });
    await Transaction.findByIdAndDelete(transactionId);
};

module.exports = {
    createTransaction,
    deleteTransaction,
    createServiceError
};
