const Product = require('../models/Product');
const asyncHandler = require('express-async-handler');

// @desc    Lấy tất cả sản phẩm
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, sort, page = 1, limit = 10 } = req.query;
  
  // Xây dựng query
  const query = {};
  
  // Lọc theo danh mục nếu có
  if (category) {
    query.category = category;
  }
  
  // Tìm kiếm theo tên hoặc mô tả
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { barcode: search }
    ];
  }
  
  // Sắp xếp
  let sortOption = { createdAt: -1 }; // Mặc định sắp xếp theo ngày tạo mới nhất
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'name_asc') sortOption = { name: 1 };
  if (sort === 'name_desc') sortOption = { name: -1 };
  
  // Phân trang
  const startIndex = (page - 1) * limit;
  const total = await Product.countDocuments(query);
  
  const products = await Product.find(query)
    .sort(sortOption)
    .limit(limit * 1)
    .skip(startIndex);
  
  res.json({
    success: true,
    count: products.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: products
  });
});

// @desc    Lấy thông tin chi tiết sản phẩm
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }
  
  res.json({
    success: true,
    data: product
  });
});

// @desc    Tạo mới sản phẩm
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description = '',
    price,
    cost = 0,
    stock = 0,
    barcode = '',
    category = 'Khác',
    unit = 'cái',
    expiryDate,
    supplier = '',
    batchNumber = '',
    images = [],
    isActive = true
  } = req.body;
  
  // Kiểm tra sản phẩm đã tồn tại chưa
  if (barcode) {
    const productExists = await Product.findOne({ barcode });
    if (productExists) {
      res.status(400);
      throw new Error('Mã vạch đã tồn tại');
    }
  }
  
  // Kiểm tra batch number nếu có
  if (batchNumber) {
    const batchExists = await Product.findOne({ batchNumber, name });
    if (batchExists) {
      res.status(400);
      throw new Error('Đã tồn tại lô hàng này cho sản phẩm');
    }
  }
  
  const product = await Product.create({
    name,
    description,
    price,
    cost,
    stock: Math.max(0, stock), // Đảm bảo stock không âm
    barcode,
    category,
    unit,
    expiryDate: expiryDate || undefined,
    supplier,
    batchNumber: batchNumber || undefined,
    images: Array.isArray(images) ? images : [],
    isActive
  });
  
  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Cập nhật sản phẩm
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }
  
  const { barcode, batchNumber, name, stock, ...updateData } = req.body;
  
  // Kiểm tra nếu cập nhật barcode mà đã tồn tại
  if (barcode && barcode !== product.barcode) {
    const productExists = await Product.findOne({ barcode });
    if (productExists) {
      res.status(400);
      throw new Error('Mã vạch đã tồn tại');
    }
  }
  
  // Kiểm tra batch number nếu có
  if (batchNumber && (batchNumber !== product.batchNumber || name !== product.name)) {
    const batchExists = await Product.findOne({ 
      _id: { $ne: product._id },
      batchNumber,
      name: name || product.name
    });
    
    if (batchExists) {
      res.status(400);
      throw new Error('Đã tồn tại lô hàng này cho sản phẩm');
    }
  }
  
  // Cập nhật dữ liệu
  const updateFields = { ...updateData };
  if (barcode !== undefined) updateFields.barcode = barcode;
  if (batchNumber !== undefined) updateFields.batchNumber = batchNumber || null;
  if (name !== undefined) updateFields.name = name;
  if (stock !== undefined) updateFields.stock = Math.max(0, stock);
  
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );
  
  res.json({
    success: true,
    data: updatedProduct
  });
});

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }
  
  // Sử dụng deleteOne() thay vì remove()
  await Product.deleteOne({ _id: req.params.id });
  
  res.json({
    success: true,
    message: 'Đã xóa sản phẩm',
    data: {}
  });
});

// @desc    Cập nhật tồn kho
// @route   PATCH /api/products/:id/stock
// @access  Private
// @desc    Lấy danh sách sản phẩm sắp hết hạn hoặc đã hết hạn
// @route   GET /api/products/expiring
// @access  Private
const getExpiringProducts = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tìm tất cả sản phẩm có expiryDate và còn hàng
    console.log('Đang tìm sản phẩm có expiryDate và còn hàng...');
    const products = await Product.find({
      expiryDate: { $exists: true, $ne: null },
      stock: { $gt: 0 }
    }).sort({ expiryDate: 1 });
    
    console.log(`Tìm thấy ${products.length} sản phẩm có expiryDate`);
    if (products.length > 0) {
      console.log('Mẫu sản phẩm đầu tiên:', {
        name: products[0].name,
        expiryDate: products[0].expiryDate,
        stock: products[0].stock,
        _id: products[0]._id
      });
    }

    // Xử lý và lọc sản phẩm
    const processedProducts = products
      .map(product => {
        try {
          const expiryDate = product.expiryDate instanceof Date 
            ? product.expiryDate 
            : new Date(product.expiryDate);
          
          // Kiểm tra nếu không phải là ngày hợp lệ
          if (isNaN(expiryDate.getTime())) return null;
          
          // Tính số ngày còn lại đến hạn
          const diffTime = expiryDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Xác định trạng thái
          let status = 'safe';
          if (diffDays < 0) status = 'expired';
          else if (diffDays <= 7) status = 'warning';
          
          return {
            ...product.toObject(),
            id: product._id,
            name: product.name,
            batchNumber: product.batchNumber || 'N/A',
            expiryDate: expiryDate,
            productionDate: product.productionDate || null,
            quantity: product.quantity || 0,
            status,
            remainingDays: diffDays
          };
        } catch (error) {
          console.error('Lỗi khi xử lý sản phẩm:', product._id, error);
          return null;
        }
      })
      .filter(Boolean); // Lọc bỏ các sản phẩm null

    res.json({
      success: true,
      count: processedProducts.length,
      data: processedProducts
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm sắp hết hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách sản phẩm sắp hết hạn',
      error: error.message
    });
  }
});

// @desc    Cập nhật tồn kho
const updateStock = asyncHandler(async (req, res) => {
  const { quantity, type } = req.body; // type: 'increment' hoặc 'decrement'
  
  if (!['increment', 'decrement'].includes(type)) {
    res.status(400);
    throw new Error('Loại cập nhật không hợp lệ');
  }
  
  const update = type === 'increment' 
    ? { $inc: { stock: quantity } } 
    : { $inc: { stock: -quantity } };
  
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );
  
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }
  
  res.json({
    success: true,
    data: product
  });
});

// @desc    Tìm kiếm sản phẩm nhanh
// @route   GET /api/products/search
// @access  Public
const searchProducts = asyncHandler(async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm'
      });
    }
    
    const products = await Product.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { barcode: searchTerm },
        { description: { $regex: searchTerm, $options: 'i' } }
      ],
      isActive: true
    })
    .limit(parseInt(limit))
    .select('name price stock barcode image')
    .lean();
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('Lỗi khi tìm kiếm sản phẩm:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm sản phẩm',
      error: error.message
    });
  }
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getExpiringProducts,
  searchProducts
};
