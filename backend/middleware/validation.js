const { body, param, query, validationResult } = require('express-validator');

const TRANSACTION_CATEGORIES = [
    'deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping',
    'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary',
    'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'
];

const BUDGET_CATEGORIES = [
    'food', 'transport', 'entertainment', 'shopping', 'utilities',
    'rent', 'insurance', 'healthcare', 'education', 'savings',
    'investment', 'debt_payment', 'miscellaneous', 'other'
];

const BILL_TYPES = [
    'electricity', 'water', 'gas', 'internet', 'phone', 'cable_tv',
    'insurance', 'loan', 'credit_card', 'rent', 'property_tax',
    'vehicle', 'medical', 'education', 'other'
];

const BILL_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];

const RECURRING_TYPES = [
    'bill_payment', 'subscription', 'loan_payment', 'insurance', 'investment', 'savings', 'other'
];

const RECURRING_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'];
const RECURRING_STATUSES = ['active', 'paused', 'completed', 'cancelled', 'failed'];
const USER_STATUSES = ['active', 'inactive', 'suspended'];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
        .isIn(TRANSACTION_CATEGORIES)
        .withMessage('Invalid category'),
    body('cardId')
        .optional()
        .isMongoId()
        .withMessage('Invalid card ID'),
    body('clientRequestId')
        .optional()
        .isString()
        .isLength({ min: 8, max: 100 })
        .withMessage('Invalid client request ID'),
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
    body('clientRequestId')
        .optional()
        .isString()
        .isLength({ min: 8, max: 100 })
        .withMessage('Invalid client request ID'),
    handleValidationErrors
];

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
        .isLength({ min: 4, max: 4 })
        .isNumeric()
        .withMessage('PIN must be 4 digits'),
    handleValidationErrors
];

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

const validateBudget = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Budget name is required'),
    body('category')
        .isIn(BUDGET_CATEGORIES)
        .withMessage('Invalid category'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Budget amount must be a positive number'),
    body('period')
        .isIn(['weekly', 'monthly', 'yearly'])
        .withMessage('Invalid period'),
    handleValidationErrors
];

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

const validateBill = [
    body('type')
        .isIn(BILL_TYPES)
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

const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID format'),
    handleValidationErrors
];

