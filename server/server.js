require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const colors = require('colors');

// Import routes
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const saleReportRoutes = require('./routes/saleReportRoutes');
const debtRoutes = require('./routes/debtRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Khởi tạo ứng dụng Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging HTTP requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Kết nối tới MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Đã kết nối tới MongoDB: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${error.message}`.red.underline.bold);
    // Thoát với lỗi
    process.exit(1);
  }
};

// Kết nối database
connectDB();

// Định nghĩa các routes API
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sale-reports', saleReportRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server đang hoạt động',
    timestamp: new Date().toISOString()
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Xử lý lỗi 404
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: 'Không tìm thấy tài nguyên' 
  });
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi máy chủ',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
  console.log(`Môi trường: ${process.env.NODE_ENV || 'development'}`);
});
