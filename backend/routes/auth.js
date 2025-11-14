const express = require('express');
const {
    register,
    login,
    loginWithAccount,
    logout,
    getMe,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword,
    refreshToken,
    verifyResetToken
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
    validateUserRegistration,
    validateUserLogin,
    validatePasswordReset,
    validatePasswordResetToken,
    validatePasswordUpdate
} = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validateUserRegistration, register);
router.post('/login', authLimiter, validateUserLogin, login);
router.post('/login-account', authLimiter, validateUserLogin, loginWithAccount);
router.post('/forgotpassword', passwordResetLimiter, validatePasswordReset, forgotPassword);
router.put('/resetpassword/:resettoken', validatePasswordResetToken, resetPassword);
router.get('/resetpassword/:resettoken', verifyResetToken);
router.post('/refresh', refreshToken);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', validatePasswordUpdate, updatePassword);

module.exports = router;
