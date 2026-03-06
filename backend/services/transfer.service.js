const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const notificationService = require('./notification.service');
const {
    roundTwo,
    findRecipientByAccountOrPhone,
    getTransferMeta
} = require('../helpers/transaction.helpers');
const { createServiceError } = require('./service-error');
const useDbTransactions = String(process.env.ENABLE_DB_TRANSACTIONS || 'true').toLowerCase() === 'true';
const isTransactionUnsupportedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('transaction numbers are only allowed on a replica set member or mongos')
        || message.includes('replicaset')
        || message.includes('not supported')
        || message.includes('standalone');
};

const validateTransferDetails = async ({ userId, body }) => {
    const {
        recipientAccount,
        recipientPhone,
        recipientBank,
        amount
    } = body;

    const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);

    if (users.length > 1) {
        return {
            statusCode: 300,
            body: {
                success: false,
                error: 'Multiple accounts found',
                message: 'Multiple accounts found for this phone number. Please specify which account to transfer to.',
                accounts: users.map((u) => ({
                    _id: u._id,
                    name: u.name,
                    accountNumber: u.accountNumber,
                    bankDetails: u.bankDetails
                })),
                needsAccountSelection: true
            }
        };
    }

    const { isInternalTransfer, transferType } = getTransferMeta(recipient);

    if (recipient && recipient._id.toString() === userId.toString()) {
        throw createServiceError('Cannot transfer to your own account', 400);
    }

    const sender = await User.findById(userId);
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

    return {
        statusCode: 200,
        body: {
            success: true,
            data: preview,
            message: hasSufficientBalance
                ? `Transfer preview: Rs ${amt.toLocaleString('en-IN')} transfer${processingFee > 0 ? ` + Rs ${processingFee.toLocaleString('en-IN')} fee = Rs ${totalDebit.toLocaleString('en-IN')} total` : ''}`
                : 'Insufficient balance for this transfer'
        }
    };
};

