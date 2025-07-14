const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['import', 'export'],
    required: true
  },
  importPrice: {
    type: Number,
    required: function() {
      return this.type === 'import';
    }
  },
  expiryDate: {
    type: Date,
    required: function() {
      return this.type === 'import';
    }
  },
  supplier: {
    type: String,
    required: function() {
      return this.type === 'import';
    }
  },
  unit: {
    type: String,
    required: true
  },
  note: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Tạo index để tìm kiếm nhanh
inventorySchema.index({ product: 1, createdAt: -1 });

// Tạo model
const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
