// backend/models/notificationModel.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  // We'll use a type to handle different kinds of notifications
  type: {
    type: String,
    enum: ['deadline_alert','deadline_reminder', 'board_action',"board_invite","task_assignment"],
    required: true,
  },
  // The user who the notification is for
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Optional link to the relevant board or task
  link: {
    type: String,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);