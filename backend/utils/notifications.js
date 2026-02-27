const Notification = require('../models/Notification');

const createInAppNotification = async ({
  userId,
  type = 'other',
  title,
  message,
  priority = 'medium',
  relatedId,
  relatedModel,
  metadata = {}
}) => {
  if (!userId || !title || !message) return null;

  try {
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
