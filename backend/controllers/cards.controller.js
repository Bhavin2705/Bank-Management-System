const Card = require('../models/Card');
const Account = require('../models/Account');
const User = require('../models/User');
const crypto = require('crypto');
const { createInAppNotification } = require('../utils/notifications');
const { logAdminAction } = require('../utils/adminAudit');

const isOwnerOrAdmin = (resourceUserId, reqUser) =>
    resourceUserId.toString() === reqUser._id.toString() || reqUser.role === 'admin';

const getGeneratedExpiry = () => {
    const now = new Date();
    const monthsAhead = crypto.randomInt(36, 61);
    const expiry = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    return {
        month: expiry.getMonth() + 1,
        year: expiry.getFullYear()
    };
};

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

        const generatedExpiry = getGeneratedExpiry();
        const defaultExpiryMonth = generatedExpiry.month;
        const defaultExpiryYear = generatedExpiry.year;
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

        if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ success: false, error: 'New PIN is required and must be 4 digits' });
        }

        const card = await Card.findById(cardId).select('+pin');
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.userId.toString() !== req.user._id.toString()) {
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

        if (!isOwnerOrAdmin(card.userId, req.user)) {
            return res.status(403).json({ success: false, error: 'Not authorized to update this card' });
        }

        const isOwner = card.userId.toString() === req.user._id.toString();
        const isAdminAction = req.user.role === 'admin' && !isOwner;
        const isSelfAction = isOwner && req.user.role !== 'admin';

        if (isSelfAction && status !== 'closed') {
            return res.status(403).json({
                success: false,
                error: 'Please use lock/unlock request. Bank admin approval is required.'
            });
        }

        if (!isAdminAction && status === 'blocked') {
            return res.status(403).json({ success: false, error: 'Only bank admin can block cards' });
        }

        if (!isAdminAction && card.status === 'blocked' && status !== 'blocked') {
            return res.status(403).json({ success: false, error: 'This card is blocked by bank. Please contact bank support.' });
        }

        if (card.status === 'closed' && status !== 'closed') {
            return res.status(400).json({ success: false, error: 'Closed cards cannot be reopened' });
        }

        const previousStatus = card.status;
        card.status = status;
        if (card.statusRequest?.status === 'pending') {
            card.statusRequest.status = 'rejected';
            card.statusRequest.reviewedBy = req.user._id;
            card.statusRequest.reviewedAt = new Date();
        }
        await card.save();

        if (isAdminAction && previousStatus !== status) {
            await logAdminAction(req, {
                action: 'card_status_updated',
                targetType: 'card',
                targetId: String(card._id),
                metadata: {
                    userId: String(card.userId),
                    previousStatus,
                    nextStatus: status
                }
            });
        }

        const notifyTitle = isAdminAction && status === 'blocked'
            ? 'Card Blocked by Bank'
            : isAdminAction && previousStatus === 'blocked' && status === 'active'
                ? 'Card Unblocked by Bank'
                : 'Card Status Updated';
        const notifyMessage = isAdminAction && status === 'blocked'
            ? `Your card ending with ${String(card.cardNumber || '').slice(-4)} has been blocked by bank admin. Please contact bank support.`
            : isAdminAction && previousStatus === 'blocked' && status === 'active'
                ? `Your card ending with ${String(card.cardNumber || '').slice(-4)} has been unblocked by bank admin.`
                : `Card ending with ${String(card.cardNumber || '').slice(-4)} is now ${status}.`;

        await createInAppNotification({
            userId: card.userId,
            type: status === 'blocked' || status === 'lost' ? 'card_blocked' : 'account_update',
            title: notifyTitle,
            message: notifyMessage,
            priority: status === 'blocked' || status === 'lost' ? 'high' : 'medium',
            relatedId: card._id,
            relatedModel: 'Card',
            metadata: {
                category: 'card',
                actorId: req.user._id,
                actorRole: req.user.role,
                previousStatus
            }
        });

        res.status(200).json({ success: true, message: `Card status updated to ${status}` });
    } catch (error) {
        console.error('Update card status error:', error);
        res.status(500).json({ success: false, error: 'Server error updating card status' });
    }
};

