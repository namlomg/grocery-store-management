const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function checkOrders() {
  try {
    // Kết nối tới MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/grocery-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Đã kết nối tới MongoDB');

    // Đếm số lượng đơn hàng
    const count = await Order.countDocuments({});
    console.log(`Tổng số đơn hàng: ${count}`);

    // Lấy 5 đơn hàng gần nhất
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('\n5 đơn hàng gần nhất:');
    console.log(JSON.stringify(recentOrders, null, 2));

    // Kiểm tra schema của collection
    const sampleOrder = await Order.findOne({});
    if (sampleOrder) {
      console.log('\nCấu trúc 1 đơn hàng mẫu:');
      console.log(Object.keys(sampleOrder.toObject()));
    } else {
      console.log('\nKhông có đơn hàng nào trong cơ sở dữ liệu');
    }

    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi kiểm tra đơn hàng:', error);
    process.exit(1);
  }
}

checkOrders();
