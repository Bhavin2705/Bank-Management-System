const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

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

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      status: { $ne: 'archived' }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: notifications.map(mapNotification)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data: mapNotification(notification) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, status: 'unread' },
      { status: 'read' }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, status: 'unread' },
      { status: 'read' }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    return res.status(200).json({ success: true, message: 'All notifications deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
