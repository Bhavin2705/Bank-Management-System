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
    ifscPrefix: {
        type: String,
        required: true
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

module.exports = mongoose.model('Bank', BankSchema);