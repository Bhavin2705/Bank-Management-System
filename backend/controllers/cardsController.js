const Card = require('../models/Card');
const Account = require('../models/Account');
const User = require('../models/User');
const crypto = require('crypto');
const { createInAppNotification } = require('../utils/notifications');

const getUserCards = async (req, res) => {
    try {
        const cards = await Card.find({ userId: req.user._id, status: { $ne: 'closed' } }).select('-pin +cvvEncrypted +cvvIv +cvvTag').sort({ createdAt: -1 });

        const safe = cards.map(c => {
            const obj = c.toObject();
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

const createCard = async (req, res) => {
    try {
        const { cardType, cardBrand, cardName, pin } = req.body;

        let account = null;
        if (req.user.accountId) {
            account = await Account.findById(req.user.accountId);
        }
        if (!account) {
            account = await Account.findOne({ userId: req.user._id, status: 'active' });
        }
        if (!account) {
            let accountName = (req.user && req.user.name) ? `${req.user.name} Primary Account` : 'Primary Account';
            accountName = accountName.replace(/[^A-Za-z0-9 ]+/g, ' ').trim() || 'Primary Account';

            account = new Account({
                userId: req.user._id,
                accountType: 'savings',
                accountName,
                balance: 0,
                currency: 'INR',
                status: 'active'
            });

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
                return res.status(500).json({ success: false, error: 'Failed to create account for user' });
            }
        }

        const now = new Date();
        const defaultExpiryMonth = now.getMonth() + 1; // 1-12
        const defaultExpiryYear = now.getFullYear() + 3;
        const defaultCvv = ('' + crypto.randomInt(100, 999)).padStart(3, '0');

        const brand = cardBrand || (cardType === 'credit' ? 'mastercard' : 'visa');
        const type = cardType || 'debit';

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

        if (defaultCvv) {
            newCard.setCvv(defaultCvv);
        }

        if (pin) {
            await newCard.setPin(pin);
        }

        try {
            await newCard.save();
        } catch (err) {
            if (err.name === 'ValidationError') {
                return res.status(400).json({ success: false, error: 'Validation failed creating card' });
            }
            console.error('Create card unexpected error:', err);
            return res.status(500).json({ success: false, error: 'Server error creating card' });
        }

        const safeCard = await Card.findById(newCard._id).select('-pin -cvvEncrypted -cvvIv -cvvTag');
        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'New Card Created',
            message: `${cardName || 'Your card'} ending with ${String(safeCard.cardNumber || '').slice(-4)} has been created.`,
            priority: 'medium',
            relatedId: safeCard._id,
            relatedModel: 'Card',
            metadata: { category: 'card' }
        });

        res.status(201).json({ success: true, data: safeCard });
    } catch (error) {
        console.error('Create card error:', error);
        res.status(500).json({ success: false, error: 'Server error creating card' });
    }
};

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

        await card.setPin(newPin);
        await card.save();

        await createInAppNotification({
            userId: req.user._id,
            type: 'security_alert',
            title: 'Card PIN Updated',
            message: `PIN updated for card ending with ${String(card.cardNumber || '').slice(-4)}.`,
            priority: 'high',
            relatedId: card._id,
            relatedModel: 'Card',
            metadata: { category: 'security' }
        });

        res.status(200).json({ success: true, message: 'PIN updated successfully' });
    } catch (error) {
        console.error('Update card PIN error:', error);
        res.status(500).json({ success: false, error: 'Server error updating PIN' });
    }
};

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

        await createInAppNotification({
            userId: req.user._id,
            type: status === 'blocked' || status === 'lost' ? 'card_blocked' : 'account_update',
            title: 'Card Status Updated',
            message: `Card ending with ${String(card.cardNumber || '').slice(-4)} is now ${status}.`,
            priority: status === 'blocked' || status === 'lost' ? 'high' : 'medium',
            relatedId: card._id,
            relatedModel: 'Card',
            metadata: { category: 'card' }
        });

        res.status(200).json({ success: true, message: `Card status updated to ${status}` });
    } catch (error) {
        console.error('Update card status error:', error);
        res.status(500).json({ success: false, error: 'Server error updating card status' });
    }
};

const revealCardCvv = async (req, res) => {
    try {
        const cardId = req.params.id;
        const { pin } = req.body || {};

        if (!pin || !/^\d{4,6}$/.test(String(pin))) {
            return res.status(400).json({ success: false, error: 'Valid PIN is required' });
        }

        const user = await User.findById(req.user._id).select('+pin');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isPinValid = await user.comparePin(String(pin));
        if (!isPinValid) {
            return res.status(401).json({ success: false, error: 'Invalid PIN' });
        }

        const card = await Card.findById(cardId).select('+cvvEncrypted +cvvIv +cvvTag');
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to access this card' });
        }

        const cvv = card.getCvvPlain();
        if (!cvv) {
            return res.status(500).json({ success: false, error: 'Unable to reveal CVV' });
        }

        return res.status(200).json({
            success: true,
            data: {
                cardId: card._id,
                cvv
            }
        });
    } catch (error) {
        console.error('Reveal card CVV error:', error);
        return res.status(500).json({ success: false, error: 'Server error revealing CVV' });
    }
};

module.exports = {
    getUserCards,
    createCard,
    updateCardPin,
    updateCardStatus,
    revealCardCvv
};
