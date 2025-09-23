const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Build a readable error message from validation errors
        const details = errors.array();
        const message = details.map(err => err.msg).join('; ');

        return res.status(400).json({
            success: false,
            error: message || 'Validation failed',
            details
        });
    }
    next();
};

// User validation rules
const validateUserRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .isLength({ min: 10, max: 10 })
        .isNumeric()
        .withMessage('Phone number must be 10 digits'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
];

const validateUserLogin = [
    body('identifier')
        .notEmpty()
        .withMessage('Email or phone is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const validatePasswordReset = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
    handleValidationErrors
];

const validatePasswordUpdate = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
];

const validatePasswordResetToken = [
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
];

// Transaction validation rules
const validateTransaction = [
    body('type')
        .isIn(['credit', 'debit', 'transfer'])
        .withMessage('Invalid transaction type'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('description')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Description is required and must be less than 200 characters'),
    body('category')
        .optional()
        .isIn([
            'deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping',
            'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary',
            'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'
        ])
        .withMessage('Invalid category'),
    handleValidationErrors
];

const validateTransfer = [
    body()
        .custom((value, { req }) => {
            if (!req.body.recipientAccount && !req.body.recipientPhone) {
                throw new Error('Either recipient account or phone number is required');
            }
            return true;
        }),
    body('recipientAccount')
        .optional()
        .notEmpty()
        .withMessage('Recipient account cannot be empty'),
    body('recipientPhone')
        .optional()
        .isLength({ min: 10, max: 10 })
        .isNumeric()
        .withMessage('Phone number must be 10 digits'),
    body('recipientBank')
        .optional()
        .custom((value) => {
            if (value) {
                if (!value.bankName) {
                    throw new Error('Bank name is required for external transfers');
                }
            }
            return true;
        }),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Description must be less than 200 characters'),
    handleValidationErrors
];

// Account validation rules
const validateAccountCreation = [
    body('accountType')
        .isIn(['savings', 'checking', 'business', 'fixed_deposit', 'recurring_deposit'])
        .withMessage('Invalid account type'),
    body('accountName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Account name is required and must be less than 50 characters'),
    body('currency')
        .optional()
        .isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY'])
        .withMessage('Invalid currency'),
    handleValidationErrors
];

// Card validation rules
const validateCardCreation = [
    body('cardType')
        .isIn(['debit', 'credit'])
        .withMessage('Invalid card type'),
    body('cardBrand')
        .isIn(['visa', 'mastercard', 'rupay', 'amex'])
        .withMessage('Invalid card brand'),
    body('cardName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Card name is required and must be less than 50 characters'),
    body('pin')
        .optional()
        .isLength({ min: 4, max: 6 })
        .isNumeric()
        .withMessage('PIN must be 4-6 digits'),
    handleValidationErrors
];

// Investment validation rules
const validateInvestment = [
    body('type')
        .isIn(['stocks', 'mutual_funds', 'bonds', 'fd', 'rd', 'gold', 'crypto', 'etf'])
        .withMessage('Invalid investment type'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Investment name is required'),
    body('quantity')
        .isFloat({ min: 0 })
        .withMessage('Quantity must be a positive number'),
    body('purchasePrice')
        .isFloat({ min: 0 })
        .withMessage('Purchase price must be a positive number'),
    handleValidationErrors
];

// Budget validation rules
const validateBudget = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Budget name is required'),
    body('category')
        .isIn([
            'food', 'transport', 'entertainment', 'shopping', 'utilities',
            'rent', 'insurance', 'healthcare', 'education', 'savings',
            'investment', 'debt_payment', 'miscellaneous', 'other'
        ])
        .withMessage('Invalid category'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Budget amount must be a positive number'),
    body('period')
        .isIn(['weekly', 'monthly', 'yearly'])
        .withMessage('Invalid period'),
    handleValidationErrors
];

// Goal validation rules
const validateGoal = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Goal name is required'),
    body('targetAmount')
        .isFloat({ min: 0 })
        .withMessage('Target amount must be a positive number'),
    body('targetDate')
        .isISO8601()
        .withMessage('Invalid target date'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    handleValidationErrors
];

// Bill validation rules
const validateBill = [
    body('type')
        .isIn([
            'electricity', 'water', 'gas', 'internet', 'phone', 'cable_tv',
            'insurance', 'loan', 'credit_card', 'rent', 'property_tax',
            'vehicle', 'medical', 'education', 'other'
        ])
        .withMessage('Invalid bill type'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Bill name is required'),
    body('billNumber')
        .notEmpty()
        .withMessage('Bill number is required'),
    body('accountNumber')
        .notEmpty()
        .withMessage('Account number is required'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Bill amount must be a positive number'),
    body('dueDate')
        .isISO8601()
        .withMessage('Invalid due date'),
    handleValidationErrors
];

// General validation rules
const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID format'),
    handleValidationErrors
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validatePasswordReset,
    validatePasswordResetToken,
    validatePasswordUpdate,
    validateTransaction,
    validateTransfer,
    validateAccountCreation,
    validateCardCreation,
    validateInvestment,
    validateBudget,
    validateGoal,
    validateBill,
    validateObjectId,
    validatePagination,
    handleValidationErrors
};
