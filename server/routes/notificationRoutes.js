const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Tất cả các route đều yêu cầu đăng nhập
router.use(protect);

// Lấy tất cả thông báo
router.get('/', getNotifications);

// Đánh dấu thông báo là đã đọc
router.put('/:id/read', markAsRead);

// Đánh dấu tất cả thông báo là đã đọc
router.put('/read-all', markAllAsRead);

// Xóa một thông báo
router.delete('/:id', deleteNotification);

// Xóa tất cả thông báo
router.delete('/', clearAllNotifications);

module.exports = router;
