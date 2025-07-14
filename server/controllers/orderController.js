const Order = require('../models/Order');
const Product = require('../models/Product');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const asyncHandler = require('express-async-handler');

// @desc    Tạo mới đơn hàng
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    discount = 0,
    customerPayment = 0,
    paymentMethod = 'CASH',
    customer = {},
    notes = ''
  } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Vui lòng thêm ít nhất một sản phẩm');
  }

  // Tính toán tổng tiền và cập nhật tồn kho
  let subtotal = 0;
  const orderItems = [];
  
  // Kiểm tra và cập nhật tồn kho
  for (const item of items) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      res.status(404);
      throw new Error(`Không tìm thấy sản phẩm với ID: ${item.product}`);
    }
    
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Số lượng sản phẩm ${product.name} không đủ`);
    }
    
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    orderItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: item.price,
      total: itemTotal
    });
    
    // Giảm số lượng tồn kho
    product.stock -= item.quantity;
    await product.save();
  }
  
  const total = subtotal - discount;
  const change = Math.max(0, customerPayment - total);
  
  // Tạo đơn hàng mới
  const orderData = {
    items: orderItems,
    subtotal,
    discount,
    total,
    customerPayment: paymentMethod === 'debt' ? 0 : customerPayment,
    change: paymentMethod === 'debt' ? 0 : change,
    paymentMethod,
    customer: {
      name: customer.name || 'Khách lẻ',
      phone: customer.phone || '',
      email: customer.email || ''
    },
    staff: req.user ? req.user.id : null,
    status: 'COMPLETED',
    notes
  };

  const order = await Order.create(orderData);

  // Nếu là thanh toán công nợ, tạo bản ghi công nợ
  if (paymentMethod === 'debt' && customer.phone) {
    try {
      // Tìm hoặc tạo khách hàng
      let customerRecord = await Customer.findOne({ phone: customer.phone });
      
      if (!customerRecord) {
        customerRecord = await Customer.create({
          name: customer.name || 'Khách lẻ',
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          createdBy: req.user ? req.user.id : null
        });
      }

      // Tạo công nợ mới
      await Debt.create({
        customerId: customerRecord._id,
        customer: customerRecord.name,
        phone: customer.phone,
        totalAmount: total,
        paidAmount: 0,
        remainingAmount: total,
        status: 'pending',
        dueDate: customer.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Mặc định 30 ngày
        orderNumber: order.orderNumber, // Thêm mã đơn hàng
        description: `Công nợ từ đơn hàng #${order.orderNumber}`,
        createdBy: req.user ? req.user.id : null
      });

      // Cập nhật tổng công nợ của khách hàng
      customerRecord.totalDebt = (customerRecord.totalDebt || 0) + total;
      await customerRecord.save();
      
    } catch (error) {
      console.error('Lỗi khi tạo công nợ:', error);
      // Không throw lỗi để không ảnh hưởng đến việc tạo đơn hàng
    }
  }
  
  res.status(201).json({
    success: true,
    data: order
  });
});

