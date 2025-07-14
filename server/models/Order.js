const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed, // Có thể là ObjectId hoặc String
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: 'TEMP-ORDER-NUMBER' // Giá trị tạm thời
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  customerPayment: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'momo', 'banking', 'card', 'debt'],
    required: true,
    default: 'cash'
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: String,
    address: String
  },
  staff: {
    type: mongoose.Schema.Types.Mixed, // Có thể là ObjectId hoặc String
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'completed'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tạo order number tự động - chạy trước khi validate
orderSchema.pre('validate', async function(next) {
  // Chỉ tạo orderNumber nếu đang tạo mới
  if (this.isNew) {
    try {
      // Đặt giá trị tạm thời để vượt qua validation
      this.orderNumber = 'TEMP-ORDER-NUMBER';
      
      // Tìm order mới nhất
      const lastOrder = await this.constructor.findOne(
        { orderNumber: { $ne: 'TEMP-ORDER-NUMBER' } },
        {}, 
        { sort: { 'createdAt': -1 } }
      );
      
      let orderNumber = 'ORD-0001';
      
      if (lastOrder && lastOrder.orderNumber) {
        const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
        if (!isNaN(lastNumber)) {
          orderNumber = `ORD-${(lastNumber + 1).toString().padStart(4, '0')}`;
        }
      }
      
      this.orderNumber = orderNumber;
    } catch (error) {
      console.error('Lỗi khi tạo orderNumber:', error);
      // Nếu có lỗi, tạo orderNumber ngẫu nhiên
      this.orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
  
  // Đảm bảo status luôn là chữ thường
  if (this.status) {
    this.status = this.status.toLowerCase();
  }
  
  next();
});

// Tính toán tổng tiền
orderSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isNew) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.total = this.subtotal - (this.discount || 0);
    this.change = Math.max(0, (this.customerPayment || 0) - this.total);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
