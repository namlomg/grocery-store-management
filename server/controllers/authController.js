const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  // Kiểm tra người dùng đã tồn tại chưa
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Email đã được sử dụng');
  }

  // Tạo người dùng mới
  const user = await User.create({
    name,
    email,
    password,
    phone,
    address
  });

  // Tạo token
  const token = user.getSignedJwtToken();

  res.status(201).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra email và mật khẩu
  if (!email || !password) {
    res.status(400);
    throw new Error('Vui lòng nhập email và mật khẩu');
  }

  // Kiểm tra người dùng
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Thông tin đăng nhập không chính xác');
  }

  // Kiểm tra tài khoản có bị vô hiệu hóa không
  if (!user.isActive) {
    res.status(401);
    throw new Error('Tài khoản đã bị vô hiệu hóa');
  }

  // Cập nhật lần đăng nhập cuối
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Tạo token
  const token = user.getSignedJwtToken();

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(404);
    throw new Error('Không tìm thấy thông tin người dùng');
  }

  const user = await User.findById(req.user._id).select('-password');
  
  if (!user) {
    res.status(404);
    throw new Error('Không tìm thấy thông tin người dùng');
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Quên mật khẩu
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    res.status(404);
    throw new Error('Không tìm thấy người dùng với email này');
  }

  // Tạo token đặt lại mật khẩu
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Gửi email đặt lại mật khẩu (cần triển khai)
  const resetUrl = `${req.protocol}://${req.get('host')}/resetpassword/${resetToken}`;
  const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Vui lòng truy cập vào liên kết sau để đặt lại mật khẩu: \n\n ${resetUrl}`;

  try {
    // Gửi email ở đây (cần cấu hình nodemailer hoặc dịch vụ gửi email khác)
    console.log('Reset URL:', resetUrl);
    
    res.json({ 
      success: true, 
      message: 'Email đặt lại mật khẩu đã được gửi' 
    });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Không thể gửi email đặt lại mật khẩu');
  }
});

// @desc    Đặt lại mật khẩu
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  // Mã hóa token nhận được
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  // Tìm người dùng với token và kiểm tra thời hạn
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Token không hợp lệ hoặc đã hết hạn');
  }

  // Đặt mật khẩu mới
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Tạo token mới
  const token = user.getSignedJwtToken();

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// @desc    Cập nhật thông tin người dùng
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: user
  });
});

// @desc    Cập nhật mật khẩu
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');

  // Kiểm tra mật khẩu hiện tại
  if (!(await user.matchPassword(req.body.currentPassword))) {
    res.status(401);
    throw new Error('Mật khẩu hiện tại không chính xác');
  }

  user.password = req.body.newPassword;
  await user.save();

  // Tạo token mới
  const token = user.getSignedJwtToken();

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword
};
