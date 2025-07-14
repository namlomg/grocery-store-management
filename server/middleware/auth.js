const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Middleware xác thực người dùng
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Kiểm tra xem có header Authorization không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Không tìm thấy token xác thực'
        });
      }
      
      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Lấy thông tin người dùng từ token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Không tìm thấy người dùng tương ứng với token này'
        });
      }
      
      // Kiểm tra tài khoản có bị vô hiệu hóa không
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }
      
      // Gán thông tin người dùng vào request
      req.user = user;
      next();
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ',
          error: error.message
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token đã hết hạn, vui lòng đăng nhập lại',
          expiredAt: error.expiredAt
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Không được phép truy cập, vui lòng đăng nhập lại',
        error: error.message
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để truy cập tài nguyên này',
      solution: 'Thêm header Authorization: Bearer <token> vào yêu cầu'
    });
  }
});

// Middleware kiểm tra quyền admin
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error('Không có quyền truy cập, yêu cầu quyền admin');
  }
};

module.exports = { protect, admin };
