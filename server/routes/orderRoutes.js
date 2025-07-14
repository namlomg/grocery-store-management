const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

// Public routes (if any)

// Protected routes (require authentication)
router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/stats', getOrderStats);
router.get('/:id', getOrderById);

// Admin routes (require admin role)
router.use(admin);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
