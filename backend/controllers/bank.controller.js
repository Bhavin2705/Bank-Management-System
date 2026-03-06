const Bank = require('../models/Bank');
const User = require('../models/User');
const { logAdminAction } = require('../utils/adminAudit');

const buildBankId = (name) => {
    const base = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'bank';

    return `${base}-${Date.now().toString(36)}`;
};

const normalizeBankPayload = (payload = {}) => ({
    id: payload.id ? String(payload.id).trim() : undefined,
    name: payload.name ? String(payload.name).trim() : undefined,
    bankCode: (payload.bankCode || payload.ifscPrefix)
        ? String(payload.bankCode || payload.ifscPrefix).trim().toUpperCase()
        : undefined,
    description: payload.description ? String(payload.description).trim() : undefined
});

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getBanks = async (req, res) => {
    try {
        const banks = await Bank.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: banks });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch banks' });
    }
};

exports.addBank = async (req, res) => {
    try {
        const { id, name, bankCode, description } = normalizeBankPayload(req.body);

        if (!name || !bankCode || !description) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const existingBank = await Bank.findOne({
            $or: [
                { name: new RegExp(`^${escapeRegExp(name)}$`, 'i') },
                { bankCode: new RegExp(`^${escapeRegExp(bankCode)}$`, 'i') },
                { ifscPrefix: new RegExp(`^${escapeRegExp(bankCode)}$`, 'i') }
            ]
        }).select('_id');

        if (existingBank) {
            return res.status(409).json({ success: false, error: 'Bank already exists' });
        }

        const bank = new Bank({
            id: id || buildBankId(name),
            name,
            bankCode,
            ifscPrefix: bankCode,
            description
        });
        await bank.save();

        await logAdminAction(req, {
            action: 'bank_created',
            targetType: 'bank',
            targetId: String(bank._id),
            metadata: {
                bankName: bank.name,
                bankCode: bank.bankCode
            }
        });

        res.status(201).json({ success: true, data: bank });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ success: false, error: 'Bank already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to add bank' });
    }
};

exports.updateBank = async (req, res) => {
    try {
        const payload = normalizeBankPayload(req.body);
        const updates = {};

        if (payload.name !== undefined) updates.name = payload.name;
        if (payload.bankCode !== undefined) {
            updates.bankCode = payload.bankCode;
            updates.ifscPrefix = payload.bankCode;
        }
        if (payload.description !== undefined) updates.description = payload.description;

        if (!Object.keys(updates).length) {
            return res.status(400).json({ success: false, error: 'No valid fields provided to update' });
        }

        const hasInvalidValue = Object.values(updates).some((value) => !value);
        if (hasInvalidValue) {
            return res.status(400).json({ success: false, error: 'Bank fields cannot be empty' });
        }

        const duplicateQuery = [];
        if (updates.name) {
            duplicateQuery.push({ name: new RegExp(`^${escapeRegExp(updates.name)}$`, 'i') });
        }
        if (updates.bankCode) {
            duplicateQuery.push({ bankCode: new RegExp(`^${escapeRegExp(updates.bankCode)}$`, 'i') });
            duplicateQuery.push({ ifscPrefix: new RegExp(`^${escapeRegExp(updates.bankCode)}$`, 'i') });
        }
        if (duplicateQuery.length) {
            const existingBank = await Bank.findOne({
                _id: { $ne: req.params.id },
                $or: duplicateQuery
            }).select('_id');
            if (existingBank) {
                return res.status(409).json({ success: false, error: 'Bank already exists' });
            }
        }

        const bank = await Bank.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!bank) {
            return res.status(404).json({ success: false, error: 'Bank not found' });
        }

        await logAdminAction(req, {
            action: 'bank_updated',
            targetType: 'bank',
            targetId: String(bank._id),
            metadata: {
                updates
            }
        });

        return res.status(200).json({ success: true, data: bank });
    } catch (error) {
        if (error && error.name === 'CastError') {
            return res.status(400).json({ success: false, error: 'Invalid bank ID format' });
        }
        if (error && error.code === 11000) {
            return res.status(409).json({ success: false, error: 'Bank already exists' });
        }
        return res.status(500).json({ success: false, error: 'Failed to update bank' });
    }
};

exports.deleteBank = async (req, res) => {
    try {
        const bank = await Bank.findById(req.params.id);

        if (!bank) {
            return res.status(404).json({ success: false, error: 'Bank not found' });
        }

        const bankNameRegex = new RegExp(`^${escapeRegExp(bank.name)}$`, 'i');
        const usersUsingBank = await User.countDocuments({
            'bankDetails.bankName': bankNameRegex
        });

        if (usersUsingBank > 0) {
            return res.status(409).json({
                success: false,
                error: `Cannot delete bank. It is currently used by ${usersUsingBank} user account(s).`
            });
        }

        await Bank.findByIdAndDelete(req.params.id);

        await logAdminAction(req, {
            action: 'bank_deleted',
            targetType: 'bank',
            targetId: String(bank._id),
            metadata: {
                bankName: bank.name
            }
        });

        res.status(200).json({ success: true, message: 'Bank deleted successfully' });
    } catch (error) {
        if (error && error.name === 'CastError') {
            return res.status(400).json({ success: false, error: 'Invalid bank ID format' });
        }
        res.status(500).json({ success: false, error: 'Failed to delete bank' });
    }
};
