const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('product', 'name barcode')
    .lean();

  // Đếm số thông báo chưa đọc
  const unreadCount = await Notification.countDocuments({ 
    user: req.user._id, 
    read: false 
  });

  res.json({
    success: true,
    data: notifications,
    unreadCount
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error('Không tìm thấy thông báo');
  }

  // Lấy lại số lượng thông báo chưa đọc
  const unreadCount = await Notification.countDocuments({ 
    user: req.user._id, 
    read: false 
  });

  res.json({
    success: true,
    data: notification,
    unreadCount
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.json({
    success: true,
    message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    unreadCount: 0
  });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!notification) {
    res.status(404);
    throw new Error('Không tìm thấy thông báo');
  }

  // Lấy lại số lượng thông báo chưa đọc
  const unreadCount = await Notification.countDocuments({ 
    user: req.user._id, 
    read: false 
  });

  res.json({
    success: true,
    message: 'Đã xóa thông báo',
    unreadCount
  });
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications
// @access  Private
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });

  res.json({
    success: true,
    message: 'Đã xóa tất cả thông báo',
    unreadCount: 0
  });
});

// @desc    Tạo thông báo mới
// @param   {string} userId - ID người dùng nhận thông báo
// @param   {Object} notificationData - Dữ liệu thông báo
// @returns {Promise<Object>} - Thông báo đã tạo
const createNotification = async (userId, notificationData) => {
  try {
    const notification = new Notification({
      ...notificationData,
      user: userId,
      read: false
    });
    
    await notification.save();
    
    // Populate thông tin sản phẩm nếu có
    if (notification.product) {
      await notification.populate('product', 'name barcode');
    }
    
    return notification;
  } catch (error) {
    console.error('Lỗi khi tạo thông báo:', error);
    throw error; // Ném lỗi để xử lý ở tầng gọi
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createNotification
};
