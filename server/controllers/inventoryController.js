const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { createNotification } = require('./notificationController');

// Nhập kho
const importInventory = async (req, res) => {
  try {
    const { 
      quantity, 
      note, 
      importPrice, 
      expiryDate, 
      supplier, 
      unit,
      batchNumber,
      cost,
      price,
      barcode
    } = req.body;
    
    const { productId } = req.params;
    const userId = req.user._id;

    // Kiểm tra số lượng hợp lệ
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số lượng nhập phải lớn hơn 0' 
      });
    }

    // Kiểm tra sản phẩm tồn tại
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    // Kiểm tra nếu barcode mới được cung cấp và khác với barcode hiện tại
    const isNewBarcode = barcode && barcode !== existingProduct.barcode;
    
    // Nếu có barcode mới, kiểm tra xem barcode đã tồn tại chưa
    if (isNewBarcode) {
      const existingBarcode = await Product.findOne({ barcode });
      if (existingBarcode) {
        return res.status(400).json({ 
          success: false, 
          message: 'Mã vạch đã tồn tại cho sản phẩm khác' 
        });
      }
    }
    
    // Kiểm tra nếu hạn sử dụng được cung cấp và khác với hạn sử dụng hiện tại
    const isNewExpiry = expiryDate && 
      existingProduct.expiryDate && 
      new Date(expiryDate).getTime() !== new Date(existingProduct.expiryDate).getTime();

    let productToUpdate = existingProduct;
    let isNewProduct = false;

    // Nếu có barcode mới hoặc hạn sử dụng khác, tạo sản phẩm mới
    if (isNewBarcode || isNewExpiry) {
      // Tạo sản phẩm mới với barcode mới nếu có, nếu không thì thêm hậu tố vào barcode cũ
      const newBarcode = barcode || 
        (existingProduct.barcode ? `${existingProduct.barcode}_${new Date().getTime()}` : undefined);
      
      // Tạo sản phẩm mới từ đầu, không sử dụng toObject()
      const newProductData = {
        name: existingProduct.name,
        description: existingProduct.description,
        category: existingProduct.category,
        stock: quantity,
        cost: cost || existingProduct.cost,
        price: price || existingProduct.price,
        barcode: newBarcode, // Sử dụng barcode mới đã kiểm tra
        unit: unit || existingProduct.unit,
        supplier: supplier || existingProduct.supplier,
        batchNumber: batchNumber || existingProduct.batchNumber,
        expiryDate: expiryDate || existingProduct.expiryDate,
        images: [...(existingProduct.images || [])], // Tạo mảng mới để tránh tham chiếu
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Tạo sản phẩm mới
      const newProduct = new Product(newProductData);
      await newProduct.save();
      
      productToUpdate = newProduct;
      isNewProduct = true;
    } else {
      // Nếu không phải sản phẩm mới, cập nhật số lượng tồn kho
      productToUpdate.stock = (existingProduct.stock || 0) + quantity;
      
      // Cập nhật các thông tin khác nếu cần
      if (cost && cost > 0) productToUpdate.cost = cost;
      if (price && price > 0) productToUpdate.price = price;
      if (supplier) productToUpdate.supplier = supplier;
      if (unit) productToUpdate.unit = unit;
      if (batchNumber) productToUpdate.batchNumber = batchNumber;
      if (expiryDate) productToUpdate.expiryDate = expiryDate;
      
      await productToUpdate.save();
    }

    // Tạo bản ghi nhập kho
    const inventory = await Inventory.create({
      product: productToUpdate._id,
      quantity,
      type: 'import',
      importPrice: importPrice || productToUpdate.cost,
      expiryDate: expiryDate || productToUpdate.expiryDate,
      supplier: supplier || productToUpdate.supplier,
      unit: unit || productToUpdate.unit,
      batchNumber: batchNumber || productToUpdate.batchNumber,
      note,
      createdBy: userId
    });

    // Tạo thông báo nhập kho
    await createNotification(userId, {
      type: 'inventory_update',
      title: 'Nhập kho thành công',
      message: `Đã nhập ${quantity} ${unit || ''} ${productToUpdate.name} vào kho`,
      product: productToUpdate._id,
      metadata: {
        inventoryId: inventory._id,
        action: 'import',
        quantity,
        newStock: productToUpdate.stock
      }
    });

    // Kiểm tra và tạo cảnh báo nếu số lượng tồn kho thấp
    if (productToUpdate.stock <= (productToUpdate.lowStockThreshold || 10)) {
      await createNotification(userId, {
        type: 'low_stock',
        title: 'Cảnh báo tồn kho thấp',
        message: `${productToUpdate.name} sắp hết hàng. Số lượng tồn: ${productToUpdate.stock} ${unit || ''}`,
        product: productToUpdate._id,
        metadata: {
          currentStock: productToUpdate.stock,
          threshold: productToUpdate.lowStockThreshold || 10
        }
      });
    }

    // Kiểm tra và tạo cảnh báo nếu gần hết hạn (trong vòng 30 ngày)
    if (productToUpdate.expiryDate) {
      const expiryDate = new Date(productToUpdate.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        // Đã hết hạn
        await createNotification(userId, {
          type: 'expired',
          title: 'Sản phẩm đã hết hạn',
          message: `${productToUpdate.name} đã hết hạn sử dụng từ ${Math.abs(daysUntilExpiry)} ngày trước`,
          product: productToUpdate._id,
          metadata: {
            expiryDate: productToUpdate.expiryDate,
            daysOverdue: Math.abs(daysUntilExpiry)
          }
        });
      } else if (daysUntilExpiry <= 30) {
        // Sắp hết hạn (trong vòng 30 ngày)
        await createNotification(userId, {
          type: 'expiring_soon',
          title: 'Sản phẩm sắp hết hạn',
          message: `${productToUpdate.name} sẽ hết hạn trong ${daysUntilExpiry} ngày (${expiryDate.toLocaleDateString('vi-VN')})`,
          product: productToUpdate._id,
          metadata: {
            expiryDate: productToUpdate.expiryDate,
            daysUntilExpiry
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      data: inventory,
      isNewProduct,
      newProduct: isNewProduct ? productToUpdate : null,
      message: isNewProduct ? 'Đã tạo sản phẩm mới và nhập kho thành công' : 'Nhập kho thành công',
      newStock: productToUpdate.stock
    });
  } catch (error) {
    console.error('Lỗi khi nhập kho:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi nhập kho',
      error: error.message 
    });
  }
};

// Xuất kho
const exportInventory = async (req, res) => {
  try {
    const { 
      quantity, 
      note,
      batchNumber 
    } = req.body;
    
    const { productId } = req.params;
    const userId = req.user._id;

    // Kiểm tra số lượng hợp lệ
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số lượng xuất phải lớn hơn 0' 
      });
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    // Kiểm tra số lượng tồn kho
    if ((product.stock || 0) < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Số lượng tồn kho không đủ. Hiện có: ${product.stock || 0}`,
        currentStock: product.stock || 0
      });
    }

    // Kiểm tra lô hàng nếu có yêu cầu
    if (batchNumber && product.batchNumber !== batchNumber) {
      return res.status(400).json({ 
        success: false, 
        message: `Không tìm thấy lô hàng ${batchNumber} cho sản phẩm này`
      });
    }

    // Tạo bản ghi xuất kho
    const inventory = await Inventory.create({
      product: productId,
      quantity,
      type: 'export',
      unit: product.unit,
      batchNumber: batchNumber || product.batchNumber,
      note,
      createdBy: userId
    });

    // Cập nhật số lượng tồn kho
    const newStock = Math.max(0, (product.stock || 0) - quantity);
    await Product.findByIdAndUpdate(productId, { 
      stock: newStock 
    });

    // Tạo thông báo xuất kho
    await createNotification(userId, {
      type: 'inventory_update',
      title: 'Xuất kho thành công',
      message: `Đã xuất ${quantity} ${product.unit || ''} ${product.name} khỏi kho`,
      product: product._id,
      metadata: {
        inventoryId: inventory._id,
        action: 'export',
        quantity,
        newStock
      }
    });

    // Kiểm tra và tạo cảnh báo nếu số lượng tồn kho thấp
    if (newStock <= (product.lowStockThreshold || 10)) {
      await createNotification(userId, {
        type: 'low_stock',
        title: 'Cảnh báo tồn kho thấp',
        message: `${product.name} sắp hết hàng. Số lượng tồn: ${newStock} ${product.unit || ''}`,
        product: product._id,
        metadata: {
          currentStock: newStock,
          threshold: product.lowStockThreshold || 10
        }
      });
    }

    res.status(201).json({
      success: true,
      data: inventory,
      message: 'Xuất kho thành công',
      newStock
    });
  } catch (error) {
    console.error('Lỗi khi xuất kho:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xuất kho',
      error: error.message 
    });
  }
};

// Lấy lịch sử nhập/xuất kho
const getInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { 
      type, 
      startDate, 
      endDate, 
      batchNumber,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Xây dựng query
    const query = { product: productId };
    
    // Lọc theo loại giao dịch (nhập/xuất)
    if (type && ['import', 'export'].includes(type)) {
      query.type = type;
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
    
    // Lọc theo lô hàng nếu có
    if (batchNumber) {
      query.batchNumber = batchNumber;
    }
    
    // Tùy chọn phân trang và sắp xếp
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }, // Mới nhất lên đầu
      populate: [
        { 
          path: 'product', 
          select: 'name barcode unit',
          options: { lean: true }
        },
        { 
          path: 'createdBy', 
          select: 'name email',
          options: { lean: true }
        }
      ],
      lean: true
    };
    
    // Thực hiện truy vấn với phân trang thủ công
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Lấy tổng số bản ghi
    const total = await Inventory.countDocuments(query);
    
    // Lấy dữ liệu với phân trang
    const items = await Inventory.find(query)
      .sort(options.sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate(options.populate)
      .lean();
    
    // Tính tổng số lượng nhập/xuất
    const summary = await Inventory.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Định dạng lại kết quả summary
    const summaryResult = {
      import: { totalQuantity: 0, count: 0 },
      export: { totalQuantity: 0, count: 0 }
    };
    
    summary.forEach(item => {
      if (item._id === 'import') {
        summaryResult.import = {
          totalQuantity: item.totalQuantity,
          count: item.count
        };
      } else if (item._id === 'export') {
        summaryResult.export = {
          totalQuantity: item.totalQuantity,
          count: item.count
        };
      }
    });
    
    // Tính tồn kho hiện tại
    const currentStock = summaryResult.import.totalQuantity - summaryResult.export.totalStock;
    
    // Định dạng kết quả tương tự như paginate
    const result = {
      docs: items,
      totalDocs: total,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      pagingCounter: (parseInt(page) - 1) * parseInt(limit) + 1,
      hasPrevPage: parseInt(page) > 1,
      hasNextPage: (parseInt(page) * parseInt(limit)) < total,
      prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
      nextPage: (parseInt(page) * parseInt(limit)) < total ? parseInt(page) + 1 : null
    };
    
    res.status(200).json({
      success: true,
      data: {
        ...result,
        summary: {
          ...summaryResult,
          currentStock
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử kho:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy lịch sử kho',
      error: error.message 
    });
  }
};

// Xóa lô hàng
const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Tìm lô hàng cần xóa
    const inventoryItem = await Inventory.findById(id);
    if (!inventoryItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy lô hàng' 
      });
    }

    // Kiểm tra quyền xóa (nếu cần)
    // if (inventoryItem.user.toString() !== userId && req.user.role !== 'admin') {
    //   return res.status(403).json({ 
    //     success: false, 
    //     message: 'Không có quyền xóa lô hàng này' 
    //   });
    // }

    // Xóa lô hàng
    await inventoryItem.deleteOne();

    res.json({ 
      success: true, 
      message: 'Đã xóa lô hàng thành công' 
    });
  } catch (error) {
    console.error('Lỗi khi xóa lô hàng:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra khi xóa lô hàng',
      error: error.message 
    });
  }
};

module.exports = {
  importInventory,
  exportInventory,
  getInventoryHistory,
  deleteInventory
};
