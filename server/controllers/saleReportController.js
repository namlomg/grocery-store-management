const Order = require('../models/Order');
const Product = require('../models/Product');

// Lấy báo cáo bán hàng
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {
      status: 'completed',
      createdAt: {}
    };
    
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
    }
    
    // Nếu không có điều kiện ngày tháng, lấy dữ liệu 30 ngày gần nhất
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.createdAt.$gte = thirtyDaysAgo;
    }
    
    const salesReport = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orderId: '$_id'
          },
          date: { $first: '$createdAt' },
          orderId: { $first: '$orderId' },
          customer: { $first: '$customerName' },
          total: { $first: '$total' },
          status: { $first: '$status' },
          itemCount: { $sum: '$items.quantity' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          orders: {
            $push: {
              orderId: '$orderId',
              customer: '$customer',
              total: '$total',
              status: '$status',
              itemCount: '$itemCount',
              date: '$date'
            }
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          totalItems: { $sum: '$itemCount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Tính tổng doanh thu và số đơn hàng
    const summary = salesReport.reduce((acc, day) => ({
      totalRevenue: acc.totalRevenue + day.totalSales,
      totalOrders: acc.totalOrders + day.orderCount,
      totalItems: acc.totalItems + day.totalItems
    }), { totalRevenue: 0, totalOrders: 0, totalItems: 0 });
    
    res.json({
      success: true,
      data: {
        summary,
        dailyData: salesReport,
        startDate: matchStage.createdAt.$gte || null,
        endDate: matchStage.createdAt.$lte || new Date()
      }
    });
  } catch (error) {
    console.error('Error getting sales report:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy báo cáo bán hàng' });
  }
};

// Lấy báo cáo sản phẩm bán chạy
exports.getTopSellingProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const matchStage = {
      'orders.status': 'completed',
      'orders.createdAt': {}
    };
    
    if (startDate) {
      matchStage['orders.createdAt'].$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage['orders.createdAt'].$lte = end;
    }
    
    // Nếu không có điều kiện ngày tháng, lấy dữ liệu 30 ngày gần nhất
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage['orders.createdAt'].$gte = thirtyDaysAgo;
    }
    
    const topProducts = await Product.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'items.product',
          as: 'orders'
        }
      },
      { $unwind: '$orders' },
      { $unwind: '$orders.items' },
      {
        $match: {
          'orders.status': 'completed',
          'orders.createdAt': matchStage['orders.createdAt']
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          category: { $first: '$category' },
          unit: { $first: '$unit' },
          price: { $first: '$price' },
          totalSold: { $sum: '$orders.items.quantity' },
          totalRevenue: {
            $sum: {
              $multiply: ['$orders.items.price', '$orders.items.quantity']
            }
          }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error('Error getting top selling products:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm bán chạy' });
  }
};
