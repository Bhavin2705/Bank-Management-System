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
    // Payment details
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
    // Status and control
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
        default: 'active'
    },
    isAutoPay: {
        type: Boolean,
        default: false
    },
    // Payment history
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
    // Failure handling
    maxRetries: {
        type: Number,
        default: 3
    },
    retryCount: {
        type: Number,
        default: 0
    },
    lastFailureReason: String,
    // Notifications
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        daysBefore: { type: Number, default: 1 }
    },
    // Categories and tags
    category: {
        type: String,
        enum: [
            'utilities', 'entertainment', 'insurance', 'loan', 'subscription',
            'savings', 'investment', 'rent', 'food', 'transport', 'other'
        ],
        default: 'other'
    },
    tags: [String],
    // Metadata
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

// Indexes
recurringPaymentSchema.index({ userId: 1, status: 1 });
recurringPaymentSchema.index({ userId: 1, nextDueDate: 1 });
recurringPaymentSchema.index({ userId: 1, type: 1 });
recurringPaymentSchema.index({ nextDueDate: 1 });

// Virtual for days until next payment
recurringPaymentSchema.virtual('daysUntilNext').get(function () {
    const now = new Date();
    const diffTime = this.nextDueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for total payments made
recurringPaymentSchema.virtual('totalPaymentsMade').get(function () {
    return this.paymentHistory.filter(payment => payment.status === 'success').length;
});

// Virtual for total amount paid
recurringPaymentSchema.virtual('totalAmountPaid').get(function () {
    return this.paymentHistory
        .filter(payment => payment.status === 'success')
        .reduce((total, payment) => total + payment.amount, 0);
});

// Pre-save middleware
recurringPaymentSchema.pre('save', function (next) {
    // Set next due date if not set
    if (!this.nextDueDate) {
        this.nextDueDate = this.startDate;
    }

    // Check if payment is completed
    if (this.endDate && new Date() > this.endDate) {
        this.status = 'completed';
    }

    next();
});

// Instance method to calculate next due date
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

// Instance method to process payment
recurringPaymentSchema.methods.processPayment = async function () {
    try {
        // This would integrate with the transaction service
        // For now, we'll just record the payment attempt

        const paymentRecord = {
            amount: this.amount,
            date: new Date(),
            status: 'success', // In real implementation, this would be based on actual payment result
            notes: `Auto payment for ${this.name}`
        };

        this.paymentHistory.push(paymentRecord);

        // Calculate next due date
        this.nextDueDate = this.calculateNextDueDate();

        // Reset retry count on success
        this.retryCount = 0;
        this.lastFailureReason = null;

        await this.save();

        return { success: true, payment: paymentRecord };
    } catch (error) {
        // Handle payment failure
        this.retryCount += 1;
        this.lastFailureReason = error.message;

        if (this.retryCount >= this.maxRetries) {
            this.status = 'failed';
        }

        await this.save();

        return { success: false, error: error.message };
    }
};

// Instance method to pause/unpause
recurringPaymentSchema.methods.togglePause = function () {
    this.status = this.status === 'active' ? 'paused' : 'active';
    return this.save();
};

// Instance method to cancel
recurringPaymentSchema.methods.cancel = function () {
    this.status = 'cancelled';
    return this.save();
};

// Static method to get user recurring payments
recurringPaymentSchema.statics.getUserRecurringPayments = function (userId, status = 'active') {
    return this.find({ userId, status }).sort({ nextDueDate: 1 });
};

// Static method to get payments due soon
recurringPaymentSchema.statics.getPaymentsDueSoon = function (userId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        userId,
        status: 'active',
        nextDueDate: { $lte: futureDate }
    }).sort({ nextDueDate: 1 });
};

// Static method to process all due payments
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

// Static method to get payment statistics
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
