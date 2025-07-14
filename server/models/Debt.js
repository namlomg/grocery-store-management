const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  description: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Tự động tính remainingAmount trước khi lưu
debtSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  // Cập nhật trạng thái dựa trên số tiền đã thanh toán
  if (this.paidAmount === 0) {
    this.status = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  } else {
    this.status = 'partial';
  }
  
  next();
});

const Debt = mongoose.model('Debt', debtSchema);

module.exports = Debt;
