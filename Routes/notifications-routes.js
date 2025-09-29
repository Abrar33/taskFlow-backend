// backend/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../Controller/notification-controller");
const { protect } = require("../middleware/authMiddleware"); // Your authentication middleware

// ✅ Get all notifications
router.get("/", protect, getNotifications);

// ✅ Mark a single notification as read
router.put("/:id/read", protect, markAsRead);

// ✅ Mark all notifications as read
router.put("/mark-all/read", protect, markAllAsRead);

// ✅ Delete a notification
router.delete("/:id", protect, deleteNotification);

module.exports = router;
