const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Add crypto for password reset token

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters'],
        validate: {
            validator: function (v) {
                return /^[A-Za-z ]+$/.test(v);
            },
            message: 'Name can only contain alphabets and spaces'
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true, // This creates a unique index
        lowercase: true,
        validate: {
            validator: function (email) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email'
        }
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function (phone) {
                return /^\d{10}$/.test(phone);
            },
            message: 'Please enter a valid 10-digit phone number'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'], // Better password length
        select: false, // Don't include password in queries by default
        validate: { // Add a regex to enforce a stronger password
            validator: function (v) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        }
    },
    pin: {
        type: String,
        required: [true, 'PIN is required'],
        minlength: [4, 'PIN must be 4 digits'],
        maxlength: [4, 'PIN must be 4 digits'],
        select: false, // Don't include PIN in queries by default
        validate: {
            validator: function (v) {
                return /^\d{4}$/.test(v);
            },
            message: 'PIN must be a 4 digit number'
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    accountNumber: {
        type: String,
        unique: true, // This creates a unique index
        required: [true, 'Account number is required']
    },
    bankDetails: {
        bankName: {
            type: String,
            required: [true, 'Bank name is required'],
            default: 'BankPro'
        },
        ifscCode: {
            type: String,
            required: false,
            default: ''
        },
        branchName: {
            type: String,
            default: 'Main Branch'
        }
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    profile: {
        photoUrl: String,
        dateOfBirth: Date,
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        },
        occupation: String,
        income: Number
    },
    kyc: {
        status: {
            type: String,
            enum: ['unverified', 'pending', 'verified', 'rejected'],
            default: 'unverified'
        },
        idType: {
            type: String,
            enum: ['aadhaar', 'pan', 'passport', 'driver_license', 'other']
        },
        idNumberMasked: String,
        documentUrls: [String],
        submittedAt: Date,
        reviewedAt: Date,
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectionReason: String
    },
    security: {
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        isPhoneVerified: {
            type: Boolean,
            default: false
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        twoFactorSecret: String,
        twoFactorOtpHash: String,
        twoFactorOtpExpires: Date,
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: Date,
        lastLogin: Date,
        passwordResetToken: String,
        passwordResetExpires: Date
    },
    preferences: {
        currency: {
            type: String,
            default: 'INR'
        },
        language: {
            type: String,
            default: 'en'
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    firstLogin: {
        type: Boolean,
        default: true
    }
    ,
    clientData: {
        securityQuestions: {
            type: Object,
            default: {}
        },
        loginHistory: {
            type: Array,
            default: []
        },
        recurringPayments: {
            type: Array,
            default: []
        },
        budgets: {
            type: Array,
            default: []
        },
        investments: {
            type: Array,
            default: []
        },
        goals: {
            type: Array,
            default: []
        },
        exchangeCache: {
            key: { type: String, default: '' },
            timestamp: { type: Number, default: 0 }, // ms since epoch
            data: { type: Object, default: {} }
        }
    },
    tokens: [
        {
            token: String,
            expiryTimestampMs: Number,
            createdAt: { type: Date, default: Date.now }
        }
    ]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.index({ role: 1 }); // Role is not unique, so this is a valid index.

userSchema.virtual('accountAge').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

userSchema.pre('save', async function (next) {
    if (!this.accountNumber) {
        this.generateAccountNumber();
    }

    let passwordHashPromise = Promise.resolve();
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }

    if (this.isModified('pin')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.pin = await bcrypt.hash(this.pin, salt);
        } catch (error) {
            return next(error);
        }
    }

    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePin = async function (candidatePin) {
    return await bcrypt.compare(candidatePin, this.pin);
};

userSchema.methods.generateAccountNumber = function () {
    const ts = Date.now().toString().slice(-6); // last 6 digits of ms timestamp
    const rand = Math.floor(10000 + Math.random() * 90000).toString(); // 5 random digits
    const accountNumber = ts + rand;
    this.accountNumber = accountNumber;
    return accountNumber;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.security = this.security || {};
    this.security.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

userSchema.statics.findByEmailOrPhone = function (identifier) {
    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier);

    if (isEmail) {
        return this.findOne({ email: identifier });
    } else {
        return this.find({ phone: identifier });
    }
};

userSchema.statics.checkPhoneAccountLimit = async function (phone) {
    const count = await this.countDocuments({ phone });
    return {
        count,
        canRegister: count < 3,
        maxAllowed: 3
    };
};

module.exports = mongoose.model('User', userSchema);
