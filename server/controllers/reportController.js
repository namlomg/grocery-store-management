const Order = require('../models/Order');
const Product = require('../models/Product');

// Lấy tổng số sản phẩm
exports.getTotalProducts = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        total: totalProducts
      }
    });
  } catch (error) {
    console.error('Error getting total products:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng số sản phẩm' });
  }
};

// Lấy số sản phẩm sắp hết hạn
exports.getExpiringProductsCount = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30; // Mặc định kiểm tra trong 30 ngày tới
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const expiringProducts = await Product.find({
      expiryDate: { 
        $gte: today,
        $lte: expiryDate 
      },
      isActive: true
    }).countDocuments();
    
    res.json({
      success: true,
      data: {
        count: expiringProducts,
        expiryDays: days
      }
    });
  } catch (error) {
    console.error('Error getting expiring products count:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy số sản phẩm sắp hết hạn' });
  }
};

// Lấy doanh thu hôm nay
exports.getTodayRevenue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      status: 'completed',
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const todayRevenue = orders.reduce((total, order) => total + order.total, 0);
    
    res.json({
      success: true,
      data: {
        revenue: todayRevenue,
        orderCount: orders.length
      }
    });
  } catch (error) {
    console.error('Error getting today revenue:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu doanh thu' });
  }
};

// Lấy sản phẩm tồn kho thấp
exports.getLowStockProducts = async (req, res) => {
  try {
    const lowStockThreshold = req.query.threshold || 10; // Ngưỡng tồn kho thấp mặc định là 10
    
    const products = await Product.find({
      stock: { $lte: lowStockThreshold },
      isActive: true
    }).sort({ stock: 1 }).limit(10);
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm tồn kho thấp' });
  }
};

// Lấy sản phẩm bán chạy
exports.getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 5, period = 'day' } = req.query;
    let startDate = new Date();
    
    // Thiết lập ngày bắt đầu tùy theo khoảng thời gian
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default: // day
        startDate.setHours(0, 0, 0, 0);
    }

    const result = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting top selling products:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm bán chạy' });
  }
};
