const AdminActionLog = require('../models/AdminActionLog');

const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (Array.isArray(forwardedFor) && forwardedFor.length) {
        return String(forwardedFor[0]).trim();
    }
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return String(req.ip || req.socket?.remoteAddress || '').trim();
};

const logAdminAction = async (req, payload = {}) => {
    try {
        if (!req?.user || req.user.role !== 'admin') return;
        const action = String(payload.action || '').trim();
        const targetType = String(payload.targetType || '').trim();
        const targetId = String(payload.targetId || '').trim();

        if (!action || !targetType || !targetId) return;

        await AdminActionLog.create({
            adminId: req.user._id,
            action,
            targetType,
            targetId,
            metadata: payload.metadata || {},
            ipAddress: getClientIp(req),
            userAgent: String(req.headers['user-agent'] || '')
        });
    } catch (error) {
        console.error('Failed to write admin audit log:', error);
    }
};

module.exports = {
    logAdminAction
};