const transferMoney = async ({ userId, body }) => {
    const {
        recipientAccount,
        recipientPhone,
        recipientBank,
        amount,
        description,
        clientRequestId
    } = body;

    if (clientRequestId) {
        const existingTransfer = await Transaction.findOne({
            userId,
            clientRequestId,
            category: 'transfer'
        });

        if (existingTransfer) {
            return {
                statusCode: 200,
                body: {
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
                }
            };
        }
    }

    const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);
    if (users.length > 1) {
        return {
            statusCode: 300,
            body: {
                success: false,
                error: 'Multiple accounts found',
                message: 'Multiple accounts found for this phone number. Please specify account number instead.',
                accounts: users.map((u) => ({
                    _id: u._id,
                    name: u.name,
                    accountNumber: u.accountNumber,
                    bankDetails: u.bankDetails
                })),
                needsAccountSelection: true
            }
        };
    }

    const { isInternalTransfer, transferType } = getTransferMeta(recipient);

    if (!isInternalTransfer) {
        if (!recipientBank || !recipientBank.bankName) {
            throw createServiceError('Recipient bank details are required for external transfers', 400);
        }

        if (!recipientAccount && !recipientPhone) {
            throw createServiceError('Recipient account number or phone number is required for external transfers', 400);
        }
    }

    if (recipient && recipient._id.toString() === userId.toString()) {
        throw createServiceError('Cannot transfer to your own account', 400);
    }

    const amt = roundTwo(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) {
        throw createServiceError('Invalid amount', 400);
    }

    const processingFee = 0;
    const totalDebit = roundTwo(amt + processingFee);

    let sender;
    let senderTransaction;
    let recipientEmail = null;
    let recipientTransactionId = null;
    let recipientTransactionCreatedAt = null;
    let session;

    try {
        const executeTransferWithoutSession = async () => {
            sender = await User.findById(userId);
            if (!sender) {
                throw createServiceError('Sender not found', 404);
            }

            if (sender.balance < amt) {
                throw createServiceError('Insufficient balance', 400);
            }

            if (sender.balance < totalDebit) {
                throw createServiceError('Insufficient balance including processing fee', 400);
            }

            const senderNewBalance = roundTwo(Number(sender.balance) - totalDebit);
            sender.balance = senderNewBalance;
            await sender.save({ validateBeforeSave: false });

            senderTransaction = await Transaction.create({
                userId,
                type: 'debit',
                transferType,
                amount: isInternalTransfer ? amt : totalDebit,
                balance: senderNewBalance,
                clientRequestId,
                description: isInternalTransfer
                    ? (description || `Transfer to ${recipient ? recipient.name : recipientAccount}`)
                    : `${description || `Transfer to ${recipient ? recipient.name : recipientAccount}`} (includes processing fee Rs ${processingFee.toLocaleString('en-IN')})`,
                category: 'transfer',
                recipientId: recipient ? recipient._id : null,
                recipientAccount,
                recipientName: recipient ? recipient.name : (body.recipientName || 'External Account'),
                recipientBank: recipientBank || null
            });

            if (isInternalTransfer && recipient) {
                const recipientInTx = await User.findById(recipient._id);
                if (!recipientInTx) {
                    throw createServiceError('Recipient not found', 404);
                }

                const recipientNewBalance = roundTwo(Number(recipientInTx.balance) + amt);
                const recipientTransaction = await Transaction.create({
                    userId: recipientInTx._id,
                    type: 'credit',
                    transferType: 'internal',
                    amount: amt,
                    balance: recipientNewBalance,
                    description: `Transfer from ${sender.name}`,
                    category: 'transfer',
                    recipientId: userId,
                    recipientAccount: sender.accountNumber,
                    recipientName: sender.name
                });

                recipientInTx.balance = recipientNewBalance;
                await recipientInTx.save({ validateBeforeSave: false });
                recipientEmail = recipientInTx.email;
                recipientTransactionId = recipientTransaction._id;
                recipientTransactionCreatedAt = recipientTransaction.createdAt;
            }
        };

        if (useDbTransactions) {
            try {
                session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    sender = await User.findById(userId).session(session);
                    if (!sender) {
                        throw createServiceError('Sender not found', 404);
                    }

                    if (sender.balance < amt) {
                        throw createServiceError('Insufficient balance', 400);
                    }

                    if (sender.balance < totalDebit) {
                        throw createServiceError('Insufficient balance including processing fee', 400);
                    }

                    const senderNewBalance = roundTwo(Number(sender.balance) - totalDebit);
                    sender.balance = senderNewBalance;
                    await sender.save({ validateBeforeSave: false, session });

                    senderTransaction = (await Transaction.create([{
                        userId,
                        type: 'debit',
                        transferType,
                        amount: isInternalTransfer ? amt : totalDebit,
                        balance: senderNewBalance,
                        clientRequestId,
                        description: isInternalTransfer
                            ? (description || `Transfer to ${recipient ? recipient.name : recipientAccount}`)
                            : `${description || `Transfer to ${recipient ? recipient.name : recipientAccount}`} (includes processing fee Rs ${processingFee.toLocaleString('en-IN')})`,
                        category: 'transfer',
                        recipientId: recipient ? recipient._id : null,
                        recipientAccount,
                        recipientName: recipient ? recipient.name : (body.recipientName || 'External Account'),
                        recipientBank: recipientBank || null
                    }], { session }))[0];

                    if (isInternalTransfer && recipient) {
                        const recipientInTx = await User.findById(recipient._id).session(session);
                        if (!recipientInTx) {
                            throw createServiceError('Recipient not found', 404);
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
                            recipientId: userId,
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
            } catch (transactionError) {
                if (isTransactionUnsupportedError(transactionError)) {
                    await executeTransferWithoutSession();
                } else {
                    throw transactionError;
                }
            }
        } else {
            await executeTransferWithoutSession();
        }
    } finally {
        if (session) session.endSession();
    }

    const senderNotificationCreated = await notificationService.createNotification({
        userId,
        type: 'transaction',
        title: 'Transfer Sent',
        message: `Rs ${amt.toLocaleString('en-IN')} transferred ${recipient ? `to ${recipient.name}` : 'to external account'}.`,
        relatedId: senderTransaction._id,
        relatedModel: 'Transaction',
        metadata: {
            amount: amt,
            category: 'transfer'
        }
    });

    const senderEmailSent = notificationService.sendTransactionEmailIfEnabled({
        user: sender,
        details: {
            type: 'debit',
            amount: amt,
            currency: 'INR',
            description: senderTransaction.description,
            timestamp: senderTransaction.createdAt
        }
    });

    let recipientNotificationCreated = false;
    let recipientEmailSent = false;

    if (isInternalTransfer && recipient) {
        recipientNotificationCreated = await notificationService.createNotification({
            userId: recipient._id,
            type: 'transaction',
            title: 'Money Received',
            message: `Rs ${amt.toLocaleString('en-IN')} received from ${sender.name}.`,
            relatedId: recipientTransactionId || senderTransaction._id,
            relatedModel: 'Transaction',
            metadata: {
                amount: amt,
                category: 'transfer'
            }
        });

        if (recipientEmail) {
            recipientEmailSent = notificationService.sendTransactionEmailIfEnabled({
                user: { email: recipientEmail, preferences: { notifications: { email: true } } },
                details: {
                    type: 'credit',
                    amount: amt,
                    currency: 'INR',
                    description: `Transfer from ${sender.name}`,
                    timestamp: recipientTransactionCreatedAt || new Date()
                }
            });
        }
    }

    let message = `Successfully transferred Rs ${amt.toLocaleString('en-IN')} to ${recipient ? recipient.name : recipientAccount}`;
    if (!isInternalTransfer) {
        message += ` (${recipientBank ? recipientBank.bankName : 'External Bank'})`;
        if (processingFee > 0) {
            message += `. Processing fee: Rs ${processingFee.toLocaleString('en-IN')} (Total debited: Rs ${totalDebit.toLocaleString('en-IN')})`;
        }
    }

    message += `\nNote: A processing fee of Rs ${processingFee.toLocaleString('en-IN')} was deducted. Total debited from your account: Rs ${totalDebit.toLocaleString('en-IN')}.`;

    return {
        statusCode: 201,
        body: {
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
                        notificationCreated: !!senderNotificationCreated,
                        emailSent: senderEmailSent
                    },
                    recipient: {
                        notificationCreated: recipientNotificationCreated,
                        emailSent: recipientEmailSent
                    }
                }
            }
        }
    };
};

module.exports = {
    validateTransferDetails,
    transferMoney
};
