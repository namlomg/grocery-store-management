import api from './api';

// Lấy tất cả thông báo
const getNotifications = async () => {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    throw error;
  }
};

// Đánh dấu thông báo là đã đọc
const markAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đánh dấu đã đọc:', error);
    throw error;
  }
};

// Đánh dấu tất cả thông báo là đã đọc
const markAllAsRead = async () => {
  try {
    const response = await api.put('/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
    throw error;
  }
};

// Xóa một thông báo
const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa thông báo:', error);
    throw error;
  }
};

// Xóa tất cả thông báo
const clearAllNotifications = async () => {
  try {
    const response = await api.delete('/notifications');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa tất cả thông báo:', error);
    throw error;
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
};
