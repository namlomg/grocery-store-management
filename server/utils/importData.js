const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const products = require('../data/products');
const orders = require('../data/orders');
const getUsers = require('../data/users');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await Product.deleteMany();
    await Order.deleteMany();
    await User.deleteMany();
    console.log('Đã xóa dữ liệu cũ'.red.inverse);

    // Import users
    const users = await getUsers();
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} người dùng đã được thêm vào cơ sở dữ liệu`.green.inverse);

    // Import products
    const createdProducts = await Product.insertMany(products);
    console.log(`${createdProducts.length} sản phẩm đã được thêm vào cơ sở dữ liệu`.green.inverse);
    
    // Import orders
    // First, we need to replace product names with actual product IDs
    const productMap = {};
    createdProducts.forEach(product => {
      productMap[product.name] = product._id;
    });
    
    // Get staff user IDs for orders
    const staffUsers = createdUsers.filter(user => !user.isAdmin);
    
    // Update order items with product IDs and assign staff
    const ordersWithReferences = await Promise.all(orders.map(async (order, index) => {
      // Map product names to product IDs and include product name in each item
      const items = order.items.map(item => {
        const productId = productMap[item.product];
        if (!productId) {
          console.warn(`Không tìm thấy sản phẩm: ${item.product}`);
        }
        return {
          ...item,
          product: productId || item.product,
          name: item.name || item.product // Đảm bảo có trường name
        };
      });
      
      // Assign staff in a round-robin fashion
      const staffIndex = index % staffUsers.length;
      const staff = staffUsers[staffIndex]._id;
      
      // Create a new order object with the staff ID
      const orderData = { 
        ...order,
        items,
        staff,
        createdAt: new Date(order.createdAt), // Đảm bảo kiểu Date
        updatedAt: new Date()
      };
      
      // Remove any undefined fields
      Object.keys(orderData).forEach(key => {
        if (orderData[key] === undefined) {
          delete orderData[key];
        }
      });
      
      return orderData;
    }));
    
    console.log('Đang thêm đơn hàng vào cơ sở dữ liệu...');
    console.log('Số lượng đơn hàng sẽ được thêm:', ordersWithReferences.length);
    
    const createdOrders = [];
    
    // Thêm từng đơn hàng một để dễ dàng xác định lỗi
    for (let i = 0; i < ordersWithReferences.length; i++) {
      const order = ordersWithReferences[i];
      console.log(`\nĐang thêm đơn hàng ${i + 1}/${ordersWithReferences.length}:`, order.orderNumber);
      
      try {
        // Log thông tin đơn hàng trước khi tạo
        console.log('Chi tiết đơn hàng:', {
          orderNumber: order.orderNumber,
          itemsCount: order.items.length,
          total: order.total,
          paymentMethod: order.paymentMethod,
          status: order.status,
          staff: order.staff
        });
        
        // Tạo đơn hàng
        const createdOrder = await Order.create(order);
        createdOrders.push(createdOrder);
        console.log(`✅ Đã thêm đơn hàng ${order.orderNumber} thành công`);
      } catch (error) {
        console.error('❌ Lỗi khi thêm đơn hàng:', error.message);
        console.error('Chi tiết lỗi:', error);
        console.error('Đơn hàng lỗi:', JSON.stringify(order, null, 2));
        
        // Log thêm thông tin về lỗi validation nếu có
        if (error.name === 'ValidationError') {
          console.error('Lỗi validation:', Object.values(error.errors).map(e => e.message).join(', '));
        }
        
        throw error; // Dừng quá trình import nếu có lỗi
      }
    }
    console.log(`${createdOrders.length} đơn hàng đã được thêm vào cơ sở dữ liệu`.green.inverse);
    
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await Product.deleteMany();
    console.log('Đã xóa tất cả dữ liệu'.red.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Sử dụng: node importData.js -i (import) hoặc -d (delete)'.yellow);
  process.exit(1);
}