const validateEmailAvailabilityQuery = [
    query('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    handleValidationErrors
];

const validatePhoneAvailabilityQuery = [
    query('phone')
        .isLength({ min: 10, max: 10 })
        .isNumeric()
        .withMessage('Phone number must be 10 digits'),
    handleValidationErrors
];

const validatePinVerification = [
    body('pin')
        .matches(/^\d{4}$/)
        .withMessage('PIN must be 4 digits'),
    handleValidationErrors
];

const validatePinUpdate = [
    body('currentPin')
        .optional()
        .matches(/^\d{4}$/)
        .withMessage('Current PIN must be 4 digits'),
    body('newPin')
        .matches(/^\d{4}$/)
        .withMessage('New PIN must be 4 digits'),
    handleValidationErrors
];

const validateProfileUpdate = [
    body()
        .custom((value) => value && typeof value === 'object' && !Array.isArray(value))
        .withMessage('Request body must be a valid object'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .optional()
        .isLength({ min: 10, max: 10 })
        .isNumeric()
        .withMessage('Phone number must be 10 digits'),
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('dateOfBirth must be a valid date'),
    body('address')
        .optional()
        .custom((value) => {
            if (value === null) return true;
            if (typeof value === 'string') return true;
            if (typeof value === 'object' && !Array.isArray(value)) return true;
            throw new Error('address must be a string, object, or null');
        }),
    body('occupation')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('occupation must be <= 100 characters'),
    body('income')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('income must be a non-negative number'),
    body('currency')
        .optional()
        .isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY'])
        .withMessage('Invalid currency'),
    body('language')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 10 })
        .withMessage('Invalid language'),
    body('theme')
        .optional()
        .isIn(['light', 'dark'])
        .withMessage('Invalid theme'),
    body('bankName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('bankName must be 2-100 characters'),
    body('ifscCode')
        .optional()
        .customSanitizer((value) => String(value).trim().toUpperCase())
        .matches(/^[A-Z0-9]{4}0[A-Z0-9]{6}$/)
        .withMessage('ifscCode must be in valid IFSC format'),
    body('branchName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('branchName must be 2-100 characters'),
    handleValidationErrors
];

const validateUserStatusUpdate = [
    body('status')
        .isIn(USER_STATUSES)
        .withMessage('Invalid user status'),
    handleValidationErrors
];

const validateUserUpdatePayload = [
    body()
        .custom((value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new Error('Request body must be a valid object');
            }
            const allowed = ['name', 'email', 'phone', 'profile', 'preferences', 'status'];
            const keys = Object.keys(value);
            if (keys.length === 0) {
                throw new Error('No fields provided to update');
            }
            const hasUnknown = keys.some((key) => !allowed.includes(key));
            if (hasUnknown) {
                throw new Error('Invalid fields provided for user update');
            }
            return true;
        }),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .optional()
        .isLength({ min: 10, max: 10 })
        .isNumeric()
        .withMessage('Phone number must be 10 digits'),
    body('status')
        .optional()
        .isIn(USER_STATUSES)
        .withMessage('Invalid user status'),
    body('profile')
        .optional()
        .isObject()
        .withMessage('profile must be an object'),
    body('preferences')
        .optional()
        .isObject()
        .withMessage('preferences must be an object'),
    handleValidationErrors
];

const validateSettingsPreferencesUpdate = [
    body('currency')
        .optional()
        .isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY'])
        .withMessage('Invalid currency'),
    body('language')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 10 })
        .withMessage('Invalid language'),
    body('theme')
        .optional()
        .isIn(['light', 'dark'])
        .withMessage('Invalid theme'),
    body('notifications')
        .optional()
        .isObject()
        .withMessage('Notifications must be an object'),
    body('notifications.email')
        .optional()
        .isBoolean()
        .withMessage('notifications.email must be boolean'),
    body('notifications.sms')
        .optional()
        .isBoolean()
        .withMessage('notifications.sms must be boolean'),
    body('notifications.push')
        .optional()
        .isBoolean()
        .withMessage('notifications.push must be boolean'),
    handleValidationErrors
];

const validateTwoFactorUpdate = [
    body('enable')
        .isBoolean()
        .withMessage('enable must be boolean'),
    handleValidationErrors
];

const validateClientDataUpdate = [
    body()
        .custom((value) => {
            const allowedSections = [
                'securityQuestions',
                'loginHistory',
                'recurringPayments',
                'budgets',
                'investments',
                'goals',
                'exchangeCache'
            ];

            if (!value || typeof value !== 'object') {
                throw new Error('Request body must be an object');
            }

            const keys = Object.keys(value);
            if (keys.length === 0) {
                throw new Error('No client data fields provided');
            }

            const hasUnknownField = keys.some((key) => !allowedSections.includes(key));
            if (hasUnknownField) {
                throw new Error('Invalid client data fields provided');
            }

            if (value.securityQuestions !== undefined && typeof value.securityQuestions !== 'object') {
                throw new Error('securityQuestions must be an object');
            }
            if (value.exchangeCache !== undefined && typeof value.exchangeCache !== 'object') {
                throw new Error('exchangeCache must be an object');
            }

            const arraySections = ['loginHistory', 'recurringPayments', 'budgets', 'investments', 'goals'];
            for (const section of arraySections) {
                if (value[section] !== undefined && !Array.isArray(value[section])) {
                    throw new Error(`${section} must be an array`);
                }
            }

            return true;
        }),
    handleValidationErrors
];

