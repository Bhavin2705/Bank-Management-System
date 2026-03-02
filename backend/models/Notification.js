const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    type: {
        type: String,
        enum: [
            'transaction', 'bill_due', 'bill_paid', 'goal_progress', 'budget_alert',
            'low_balance', 'card_expired', 'card_blocked', 'security_alert',
            'account_update', 'investment_update', 'system_maintenance', 'other'
        ],
        required: [true, 'Notification type is required']
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        maxlength: [500, 'Message cannot be more than 500 characters']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'archived'],
        default: 'unread'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedModel'
    },
    relatedModel: {
        type: String,
        enum: ['Transaction', 'Bill', 'Goal', 'Budget', 'Card', 'Account', 'Investment']
    },
    channels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false }
    },
    deliveryStatus: {
        emailSent: { type: Boolean, default: false },
        smsSent: { type: Boolean, default: false },
        pushSent: { type: Boolean, default: false },
        emailSentAt: Date,
        smsSentAt: Date,
        pushSentAt: Date
    },
    scheduledFor: Date,
    expiresAt: Date,
    actions: [{
        label: String,
        action: String,
        url: String
    }],
    metadata: {
        amount: Number,
        currency: { type: String, default: 'INR' },
        category: String,
        location: String,
        device: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

notificationSchema.virtual('isExpired').get(function () {
    return this.expiresAt && new Date() > this.expiresAt;
});

notificationSchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diffTime = now - this.createdAt;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) return `${diffDays} days ago`;
    if (diffHours > 0) return `${diffHours} hours ago`;
    if (diffMinutes > 0) return `${diffMinutes} minutes ago`;
    return 'Just now';
});

notificationSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!this.scheduledFor) {
        this.scheduledFor = new Date();
    }

    next();
});

notificationSchema.methods.markAsRead = function () {
    this.status = 'read';
    return this.save();
};

notificationSchema.methods.archive = function () {
    this.status = 'archived';
    return this.save();
};

notificationSchema.methods.sendEmail = async function () {
    if (!this.channels.email || this.deliveryStatus.emailSent) return;

    try {
        this.deliveryStatus.emailSent = true;
        this.deliveryStatus.emailSentAt = new Date();
        await this.save();
    } catch (error) {
        console.error('Error sending email notification:', error);
    }
};

notificationSchema.methods.sendSMS = async function () {
    if (!this.channels.sms || this.deliveryStatus.smsSent) return;

    try {
        this.deliveryStatus.smsSent = true;
        this.deliveryStatus.smsSentAt = new Date();
        await this.save();
    } catch (error) {
        console.error('Error sending SMS notification:', error);
    }
};

notificationSchema.statics.getUserNotifications = function (userId, status = 'unread', limit = 50) {
    return this.find({ userId, status })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('relatedId');
};

notificationSchema.statics.getUnreadCount = function (userId) {
    return this.countDocuments({ userId, status: 'unread' });
};

notificationSchema.statics.markAllAsRead = function (userId) {
    return this.updateMany(
        { userId, status: 'unread' },
        { status: 'read' }
    );
};

notificationSchema.statics.createTransactionNotification = function (userId, transaction) {
    const title = transaction.type === 'credit' ? 'Money Received' : 'Money Sent';
    const message = `Rs ${transaction.amount.toLocaleString('en-IN')} ${transaction.type === 'credit' ? 'credited to' : 'debited from'} your account`;

    return this.create({
        userId,
        type: 'transaction',
        title,
        message,
        relatedId: transaction._id,
        relatedModel: 'Transaction',
        metadata: {
            amount: transaction.amount,
            category: transaction.category
        }
    });
};

notificationSchema.statics.createBillDueNotification = function (userId, bill) {
    const title = 'Bill Due Soon';
    const message = `Your ${bill.name} bill of Rs ${bill.amount.toLocaleString('en-IN')} is due on ${bill.dueDate.toDateString()}`;

    return this.create({
        userId,
        type: 'bill_due',
        title,
        message,
        priority: 'high',
        relatedId: bill._id,
        relatedModel: 'Bill',
        channels: { email: true, sms: true },
        metadata: {
            amount: bill.amount
        }
    });
};

notificationSchema.statics.createLowBalanceNotification = function (userId, account, balance) {
    const title = 'Low Balance Alert';
    const message = `Your account balance is Rs ${balance.toLocaleString('en-IN')}. Consider adding funds to avoid transaction failures.`;

    return this.create({
        userId,
        type: 'low_balance',
        title,
        message,
        priority: 'high',
        relatedId: account._id,
        relatedModel: 'Account',
        channels: { email: true, sms: true },
        metadata: {
            amount: balance
        }
    });
};

module.exports = mongoose.model('Notification', notificationSchema);
