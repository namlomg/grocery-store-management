const Debt = require('../models/Debt');
const asyncHandler = require('express-async-handler');

// @desc    Lấy danh sách công nợ
// @route   GET /api/debts
// @access  Private
const getDebts = asyncHandler(async (req, res) => {
  const { startDate, endDate, customer, status, page = 1, limit = 10 } = req.query;
  
  // Tạo query
  let query = {};
  
  // Lọc theo ngày
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  
  // Lọc theo khách hàng
  if (customer) {
    query.customer = new RegExp(customer, 'i');
  }
  
  // Lọc theo trạng thái
  if (status) {
    query.status = status;
  }
  
  // Phân trang
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;
  
  const total = await Debt.countDocuments(query);
  const debts = await Debt.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
    
  res.json({
    success: true,
    data: debts,
    pagination: {
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      limit: pageSize
    }
  });
});

// @desc    Lấy thống kê công nợ
// @route   GET /api/debts/stats
// @access  Private
const getDebtStats = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    
    // Tổng công nợ
    const totalStats = await Debt.aggregate([
      {
        $match: { status: { $ne: 'paid' } }
      },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: '$remainingAmount' },
          totalCustomers: { $addToSet: '$customerId' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalDebt: 1,
          totalCustomers: { $size: '$totalCustomers' },
          totalDebts: '$count'
        }
      }
    ]);
    
    // Công nợ quá hạn
    const overdueStats = await Debt.aggregate([
      {
        $match: {
          status: { $ne: 'paid' },
          dueDate: { $lt: today }
        }
      },
      {
        $group: {
          _id: null,
          overdueDebt: { $sum: '$remainingAmount' },
          overdueCustomers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          _id: 0,
          overdueDebt: 1,
          overdueCustomers: { $size: '$overdueCustomers' }
        }
      }
    ]);
    
    // Công nợ sắp đến hạn (7 ngày tới)
    const dueThisWeekStats = await Debt.aggregate([
      {
        $match: {
          status: { $ne: 'paid' },
          dueDate: { 
            $gte: today,
            $lte: sevenDaysLater
          }
        }
      },
      {
        $group: {
          _id: null,
          dueThisWeek: { $sum: '$remainingAmount' },
          dueThisWeekCustomers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          _id: 0,
          dueThisWeek: 1,
          dueThisWeekCustomers: { $size: '$dueThisWeekCustomers' }
        }
      }
    ]);
    
    // Kết hợp kết quả
    const result = {
      totalDebt: totalStats[0]?.totalDebt || 0,
      totalCustomers: totalStats[0]?.totalCustomers || 0,
      overdueDebt: overdueStats[0]?.overdueDebt || 0,
      overdueCustomers: overdueStats[0]?.overdueCustomers || 0,
      dueThisWeek: dueThisWeekStats[0]?.dueThisWeek || 0,
      dueThisWeekCustomers: dueThisWeekStats[0]?.dueThisWeekCustomers || 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getDebtStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê công nợ',
      error: error.message
    });
  }
});

// @desc    Tạo thanh toán công nợ
// @route   POST /api/debts/:id/payments
// @access  Private
const createDebtPayment = asyncHandler(async (req, res) => {
  try {
    const { amount, paymentMethod = 'CASH', note = '' } = req.body;
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      res.status(404);
      throw new Error('Không tìm thấy công nợ');
    }

    if (amount <= 0) {
      res.status(400);
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
    }

    if (amount > debt.remainingAmount) {
      res.status(400);
      throw new Error('Số tiền thanh toán không được vượt quá số tiền còn nợ');
    }

    // Tạo bản ghi thanh toán
    const payment = {
      amount,
      paymentMethod,
      note,
      paidAt: new Date(),
      receivedBy: req.user ? req.user.id : null
    };

    // Cập nhật công nợ
    debt.payments = debt.payments || [];
    debt.payments.push(payment);
    debt.paidAmount = (debt.paidAmount || 0) + amount;
    debt.remainingAmount = debt.totalAmount - debt.paidAmount;
    debt.status = debt.remainingAmount <= 0 ? 'paid' : 'partial';

    await debt.save();

    res.status(201).json({
      success: true,
      data: debt
    });
  } catch (error) {
    console.error('Error creating debt payment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thanh toán công nợ',
      error: error.message
    });
  }
});

// @desc    Cập nhật thông tin công nợ
// @route   PUT /api/debts/:id
// @access  Private
const updateDebt = asyncHandler(async (req, res) => {
  try {
    const { dueDate, status, description } = req.body;
    const updates = {};

    if (dueDate) updates.dueDate = dueDate;
    if (status) updates.status = status;
    if (description) updates.description = description;

    const debt = await Debt.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!debt) {
      res.status(404);
      throw new Error('Không tìm thấy công nợ');
    }

    res.json({
      success: true,
      data: debt
    });
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật công nợ',
      error: error.message
    });
  }
});

// @desc    Tạo công nợ mới
// @route   POST /api/debts
// @access  Private
const createDebt = asyncHandler(async (req, res) => {
  try {
    const { 
      customerId, 
      customerName, 
      phone, 
      totalAmount, 
      dueDate, 
      description = '' 
    } = req.body;

    if (!customerId || !customerName || !phone || !totalAmount) {
      res.status(400);
      throw new Error('Vui lòng cung cấp đầy đủ thông tin công nợ');
    }

    const debt = await Debt.create({
      customerId,
      customer: customerName,
      phone,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'pending',
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Mặc định 30 ngày
      description,
      createdBy: req.user ? req.user.id : null
    });

    res.status(201).json({
      success: true,
      data: debt
    });
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo công nợ mới',
      error: error.message
    });
  }
});

// @desc    Lấy chi tiết công nợ
// @route   GET /api/debts/:id
// @access  Private
const getDebtById = asyncHandler(async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      res.status(404);
      throw new Error('Không tìm thấy công nợ');
    }

    res.json({
      success: true,
      data: debt
    });
  } catch (error) {
    console.error('Error getting debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin công nợ',
      error: error.message
    });
  }
});

module.exports = {
  getDebts,
  getDebtStats,
  createDebtPayment,
  updateDebt,
  createDebt,
  getDebtById
};
