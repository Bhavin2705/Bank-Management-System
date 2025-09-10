const mongoose = require('mongoose');
const crypto = require('crypto');

const cardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account ID is required']
    },
    cardNumber: {
        type: String,
        required: [true, 'Card number is required'],
        unique: true
    },
    cardType: {
        type: String,
        enum: ['debit', 'credit'],
        required: [true, 'Card type is required']
    },
    cardBrand: {
        type: String,
        enum: ['visa', 'mastercard', 'rupay', 'amex'],
        required: [true, 'Card brand is required']
    },
    cardName: {
        type: String,
        required: [true, 'Card name is required'],
        maxlength: [50, 'Card name cannot be more than 50 characters']
    },
    expiryMonth: {
        type: Number,
        required: [true, 'Expiry month is required'],
        min: 1,
        max: 12
    },
    expiryYear: {
        type: Number,
        required: [true, 'Expiry year is required'],
        min: new Date().getFullYear()
    },
    cvv: {
        type: String,
        required: [true, 'CVV is required'],
        select: false // Don't include CVV in queries
    },
    pin: {
        type: String,
        select: false // Don't include PIN in queries
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked', 'expired', 'lost'],
        default: 'active'
    },
    // Credit card specific fields
    creditLimit: {
        type: Number,
        default: 0
    },
    availableCredit: {
        type: Number,
        default: 0
    },
    // Card features
    features: {
        contactless: { type: Boolean, default: true },
        onlinePayments: { type: Boolean, default: true },
        atmWithdrawals: { type: Boolean, default: true },
        international: { type: Boolean, default: false },
        rewards: { type: Boolean, default: false }
    },
    // Security settings
    security: {
        onlineTransactions: { type: Boolean, default: true },
        internationalTransactions: { type: Boolean, default: false },
        contactlessLimit: { type: Number, default: 5000 },
        dailyLimit: { type: Number, default: 50000 },
        monthlyLimit: { type: Number, default: 200000 }
    },
    // Card design/theme
    design: {
        color: {
            type: String,
            default: 'blue',
            enum: ['blue', 'black', 'gold', 'silver', 'red', 'green']
        },
        pattern: {
            type: String,
            default: 'solid'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
cardSchema.index({ userId: 1 });
cardSchema.index({ accountId: 1 });
cardSchema.index({ cardNumber: 1 });
cardSchema.index({ status: 1 });

// Virtual for masked card number
cardSchema.virtual('maskedCardNumber').get(function () {
    if (!this.cardNumber) return '';
    return '**** **** **** ' + this.cardNumber.slice(-4);
});

// Virtual for expiry date
cardSchema.virtual('expiryDate').get(function () {
    return `${this.expiryMonth.toString().padStart(2, '0')}/${this.expiryYear}`;
});

// Virtual for card status
cardSchema.virtual('isExpired').get(function () {
    const now = new Date();
    const expiryDate = new Date(this.expiryYear, this.expiryMonth - 1);
    return now > expiryDate;
});

// Virtual for available balance (for credit cards)
cardSchema.virtual('availableBalance').get(function () {
    if (this.cardType === 'credit') {
        return this.availableCredit;
    }
    // For debit cards, this would be the account balance
    return 0;
});

// Pre-save middleware to generate card number
cardSchema.pre('save', function (next) {
    if (!this.cardNumber) {
        // Generate a 16-digit card number
        const prefix = this.cardBrand === 'visa' ? '4' :
            this.cardBrand === 'mastercard' ? '5' :
                this.cardBrand === 'amex' ? '3' : '6';
        let cardNum = prefix;
        for (let i = 0; i < 15; i++) {
            cardNum += Math.floor(Math.random() * 10);
        }
        this.cardNumber = cardNum;
    }

    // Set available credit for credit cards
    if (this.cardType === 'credit' && this.isNew) {
        this.availableCredit = this.creditLimit;
    }

    next();
});

// Instance method to validate PIN
cardSchema.methods.validatePin = async function (pin) {
    return this.pin === crypto.createHash('sha256').update(pin).digest('hex');
};

// Instance method to set PIN
cardSchema.methods.setPin = function (pin) {
    this.pin = crypto.createHash('sha256').update(pin).digest('hex');
};

// Instance method to check transaction limits
cardSchema.methods.canTransact = function (amount, type = 'online') {
    if (this.status !== 'active') return false;

    if (type === 'contactless' && amount > this.security.contactlessLimit) {
        return false;
    }

    if (amount > this.security.dailyLimit) {
        return false;
    }

    if (this.cardType === 'credit' && amount > this.availableCredit) {
        return false;
    }

    return true;
};

// Static method to get user cards
cardSchema.statics.getUserCards = function (userId) {
    return this.find({ userId, status: { $ne: 'lost' } })
        .populate('accountId', 'accountNumber accountType balance')
        .sort({ createdAt: -1 });
};

// Static method to find card by number
cardSchema.statics.findByCardNumber = function (cardNumber) {
    return this.findOne({ cardNumber }).populate('userId accountId');
};

module.exports = mongoose.model('Card', cardSchema);
