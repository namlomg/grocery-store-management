const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getExpiringProducts,
  searchProducts
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);

// Protected routes (require authentication)
router.use(protect);

// Route tĩnh phải được đặt trước route có tham số động
router.get('/expiring', getExpiringProducts);

// Route có tham số động
router.get('/:id', getProductById);

// Admin routes (require admin role)
router.use(admin);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/stock', updateStock);

module.exports = router;