const validateBankPayload = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Bank name must be 2-100 characters'),
    body('bankCode')
        .optional()
        .customSanitizer((value) => String(value).trim().toUpperCase())
        .matches(/^[A-Z0-9]{4}$/)
        .withMessage('Bank code must be 4 uppercase letters/numbers')
        .bail()
        .isLength({ min: 4, max: 4 })
        .withMessage('Bank code must be 4 characters'),
    body('ifscPrefix')
        .optional()
        .customSanitizer((value) => String(value).trim().toUpperCase())
        .matches(/^[A-Z0-9]{4}$/)
        .withMessage('IFSC prefix must be 4 uppercase letters/numbers')
        .bail()
        .isLength({ min: 4, max: 4 })
        .withMessage('IFSC prefix must be 4 characters'),
    body('description')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Description must be 2-200 characters'),
    handleValidationErrors
];

const validateCardStatusReviewAction = [
    body('action')
        .customSanitizer((value) => String(value || '').trim().toLowerCase())
        .isIn(['approve', 'reject'])
        .withMessage('Action must be either approve or reject'),
    handleValidationErrors
];

const validateBillCreate = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Bill name is required and must be <= 100 chars'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('type')
        .optional()
        .isIn(BILL_TYPES)
        .withMessage('Invalid bill type'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be <= 200 chars'),
    body('billNumber')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage('Invalid bill number'),
    body('accountNumber')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Invalid account number'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid due date'),
    body('status')
        .optional()
        .isIn(BILL_STATUSES)
        .withMessage('Invalid bill status'),
    handleValidationErrors
];

const validateBillUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Bill name must be <= 100 chars'),
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('type')
        .optional()
        .isIn(BILL_TYPES)
        .withMessage('Invalid bill type'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be <= 200 chars'),
    body('billNumber')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage('Invalid bill number'),
    body('accountNumber')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Invalid account number'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid due date'),
    body('status')
        .optional()
        .isIn(BILL_STATUSES)
        .withMessage('Invalid bill status'),
    handleValidationErrors
];

const validateBillPayment = [
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Payment amount must be greater than 0'),
    handleValidationErrors
];

const validateRecurringCreate = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name is required and must be <= 100 chars'),
    body('beneficiaryName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Beneficiary name is required'),
    body('toAccount')
        .isString()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage('Destination account is required'),
    body('fromAccount')
        .isMongoId()
        .withMessage('Invalid source account'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('frequency')
        .isIn(RECURRING_FREQUENCIES)
        .withMessage('Invalid frequency'),
    body('type')
        .optional()
        .isIn(RECURRING_TYPES)
        .withMessage('Invalid recurring type'),
    body('startDate')
        .isISO8601()
        .withMessage('startDate must be a valid date'),
    body('nextDueDate')
        .optional()
        .isISO8601()
        .withMessage('nextDueDate must be a valid date'),
    body('status')
        .optional()
        .isIn(RECURRING_STATUSES)
        .withMessage('Invalid recurring status'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be <= 200 chars'),
    handleValidationErrors
];

const validateRecurringUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be <= 100 chars'),
    body('beneficiaryName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Beneficiary name is invalid'),
    body('toAccount')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage('Destination account is invalid'),
    body('fromAccount')
        .optional()
        .isMongoId()
        .withMessage('Invalid source account'),
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('frequency')
        .optional()
        .isIn(RECURRING_FREQUENCIES)
        .withMessage('Invalid frequency'),
    body('type')
        .optional()
        .isIn(RECURRING_TYPES)
        .withMessage('Invalid recurring type'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate must be a valid date'),
    body('nextDueDate')
        .optional()
        .isISO8601()
        .withMessage('nextDueDate must be a valid date'),
    body('status')
        .optional()
        .isIn(RECURRING_STATUSES)
        .withMessage('Invalid recurring status'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be <= 200 chars'),
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
    validateBillCreate,
    validateBillUpdate,
    validateBillPayment,
    validateRecurringCreate,
    validateRecurringUpdate,
    validateObjectId,
    validateEmailAvailabilityQuery,
    validatePhoneAvailabilityQuery,
    validatePinVerification,
    validatePinUpdate,
    validateProfileUpdate,
    validateUserStatusUpdate,
    validateUserUpdatePayload,
    validateSettingsPreferencesUpdate,
    validateTwoFactorUpdate,
    validateClientDataUpdate,
    validateBankPayload,
    validateCardStatusReviewAction,
    validatePagination,
    handleValidationErrors
};