const requestCardStatusChange = async (req, res) => {
    try {
        const cardId = req.params.id;
        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: 'Not authorized to request status change for this card' });
        }

        if (['lost', 'expired', 'closed'].includes(card.status)) {
            return res.status(400).json({ success: false, error: 'This card status cannot be changed.' });
        }

        if (card.status === 'blocked') {
            return res.status(400).json({ success: false, error: 'This card is blocked by bank. Please contact support.' });
        }

        const requestedStatus = card.status === 'active' ? 'inactive' : 'active';
        const isPendingSameRequest = (
            card.statusRequest?.status === 'pending'
            && card.statusRequest?.requestedStatus === requestedStatus
        );
        if (isPendingSameRequest) {
            return res.status(200).json({
                success: true,
                message: 'Your request is already pending bank review.'
            });
        }

        card.statusRequest = {
            requestedStatus,
            status: 'pending',
            requestedBy: req.user._id,
            requestedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null
        };
        await card.save();

        const requestAction = requestedStatus === 'inactive' ? 'lock' : 'unlock';
        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'Card Request Submitted',
            message: `Your ${requestAction} request for card ending with ${String(card.cardNumber || '').slice(-4)} is under review. Bank team will review it shortly.`,
            priority: 'medium',
            relatedId: card._id,
            relatedModel: 'Card',
            metadata: { category: 'card', requestedStatus }
        });

        return res.status(200).json({
            success: true,
            message: 'Request submitted successfully. Bank will review your card status change request.'
        });
    } catch (error) {
        console.error('Request card status change error:', error);
        return res.status(500).json({ success: false, error: 'Server error requesting card status change' });
    }
};

const reviewCardStatusRequest = async (req, res) => {
    try {
        const cardId = req.params.id;
        const action = String(req.body?.action || '').toLowerCase();
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Action must be either approve or reject' });
        }

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

        if (card.statusRequest?.status !== 'pending' || !card.statusRequest?.requestedStatus) {
            return res.status(400).json({ success: false, error: 'No pending request found for this card' });
        }

        const previousStatus = card.status;
        const requestedStatus = card.statusRequest.requestedStatus;
        const isApprove = action === 'approve';

        if (isApprove) {
            card.status = requestedStatus;
            card.statusRequest.status = 'approved';
        } else {
            card.statusRequest.status = 'rejected';
        }

        card.statusRequest.reviewedBy = req.user._id;
        card.statusRequest.reviewedAt = new Date();
        await card.save();

        await logAdminAction(req, {
            action: 'card_status_request_reviewed',
            targetType: 'card',
            targetId: String(card._id),
            metadata: {
                userId: String(card.userId),
                previousStatus,
                requestedStatus,
                decision: action
            }
        });

        await createInAppNotification({
            userId: card.userId,
            type: 'account_update',
            title: isApprove ? 'Card Request Approved' : 'Card Request Rejected',
            message: isApprove
                ? `Your request has been approved. Card ending with ${String(card.cardNumber || '').slice(-4)} is now ${requestedStatus}.`
                : `Your card status request for card ending with ${String(card.cardNumber || '').slice(-4)} was reviewed and rejected by bank admin.`,
            priority: 'medium',
            relatedId: card._id,
            relatedModel: 'Card',
            metadata: {
                category: 'card',
                previousStatus,
                requestedStatus,
                decision: action
            }
        });

        return res.status(200).json({
            success: true,
            message: isApprove
                ? `Card request approved. Status updated to ${requestedStatus}.`
                : 'Card request rejected.'
        });
    } catch (error) {
        console.error('Review card status request error:', error);
        return res.status(500).json({ success: false, error: 'Server error reviewing card request' });
    }
};

const getUserCardsAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to access this route' });
        }

        const cards = await Card.find({ userId: req.params.id, status: { $ne: 'closed' } })
            .select('-pin -cvvEncrypted -cvvIv -cvvTag')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: cards });
    } catch (error) {
        console.error('Get admin user cards error:', error);
        res.status(500).json({ success: false, error: 'Server error getting user cards' });
    }
};

const revealCardCvv = async (req, res) => {
    try {
        const cardId = req.params.id;
        const { pin } = req.body || {};

        if (!pin || !/^\d{4}$/.test(String(pin))) {
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

        if (card.userId.toString() !== req.user._id.toString()) {
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
    getUserCardsAdmin,
    createCard,
    updateCardPin,
    updateCardStatus,
    requestCardStatusChange,
    reviewCardStatusRequest,
    revealCardCvv
};
