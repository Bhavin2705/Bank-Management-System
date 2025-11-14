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
    }
        ,
        // Client-side persistent data migrated from frontend localStorage
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
        // Stored tokens (e.g., JWT issued to client) and their expiry timestamps
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

// Remove duplicate index calls. unique: true on the fields already creates them.
userSchema.index({ role: 1 }); // Role is not unique, so this is a valid index.

// Virtual for account age
userSchema.virtual('accountAge').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to hash password and generate account number
userSchema.pre('save', async function (next) {
    // Generate account number if not present
    if (!this.accountNumber) {
        this.generateAccountNumber();
    }

    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate account number
userSchema.methods.generateAccountNumber = function () {
    // A more robust way to generate a unique account number
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const accountNumber = 'ACC-' + timestamp + random.toUpperCase();
    this.accountNumber = accountNumber;
    return accountNumber;
};

// Instance method for password reset
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

// Static method to find users by email or phone (returns array for phone, single for email)
userSchema.statics.findByEmailOrPhone = function (identifier) {
    // Check if identifier is an email
    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier);

    if (isEmail) {
        // For email, return single user (email is unique)
        return this.findOne({ email: identifier });
    } else {
        // For phone, return all users with that phone (up to 3)
        return this.find({ phone: identifier });
    }
};

// Add method to check phone number account limit
userSchema.statics.checkPhoneAccountLimit = async function (phone) {
    const count = await this.countDocuments({ phone });
    return {
        count,
        canRegister: count < 3,
        maxAllowed: 3
    };
};

module.exports = mongoose.model('User', userSchema);