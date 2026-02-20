const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const notifications = [
            {
                id: '1',
                type: 'transaction',
                message: '₹2,500 debited from your account for Swiggy order',
                timestamp: new Date().toISOString(),
                read: false
            },
            {
                id: '2',
                type: 'payment',
                message: 'Recurring Netflix subscription of ₹649 paid successfully',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: '3',
                type: 'security',
                message: 'New login detected from Chrome on Windows in Mumbai',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                read: true
            }
        ];
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/mark-all-read', protect, async (req, res) => {
    res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = router;
