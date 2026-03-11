const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
 
router.use(protect);
router.use(apiLimiter);

const buildUserNotificationFilter = (userId, extra = {}) => ({
  userId,
  ...extra
});

const mapNotification = (notification) => ({
  id: notification._id.toString(),
  _id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  read: notification.status === 'read',
  priority: notification.priority,
  timestamp: notification.createdAt,
  createdAt: notification.createdAt
});

const markAllAsReadHandler = async (req, res) => {
  try {
    await Notification.updateMany(
      buildUserNotificationFilter(req.user._id, { status: 'unread' }),
      { status: 'read' }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error updating notifications' });
  }
};

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find(
      buildUserNotificationFilter(req.user._id, { status: { $ne: 'archived' } })
    )
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: notifications.map(mapNotification)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error fetching notifications' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const notification = await Notification.findOne({
      ...buildUserNotificationFilter(req.user._id),
      _id: req.params.id
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data: mapNotification(notification) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error fetching notification' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      { ...buildUserNotificationFilter(req.user._id), _id: req.params.id },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({
      success: true,
      data: mapNotification(notification),
      message: 'Notification marked as read'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error updating notification' });
  }
});

router.put('/read-all', markAllAsReadHandler);

router.post('/mark-all-read', markAllAsReadHandler);

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const deleted = await Notification.findOneAndDelete({
      ...buildUserNotificationFilter(req.user._id),
      _id: req.params.id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error deleting notification' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await Notification.deleteMany(buildUserNotificationFilter(req.user._id));
    return res.status(200).json({ success: true, message: 'All notifications deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error deleting notifications' });
  }
});

module.exports = router;
