const Notification = require('../models/Notification');

const MONEY_NOTIFICATION_TYPES = new Set(['transaction', 'bill_paid']);

const shouldValidateMoneyAmount = (type) => MONEY_NOTIFICATION_TYPES.has(type);

const createInAppNotification = async ({
  userId,
  type = 'other',
  title,
  message,
  priority = 'medium',
  relatedId,
  relatedModel,
  metadata = {},
  dedupe = true,
  dedupeWindowMs = 5 * 60 * 1000
}) => {
  if (!userId || !title || !message) return null;

  if (shouldValidateMoneyAmount(type)) {
    const amount = Number(metadata?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
  }

  try {
    if (dedupe) {
      const dedupeSince = new Date(Date.now() - Math.max(0, dedupeWindowMs));
      const query = {
        userId,
        type,
        title,
        message,
        status: { $ne: 'archived' },
        createdAt: { $gte: dedupeSince }
      };

      if (relatedId) {
        query.relatedId = relatedId;
      }

      const existing = await Notification.findOne(query).sort({ createdAt: -1 });
      if (existing) {
        existing.status = 'unread';
        existing.metadata = {
          ...(existing.metadata || {}),
          ...(metadata || {}),
          dedupeCount: ((existing.metadata && existing.metadata.dedupeCount) || 1) + 1
        };
        await existing.save();
        return existing;
      }
    }

    return await Notification.create({
      userId,
      type,
      title,
      message,
      priority,
      status: 'unread',
      channels: {
        inApp: true,
        email: false,
        sms: false,
        push: false
      },
      relatedId,
      relatedModel,
      metadata
    });
  } catch (error) {
    console.error('Failed to create in-app notification:', error?.message || error);
    return null;
  }
};

module.exports = {
  createInAppNotification
};