// @desc    Lấy danh sách đơn hàng
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { 
    status, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 10,
    search = ''
  } = req.query;
  
  try {
    console.log('Đang lấy danh sách đơn hàng với query:', {
      status, startDate, endDate, page, limit, search
    });
    
    // Xây dựng query
    const query = {};
    
    // Lọc theo trạng thái
    if (status) {
      query.status = status.toLowerCase();
    }
    
    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }
    
    // Tìm kiếm theo mã đơn hàng hoặc tên khách hàng
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Phân trang
    const pageNumber = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * pageLimit;
    
    // Lấy tổng số đơn hàng
    const total = await Order.countDocuments(query);
    console.log(`Tìm thấy ${total} đơn hàng phù hợp`);
    
    // Lấy danh sách đơn hàng
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();
    
    console.log(`Đã lấy được ${orders.length} đơn hàng`);
    
    // Nếu không có đơn hàng nào, trả về ngay
    if (orders.length === 0) {
      return res.json({
        success: true,
        count: 0,
        total: 0,
        totalPages: 0,
        currentPage: pageNumber,
        data: []
      });
    }
    
    // Lấy tất cả product IDs từ tất cả đơn hàng
    const productIds = [];
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.product) {
            // Nếu product là ObjectId
            if (typeof item.product === 'object' && item.product._id) {
              productIds.push(item.product._id);
            } 
            // Nếu product là string (ID)
            else if (typeof item.product === 'string') {
              productIds.push(item.product);
            }
          }
        });
      }
    });
    
    // Lấy thông tin sản phẩm nếu có
    let productMap = {};
    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } })
        .select('_id name barcode price')
        .lean();
      
      // Tạo map để tra cứu nhanh thông tin sản phẩm
      products.forEach(product => {
        productMap[product._id.toString()] = product;
      });
    }
    
    // Định dạng lại dữ liệu đơn hàng
    const formattedOrders = orders.map(order => {
      // Định dạng lại items
      const formattedItems = order.items ? order.items.map(item => {
        let productInfo = { _id: null, name: 'Sản phẩm không xác định', barcode: 'N/A', price: 0 };
        
        // Lấy thông tin sản phẩm
        if (item.product) {
          const productId = typeof item.product === 'object' ? item.product._id.toString() : item.product.toString();
          productInfo = productMap[productId] || { 
            _id: productId, 
            name: 'Sản phẩm đã bị xóa',
            barcode: 'N/A',
            price: 0
          };
        }
        
        return {
          ...item,
          product: productInfo,
          // Đảm bảo có các trường cần thiết
          name: item.name || productInfo.name,
          price: item.price || productInfo.price || 0,
          quantity: item.quantity || 1,
          total: (item.quantity || 1) * (item.price || productInfo.price || 0)
        };
      }) : [];
      
      // Định dạng lại thông tin khách hàng
      const customerInfo = order.customer || {};
      
      // Trả về đơn hàng đã định dạng
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: formattedItems,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        total: order.total || 0,
        customerPayment: order.customerPayment || 0,
        change: order.change || 0,
        paymentMethod: order.paymentMethod || 'cash',
        customer: {
          name: customerInfo.name || 'Khách lẻ',
          phone: customerInfo.phone || '',
          address: customerInfo.address || ''
        },
        staff: order.staff || 'Không xác định',
        status: order.status || 'completed',
        notes: order.notes || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });
    
    // Gửi phản hồi
    res.json({
      success: true,
      count: formattedOrders.length,
      total,
      totalPages: Math.ceil(total / pageLimit),
      currentPage: pageNumber,
      data: formattedOrders
    });
    
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng',
      error: error.message
    });
  }
});

// @desc    Lấy thông tin chi tiết đơn hàng
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name barcode category unit')
    .lean();
  
  if (!order) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }
  
  // Đảm bảo có thông tin nhân viên
  if (!order.staff) {
    order.staff = 'Không xác định';
  }
  
  // Định dạng lại thông tin khách hàng
  const customerInfo = order.customer || {};
  
  const formattedOrder = {
    ...order,
    customer: {
      name: customerInfo.name || 'Khách lẻ',
      phone: customerInfo.phone || '',
      address: customerInfo.address || ''
    },
    // Đảm bảo có đầy đủ các trường cần thiết
    subtotal: order.subtotal || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    customerPayment: order.customerPayment || 0,
    change: order.change || 0,
    paymentMethod: order.paymentMethod || 'cash',
    status: order.status || 'completed',
    notes: order.notes || ''
  };
  
  res.json({
    success: true,
    data: formattedOrder
  });
});

// @desc    Cập nhật trạng thái đơn hàng
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)) {
    res.status(400);
    throw new Error('Trạng thái không hợp lệ');
  }
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }
  
  // Nếu hủy đơn hàng hoặc hoàn tiền, cần cộng lại tồn kho
  if ((status === 'CANCELLED' || status === 'REFUNDED') && order.status !== 'CANCELLED' && order.status !== 'REFUNDED') {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
  }
  
  order.status = status;
  await order.save();
  
  res.json({
    success: true,
    data: order
  });
});

// @desc    Lấy thống kê bán hàng
// @route   GET /api/orders/stats
// @access  Private/Admin
const getOrderStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const match = {};
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      match.createdAt.$lte = endOfDay;
    }
  }
  
  const stats = await Order.aggregate([
    { $match: { ...match, status: 'COMPLETED' } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
        totalDiscount: { $sum: '$discount' },
        totalItemsSold: { 
          $sum: { 
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalRevenue: 1,
        avgOrderValue: 1,
        totalDiscount: 1,
        totalItemsSold: 1
      }
    }
  ]);
  
  res.json({
    success: true,
    data: stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      totalDiscount: 0,
      totalItemsSold: 0
    }
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats
};
