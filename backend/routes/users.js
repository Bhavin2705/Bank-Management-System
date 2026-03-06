const express = require('express');
const {
    getUsers,
    getUser,
    updateUser,
    getUserStats,
    getAdminActions,
    getBanks,
    getBankMetrics,
    getTransferRecipients,
    getClientData,
    updateClientData,
    verifyPin,
    updatePin
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.get('/banks', getBanks);

router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        const User = require('../models/User');
        const existingUser = await User.findOne({ email });
        res.status(200).json({ exists: !!existingUser, success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Email check failed' });
    }
});

router.get('/check-phone', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone is required' });
        }
        const User = require('../models/User');
        const phoneCheck = await User.checkPhoneAccountLimit(phone);
        res.status(200).json({ 
            exists: phoneCheck.count > 0,
            count: phoneCheck.count,
            maxAllowed: phoneCheck.maxAllowed,
            canRegister: phoneCheck.canRegister,
            success: true 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Phone check failed' });
    }
});

router.use(protect);

router.post('/verify-pin', verifyPin);
router.put('/update-pin', updatePin);
router.get('/me/client-data', getClientData);
router.put('/me/client-data', updateClientData);

router.get('/stats', authorize('admin'), getUserStats);
router.get('/admin-actions', authorize('admin'), getAdminActions);
router.get('/bank-metrics', authorize('admin'), getBankMetrics);
router.get('/transfer-recipients', getTransferRecipients);

router.get('/', authorize('admin'), validatePagination, getUsers);
router.put('/:id/status', authorize('admin'), validateObjectId, (req, res, next) => {
    req.body = { status: req.body.status };
    next();
}, updateUser);
router.get('/:id', validateObjectId, getUser);
router.put('/:id', validateObjectId, updateUser);

module.exports = router;
