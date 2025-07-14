const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getTodayRevenue,
  getLowStockProducts,
  getTopSellingProducts,
  getTotalProducts,
  getExpiringProductsCount
} = require('../controllers/reportController');

// Lấy doanh thu hôm nay
router.get('/revenue/today', protect, getTodayRevenue);

// Lấy sản phẩm tồn kho thấp
router.get('/products/low-stock', protect, getLowStockProducts);

// Lấy sản phẩm bán chạy
router.get('/products/top-selling', protect, getTopSellingProducts);

// Lấy tổng số sản phẩm
router.get('/products/total', protect, getTotalProducts);

// Lấy số sản phẩm sắp hết hạn
router.get('/products/expiring-count', protect, getExpiringProductsCount);

module.exports = router;
