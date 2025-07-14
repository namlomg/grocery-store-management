const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên sản phẩm'],
    trim: true,
    maxlength: [100, 'Tên sản phẩm không được vượt quá 100 ký tự']
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá sản phẩm'],
    min: [0, 'Giá sản phẩm không được âm']
  },
  cost: {
    type: Number,
    default: 0,
    min: [0, 'Giá nhập không được âm']
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Số lượng tồn kho không được âm']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  category: {
    type: String,
    default: 'Khác'
  },
  unit: {
    type: String,
    default: 'cái',
    required: true
  },
  expiryDate: {
    type: Date
  },
  supplier: {
    type: String
  },
  batchNumber: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tạo index để tìm kiếm nhanh hơn
productSchema.index({ name: 'text', barcode: 'text', description: 'text' });

// Middleware tự động cập nhật updatedAt
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
