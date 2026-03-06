const mongoose = require('mongoose');

const BankSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    bankCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    // Backward-compatible alias kept for older clients/data.
    ifscPrefix: {
        type: String,
        required: false
    },
    logo: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

BankSchema.pre('validate', function (next) {
    const normalizedCode = String(this.bankCode || this.ifscPrefix || '')
        .trim()
        .toUpperCase();

    if (normalizedCode) {
        this.bankCode = normalizedCode;
        this.ifscPrefix = normalizedCode;
    }

    next();
});

module.exports = mongoose.model('Bank', BankSchema);
