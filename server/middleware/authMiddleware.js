const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực người dùng
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra token trong header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1];

      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

      // Lấy thông tin người dùng từ token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({
        success: false,
        message: 'Không được phép truy cập, token không hợp lệ'
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Không được phép truy cập, không tìm thấy token'
    });
  }
};

// Middleware kiểm tra quyền admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Không được phép truy cập, yêu cầu quyền admin'
    });
  }
};
