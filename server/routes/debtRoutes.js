const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDebts,
  getDebtStats,
  createDebtPayment,
  updateDebt,
  createDebt,
  getDebtById
} = require('../controllers/debtController');

// Định nghĩa các route
router.route('/')
  .get(protect, getDebts)
  .post(protect, createDebt);

router.route('/stats')
  .get(protect, getDebtStats);

router.route('/:id')
  .get(protect, getDebtById)
  .put(protect, updateDebt);

router.route('/:id/payments')
  .post(protect, createDebtPayment);

module.exports = router;
