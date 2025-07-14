const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSalesReport, getTopSellingProducts } = require('../controllers/saleReportController');

// Lấy báo cáo bán hàng
router.get('/sales', protect, getSalesReport);

// Lấy danh sách sản phẩm bán chạy
router.get('/products/top-selling', protect, getTopSellingProducts);

module.exports = router;
