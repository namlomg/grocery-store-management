const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  importInventory,
  exportInventory,
  getInventoryHistory,
  deleteInventory
} = require('../controllers/inventoryController');

// Bảo vệ tất cả các route bằng middleware xác thực
router.use(protect);

// Nhập kho
router.post('/import/:productId', importInventory);

// Xuất kho
router.post('/export/:productId', exportInventory);

// Lấy lịch sử nhập/xuất kho
router.get('/history/:productId', getInventoryHistory);

// Xóa lô hàng
router.delete('/:id', deleteInventory);

module.exports = router;
