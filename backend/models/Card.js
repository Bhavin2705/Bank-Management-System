const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
    cvvEncrypted: {
        type: String,
        select: false
    },
    cvvIv: {
        type: String,
        select: false
    },
    cvvTag: {
        type: String,
        select: false
    },
    pin: {
        type: String,
        select: false // Don't include PIN in queries
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked', 'expired', 'lost', 'closed'],
        default: 'active'
    },
    creditLimit: {
        type: Number,
        default: 0
    },
    availableCredit: {
        type: Number,
        default: 0
    },
    features: {
        contactless: { type: Boolean, default: true },
        onlinePayments: { type: Boolean, default: true },
        atmWithdrawals: { type: Boolean, default: true },
        international: { type: Boolean, default: false },
        rewards: { type: Boolean, default: false }
    },
    security: {
        onlineTransactions: { type: Boolean, default: true },
        internationalTransactions: { type: Boolean, default: false },
        contactlessLimit: { type: Number, default: 5000 },
        dailyLimit: { type: Number, default: 50000 },
        monthlyLimit: { type: Number, default: 200000 }
    },
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

cardSchema.index({ userId: 1 });
cardSchema.index({ accountId: 1 });
cardSchema.index({ status: 1 });

cardSchema.virtual('maskedCardNumber').get(function () {
    if (!this.cardNumber) return '';
    return '**** **** **** ' + this.cardNumber.slice(-4);
});

cardSchema.virtual('expiryDate').get(function () {
    return `${this.expiryMonth.toString().padStart(2, '0')}/${this.expiryYear}`;
});

cardSchema.virtual('isExpired').get(function () {
    const now = new Date();
    const expiryDate = new Date(this.expiryYear, this.expiryMonth - 1);
    return now > expiryDate;
});

cardSchema.virtual('availableBalance').get(function () {
    if (this.cardType === 'credit') {
        return this.availableCredit;
    }
    return 0;
});

cardSchema.pre('save', function (next) {
    if (!this.cardNumber) {
        const prefix = this.cardBrand === 'visa' ? '4' :
            this.cardBrand === 'mastercard' ? '5' :
                this.cardBrand === 'amex' ? '3' : '6';
        let cardNum = prefix;
        for (let i = 0; i < 15; i++) {
            cardNum += Math.floor(Math.random() * 10);
        }
        this.cardNumber = cardNum;
    }

    if (this.cardType === 'credit' && this.isNew) {
        this.availableCredit = this.creditLimit;
    }

    next();
});

cardSchema.methods.validatePin = async function (pin) {
    if (!this.pin) return false;
    if (this.pin.startsWith('$2')) {
        return bcrypt.compare(String(pin), this.pin);
    }
    return this.pin === crypto.createHash('sha256').update(String(pin)).digest('hex');
};

cardSchema.methods.setPin = async function (pin) {
    this.pin = await bcrypt.hash(String(pin), 12);
};

function getCvvKey() {
    const envKey = process.env.CVV_ENC_KEY;
    if (envKey) {
        try {
            if (/^[0-9a-fA-F]+$/.test(envKey) && envKey.length === 64) {
                return Buffer.from(envKey, 'hex');
            }
            return Buffer.from(envKey, 'base64');
        } catch (e) {
        }
    }
    if (!process.env.JWT_SECRET) {
        throw new Error('CVV_ENC_KEY or JWT_SECRET must be configured');
    }
    return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
}

cardSchema.methods.setCvv = function (cvv) {
    const key = getCvvKey();
    const iv = crypto.randomBytes(12); // 96-bit for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(cvv), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    this.cvvEncrypted = encrypted.toString('hex');
    this.cvvIv = iv.toString('hex');
    this.cvvTag = tag.toString('hex');
};

cardSchema.methods.getCvvPlain = function () {
    if (!this.cvvEncrypted || !this.cvvIv || !this.cvvTag) return null;
    try {
        const key = getCvvKey();
        const iv = Buffer.from(this.cvvIv, 'hex');
        const tag = Buffer.from(this.cvvTag, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(this.cvvEncrypted, 'hex')), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        return null;
    }
};

cardSchema.methods.validateCvv = async function (cvv) {
    const plain = this.getCvvPlain();
    return plain === String(cvv);
};

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

cardSchema.statics.getUserCards = function (userId) {
    return this.find({ userId, status: { $ne: 'lost' } })
        .populate('accountId', 'accountNumber accountType balance')
        .sort({ createdAt: -1 });
};

cardSchema.statics.findByCardNumber = function (cardNumber) {
    return this.findOne({ cardNumber }).populate('userId accountId');
};

module.exports = mongoose.model('Card', cardSchema);
