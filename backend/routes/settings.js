const express = require('express');
const {
    getSettings,
    updatePreferences,
    updateTwoFactor,
    getLinkedAccounts,
    getSessions
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Settings routes
router.get('/', getSettings);
router.put('/preferences', updatePreferences);
router.put('/two-factor', updateTwoFactor);
router.get('/linked-accounts', getLinkedAccounts);
router.get('/sessions', getSessions);

module.exports = router;
