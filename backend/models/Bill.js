const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    type: {
        type: String,
        enum: [
            'electricity', 'water', 'gas', 'internet', 'phone', 'cable_tv',
            'insurance', 'loan', 'credit_card', 'rent', 'property_tax',
            'vehicle', 'medical', 'education', 'other'
        ],
        required: [true, 'Bill type is required']
    },
    name: {
        type: String,
        required: [true, 'Bill name is required'],
        maxlength: [100, 'Bill name cannot be more than 100 characters']
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot be more than 200 characters']
    },
    // Bill details
    billNumber: {
        type: String,
        required: [true, 'Bill number is required']
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required']
    },
    amount: {
        type: Number,
        required: [true, 'Bill amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    // Payment information
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paidDate: Date,
    paymentMethod: {
        type: String,
        enum: ['online', 'auto_debit', 'manual', 'cheque']
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    // Recurring bill settings
    isRecurring: {
        type: Boolean,
        default: false
    },
    frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
        default: 'monthly'
    },
    nextDueDate: Date,
    // Auto payment settings
    autoPay: {
        type: Boolean,
        default: false
    },
    autoPayAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Bill provider information
    provider: {
        name: String,
        contact: String,
        website: String,
        customerId: String
    },
    // Alerts and reminders
    reminders: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        daysBefore: { type: Number, default: 3 }
    },
    // Bill attachments/documents
    documents: [{
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Notes
    notes: [{
        content: String,
        date: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
billSchema.index({ userId: 1, status: 1 });
billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ userId: 1, type: 1 });
billSchema.index({ billNumber: 1 });

// Virtual for days until due
billSchema.virtual('daysUntilDue').get(function () {
    const now = new Date();
    const diffTime = this.dueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
billSchema.virtual('isOverdue').get(function () {
    return this.status === 'pending' && this.daysUntilDue < 0;
});

// Virtual for payment status
billSchema.virtual('paymentStatus').get(function () {
    if (this.status === 'paid') return 'paid';
    if (this.isOverdue) return 'overdue';
    if (this.daysUntilDue <= this.reminders.daysBefore) return 'due_soon';
    return 'pending';
});

// Pre-save middleware
billSchema.pre('save', function (next) {
    // Set next due date for recurring bills
    if (this.isRecurring && !this.nextDueDate) {
        this.nextDueDate = this.dueDate;
    }

    // Update status based on payment
    if (this.paidAmount >= this.amount && this.status === 'pending') {
        this.status = 'paid';
        this.paidDate = new Date();
    }

    next();
});

// Instance method to mark as paid
billSchema.methods.markAsPaid = function (paymentAmount, paymentMethod = 'online', transactionId = null) {
    this.paidAmount = paymentAmount;
    this.status = 'paid';
    this.paidDate = new Date();
    this.paymentMethod = paymentMethod;

    if (transactionId) {
        this.transactionId = transactionId;
    }

    // Add payment note
    this.notes.push({
        content: `Bill paid: Rs${paymentAmount.toLocaleString('en-IN')} via ${paymentMethod}`
    });

    // Create next bill if recurring
    if (this.isRecurring) {
        return this.createNextBill();
    }

    return this.save();
};

// Instance method to create next recurring bill
billSchema.methods.createNextBill = function () {
    const nextBill = new mongoose.model('Bill')({
        userId: this.userId,
        type: this.type,
        name: this.name,
        description: this.description,
        billNumber: this.generateNextBillNumber(),
        accountNumber: this.accountNumber,
        amount: this.amount,
        dueDate: this.calculateNextDueDate(),
        isRecurring: true,
        frequency: this.frequency,
        autoPay: this.autoPay,
        autoPayAccount: this.autoPayAccount,
        provider: this.provider,
        reminders: this.reminders
    });

    return nextBill.save();
};

// Instance method to generate next bill number
billSchema.methods.generateNextBillNumber = function () {
    const now = new Date();
    return `${this.billNumber.split('-')[0]}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Instance method to calculate next due date
billSchema.methods.calculateNextDueDate = function () {
    const currentDue = new Date(this.dueDate);

    switch (this.frequency) {
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

// Static method to get user bills
billSchema.statics.getUserBills = function (userId, status = 'all') {
    let query = { userId };

    if (status !== 'all') {
        query.status = status;
    }

    return this.find(query).sort({ dueDate: 1 });
};

// Static method to get bills due soon
billSchema.statics.getBillsDueSoon = function (userId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        userId,
        status: 'pending',
        dueDate: { $lte: futureDate }
    }).sort({ dueDate: 1 });
};

// Static method to get bill statistics
billSchema.statics.getBillStats = function (userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                paidAmount: { $sum: '$paidAmount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Bill', billSchema);
