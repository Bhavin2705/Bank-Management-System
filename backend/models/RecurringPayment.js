const mongoose = require('mongoose');

const recurringPaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    name: {
        type: String,
        required: [true, 'Payment name is required'],
        maxlength: [100, 'Payment name cannot be more than 100 characters']
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot be more than 200 characters']
    },
    type: {
        type: String,
        enum: ['bill_payment', 'subscription', 'loan_payment', 'insurance', 'investment', 'savings', 'other'],
        required: [true, 'Payment type is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
        required: [true, 'Frequency is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date
    },
    nextDueDate: {
        type: Date,
        required: [true, 'Next due date is required']
    },
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Source account is required']
    },
    toAccount: {
        type: String, // For external payments
        required: [true, 'Destination account is required']
    },
    beneficiaryName: {
        type: String,
        required: [true, 'Beneficiary name is required']
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
        default: 'active'
    },
    isAutoPay: {
        type: Boolean,
        default: false
    },
    paymentHistory: [{
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction'
        },
        amount: Number,
        date: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'success'
        },
        notes: String
    }],
    maxRetries: {
        type: Number,
        default: 3
    },
    retryCount: {
        type: Number,
        default: 0
    },
    lastFailureReason: String,
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        daysBefore: { type: Number, default: 1 }
    },
    category: {
        type: String,
        enum: [
            'utilities', 'entertainment', 'insurance', 'loan', 'subscription',
            'savings', 'investment', 'rent', 'food', 'transport', 'other'
        ],
        default: 'other'
    },
    tags: [String],
    metadata: {
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bill'
        },
        loanId: String,
        subscriptionId: String,
        provider: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

recurringPaymentSchema.index({ userId: 1, status: 1 });
recurringPaymentSchema.index({ userId: 1, nextDueDate: 1 });
recurringPaymentSchema.index({ userId: 1, type: 1 });
recurringPaymentSchema.index({ nextDueDate: 1 });

recurringPaymentSchema.virtual('daysUntilNext').get(function () {
    const now = new Date();
    const diffTime = this.nextDueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

recurringPaymentSchema.virtual('totalPaymentsMade').get(function () {
    return this.paymentHistory.filter(payment => payment.status === 'success').length;
});

recurringPaymentSchema.virtual('totalAmountPaid').get(function () {
    return this.paymentHistory
        .filter(payment => payment.status === 'success')
        .reduce((total, payment) => total + payment.amount, 0);
});

recurringPaymentSchema.pre('save', function (next) {
    if (!this.nextDueDate) {
        this.nextDueDate = this.startDate;
    }

    if (this.endDate && new Date() > this.endDate) {
        this.status = 'completed';
    }

    next();
});

recurringPaymentSchema.methods.calculateNextDueDate = function () {
    const currentDue = new Date(this.nextDueDate);

    switch (this.frequency) {
        case 'daily':
            currentDue.setDate(currentDue.getDate() + 1);
            break;
        case 'weekly':
            currentDue.setDate(currentDue.getDate() + 7);
            break;
        case 'bi-weekly':
            currentDue.setDate(currentDue.getDate() + 14);
            break;
        case 'monthly':
            currentDue.setMonth(currentDue.getMonth() + 1);
            break;
        case 'quarterly':
            currentDue.setMonth(currentDue.getMonth() + 3);
            break;
        case 'half-yearly':
            currentDue.setMonth(currentDue.getMonth() + 6);
            break;
        case 'yearly':
            currentDue.setFullYear(currentDue.getFullYear() + 1);
            break;
    }

    return currentDue;
};

recurringPaymentSchema.methods.processPayment = async function () {
    try {

        const paymentRecord = {
            amount: this.amount,
            date: new Date(),
            status: 'success', // In real implementation, this would be based on actual payment result
            notes: `Auto payment for ${this.name}`
        };

        this.paymentHistory.push(paymentRecord);

        this.nextDueDate = this.calculateNextDueDate();

        this.retryCount = 0;
        this.lastFailureReason = null;

        await this.save();

        return { success: true, payment: paymentRecord };
    } catch (error) {
        this.retryCount += 1;
        this.lastFailureReason = error.message;

        if (this.retryCount >= this.maxRetries) {
            this.status = 'failed';
        }

        await this.save();

        return { success: false, error: error.message };
    }
};

recurringPaymentSchema.methods.togglePause = function () {
    this.status = this.status === 'active' ? 'paused' : 'active';
    return this.save();
};

recurringPaymentSchema.methods.cancel = function () {
    this.status = 'cancelled';
    return this.save();
};

recurringPaymentSchema.statics.getUserRecurringPayments = function (userId, status = 'active') {
    return this.find({ userId, status }).sort({ nextDueDate: 1 });
};

recurringPaymentSchema.statics.getPaymentsDueSoon = function (userId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        userId,
        status: 'active',
        nextDueDate: { $lte: futureDate }
    }).sort({ nextDueDate: 1 });
};

recurringPaymentSchema.statics.processDuePayments = async function () {
    const duePayments = await this.find({
        status: 'active',
        isAutoPay: true,
        nextDueDate: { $lte: new Date() }
    });

    const results = [];

    for (const payment of duePayments) {
        const result = await payment.processPayment();
        results.push({
            paymentId: payment._id,
            name: payment.name,
            result
        });
    }

    return results;
};

recurringPaymentSchema.statics.getPaymentStats = function (userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
};

module.exports = mongoose.model('RecurringPayment', recurringPaymentSchema);
