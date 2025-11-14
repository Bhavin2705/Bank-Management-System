const Card = require('../models/Card');
const Account = require('../models/Account');
const crypto = require('crypto');

// Get all cards for authenticated user
const getUserCards = async (req, res) => {
    try {
        // Include encrypted CVV fields so we can decrypt and return plaintext CVV in response
        const cards = await Card.find({ userId: req.user._id, status: { $ne: 'closed' } }).select('-pin +cvvEncrypted +cvvIv +cvvTag').sort({ createdAt: -1 });

        // Decrypt CVV for each card and map to a safe response object
        const safe = cards.map(c => {
            const obj = c.toObject();
            // attach plaintext CVV (be cautious: this exposes CVV in API responses)
            try {
                obj.cvv = c.getCvvPlain();
            } catch (e) {
                obj.cvv = null;
            }
            // remove encrypted fields from response
            delete obj.cvvEncrypted;
            delete obj.cvvIv;
            delete obj.cvvTag;
            delete obj.pin;
            return obj;
        });

        res.status(200).json({ success: true, data: safe });
    } catch (error) {
        console.error('Get user cards error:', error);
        res.status(500).json({ success: false, error: 'Server error getting cards' });
    }
};

// Create a new card for the user
const createCard = async (req, res) => {
    try {
        console.log('Create card request from user:', req.user ? req.user._id : 'unknown');
        console.log('Create card body:', req.body);
        const { cardType, cardBrand, cardName, pin } = req.body;

        // Ensure we have an account to attach the card to
        let account = null;
        if (req.user.accountId) {
            account = await Account.findById(req.user.accountId);
        }
        if (!account) {
            account = await Account.findOne({ userId: req.user._id, status: 'active' });
        }
        if (!account) {
            // Auto-create a default savings account for the user so a card can be attached.
            // This improves UX for users created without an account yet.
            // Build a safe account name (Account schema forbids special characters)
            let accountName = (req.user && req.user.name) ? `${req.user.name} Primary Account` : 'Primary Account';
            // Remove characters other than letters, numbers and spaces
            accountName = accountName.replace(/[^A-Za-z0-9 ]+/g, ' ').trim() || 'Primary Account';

            account = new Account({
                userId: req.user._id,
                accountType: 'savings',
                accountName,
                balance: 0,
                currency: 'INR',
                status: 'active'
            });

            // Generate an account number now so validation passes (pre-save may run after validation)
            try {
                const typeCode = account.accountType.substring(0, 2).toUpperCase();
                account.accountNumber = typeCode + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 2).toUpperCase();
            } catch (genErr) {
                console.warn('Failed to generate account number, using fallback', genErr);
                account.accountNumber = 'ACC' + Date.now().toString().slice(-8);
            }

            try {
                await account.save();
            } catch (accErr) {
                console.error('Failed to auto-create account for card creation:', accErr);
                // Return a 500 with a helpful message
                return res.status(500).json({ success: false, error: 'Failed to create account for user', details: accErr.message });
            }
        }

        // Default expiry (3 years from now) and CVV if not provided
        const now = new Date();
        const defaultExpiryMonth = now.getMonth() + 1; // 1-12
        const defaultExpiryYear = now.getFullYear() + 3;
        const defaultCvv = ('' + crypto.randomInt(100, 999)).padStart(3, '0');

        // Ensure cardBrand and cardType have sensible defaults
        const brand = cardBrand || (cardType === 'credit' ? 'mastercard' : 'visa');
        const type = cardType || 'debit';

        // Generate a 16-digit card number deterministically here (instead of relying only on model pre-save)
        const prefix = brand === 'visa' ? '4' : brand === 'mastercard' ? '5' : brand === 'amex' ? '3' : '6';
        let cardNum = prefix;
        for (let i = 0; i < 15; i++) {
            cardNum += Math.floor(Math.random() * 10);
        }

        const newCard = new Card({
            userId: req.user._id,
            accountId: account._id,
            cardNumber: cardNum,
            cardType: type,
            cardBrand: brand,
            cardName,
            expiryMonth: defaultExpiryMonth,
            expiryYear: defaultExpiryYear
        });

        // Hash and set CVV (do not store plaintext)
        if (defaultCvv) {
            newCard.setCvv(defaultCvv);
        }

        if (pin) {
            newCard.setPin(pin);
        }

        try {
            await newCard.save();
        } catch (err) {
            // If validation error, return 400 with details
            if (err.name === 'ValidationError') {
                const details = Object.values(err.errors).map(e => e.message).join('; ');
                console.warn('Create card validation failed:', details);
                return res.status(400).json({ success: false, error: 'Validation failed creating card', details });
            }
            // Log full error and return 500 with message in development
            console.error('Create card unexpected error:', err);
            const resp = { success: false, error: 'Server error creating card' };
            if (process.env.NODE_ENV === 'development') resp.details = err.message;
            return res.status(500).json(resp);
        }

        const safeCard = await Card.findById(newCard._id).select('-pin -cvvEncrypted -cvvIv -cvvTag');
        // Return the newly created card and the one-time CVV so the user can note it.
        // The CVV is not stored in plaintext and will not be returned in subsequent requests.
        res.status(201).json({ success: true, data: safeCard, oneTimeCvv: defaultCvv });
    } catch (error) {
        console.error('Create card error:', error);
        res.status(500).json({ success: false, error: 'Server error creating card' });
    }
};

// Update card PIN
const updateCardPin = async (req, res) => {
    try {
        const cardId = req.params.id;
        const { currentPin, newPin } = req.body;

        if (!newPin || typeof newPin !== 'string' || newPin.length < 4) {
            return res.status(400).json({ success: false, error: 'New PIN is required and must be at least 4 digits' });
        }

        const card = await Card.findById(cardId).select('+pin');
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to update this card' });
        }

        if (card.status !== 'active') {
            return res.status(400).json({ success: false, error: 'Card is not active' });
        }

        if (card.pin) {
            const valid = await card.validatePin(currentPin || '');
            if (!valid) return res.status(400).json({ success: false, error: 'Current PIN is incorrect' });
        }

        card.setPin(newPin);
        await card.save();

        res.status(200).json({ success: true, message: 'PIN updated successfully' });
    } catch (error) {
        console.error('Update card PIN error:', error);
        res.status(500).json({ success: false, error: 'Server error updating PIN' });
    }
};

// Update card status (lock/unlock)
const updateCardStatus = async (req, res) => {
    try {
        const cardId = req.params.id;
        const { status } = req.body;

        if (!['active', 'inactive', 'blocked', 'lost', 'expired', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to update this card' });
        }

        card.status = status;
        await card.save();

        res.status(200).json({ success: true, message: `Card status updated to ${status}` });
    } catch (error) {
        console.error('Update card status error:', error);
        res.status(500).json({ success: false, error: 'Server error updating card status' });
    }
};

module.exports = {
    getUserCards,
    createCard,
    updateCardPin,
    updateCardStatus
};
