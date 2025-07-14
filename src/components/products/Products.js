import React, { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/api';
import {
  Box,
  Button,
  Grid,
  TextField,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Pagination,
  Stack,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AttachMoney as AttachMoneyIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  QrCode2 as QrCodeIcon,
  Scale as ScaleIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as SupplierIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    barcode: '',
    unit: 'cái',
    description: '',
    images: [''],
    supplier: '',
    expiryDate: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Thực phẩm khô',
    'Đồ uống',
    'Bánh kẹo',
    'Đồ hộp',
    'Vệ sinh cá nhân',
    'Gia dụng',
  ];

  const units = ['cái', 'gói', 'chai', 'lọ', 'hộp', 'kg', 'g'];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setCurrentProduct(product);
      // Chuyển đổi từ mảng images sang state form
      const images = Array.isArray(product.images) && product.images.length > 0 
        ? [...product.images] 
        : (product.image ? [product.image] : ['']);
      
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost || '',
        barcode: product.barcode,
        unit: product.unit,
        description: product.description || '',
        images: images,
        supplier: product.supplier || '',
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
      });
    } else {
      setCurrentProduct(null);
      setFormData({
        name: '',
        category: '',
        price: '',
        cost: '',
        barcode: '',
        unit: 'cái',
        description: '',
        images: [''],
        supplier: '',
        expiryDate: ''
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleImageChange = (e, index = 0) => {
    const newImages = [...(formData.images || [])];
    newImages[index] = e.target.value;
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), '']
    }));
  };

  const removeImageField = (index) => {
    const newImages = (formData.images || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      images: newImages.length > 0 ? newImages : ['']
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }
    if (!formData.category || formData.category.trim() === '') {
      newErrors.category = 'Danh mục là bắt buộc';
    }
    if (!formData.price || isNaN(formData.price) || formData.price <= 0) {
      newErrors.price = 'Giá bán phải lớn hơn 0';
    }
    if (!formData.barcode || formData.barcode.trim() === '') {
      newErrors.barcode = 'Mã vạch là bắt buộc';
    }
    
    // Validate image URLs
    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((url, index) => {
        if (url && url.trim() !== '' && !/^https?:\/\//i.test(url)) {
          newErrors[`image_${index}`] = 'URL ảnh không hợp lệ (phải bắt đầu bằng http:// hoặc https://)';
        }
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Lọc bỏ các URL ảnh rỗng
      const validImages = formData.images.filter(url => url && url.trim() !== '');
      
      const productData = {
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        cost: Number(formData.cost) || 0,
        barcode: formData.barcode,
        unit: formData.unit,
        description: formData.description || '',
        images: validImages.length > 0 ? validImages : undefined,
        supplier: formData.supplier || undefined,
        expiryDate: formData.expiryDate || undefined,
        stock: currentProduct?.stock || 0,
      };
      
      // Xóa các trường undefined
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });

      if (currentProduct) {
        // Cập nhật sản phẩm
        const updatedProduct = await updateProduct(currentProduct._id, productData);
        setProducts(products.map(p => p._id === updatedProduct._id ? updatedProduct : p));
      } else {
        // Thêm sản phẩm mới
        const newProduct = await createProduct(productData);
        setProducts([newProduct, ...products]);
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Có lỗi xảy ra khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await deleteProduct(id);
        setProducts(products.filter(p => p._id !== id));
      } catch (err) {
        console.error('Error deleting product:', err);
        setError('Không thể xóa sản phẩm');
      }
    }
  };

  // Filter products based on search term
  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });
      
      if (response.success && response.data) {
        setProducts(Array.isArray(response.data) ? response.data : (response.data.data || []));
        setTotal(response.total || response.data.length || 0);
      } else {
        setProducts([]);
        setTotal(0);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Không thể tải danh sách sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [page, rowsPerPage, searchTerm]);

  // Lọc sản phẩm dựa trên từ khóa tìm kiếm
  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  });

  // Hiển thị loading
  if (loading && products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  // Hiển thị thông báo lỗi
  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchProducts}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Hiển thị khi không có sản phẩm
  if (products.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Chưa có sản phẩm nào
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchProducts}
          startIcon={<RefreshIcon />}
        >
          Tải lại
        </Button>
      </Box>
    );
  }

  // Hàm lấy ảnh sản phẩm
  const getProductImage = (product) => {
    // Kiểm tra mảng images trước
    if (product.images && product.images.length > 0 && product.images[0]) {
      return product.images[0];
    }
    // Hoặc kiểm tra trường image cũ (để tương thích ngược)
    if (product.image) {
      return product.image;
    }
    // Nếu không có ảnh, sử dụng ảnh placeholder với tên sản phẩm hoặc ký tự đầu tiên
    const productName = (product && product.name) ? product.name : 'N';
    const firstChar = productName.trim() ? productName.trim().charAt(0).toUpperCase() : 'N';
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEEAD', 'D4A5A5', '9B97B2', 'D8A7B1', 'B6E2D3', 'FFD3B6'];
    const color = colors[Math.abs((productName || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
    return `https://via.placeholder.com/300x200/${color}/FFFFFF?text=${encodeURIComponent(firstChar)}`;
  };

  // Pagination
  const emptyRows =
    page > 0
      ? Math.max(0, (1 + page) * rowsPerPage - filteredProducts.length)
      : 0;

  // Format tiền tệ
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  // Lấy danh sách ảnh từ sản phẩm
  const productImages = products.reduce((acc, product) => {
    if (product.image) {
      acc[product._id] = product.image;
    }
    return acc;
  }, {});

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Quản lý Sản phẩm
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ minWidth: 180, height: 40 }}
          >
            Thêm sản phẩm
          </Button>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm sản phẩm hoặc mã vạch..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <Grid container spacing={3}>
          {filteredProducts
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                  elevation={2}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={getProductImage(product)}
                    alt={product.name}
                    sx={{
                      objectFit: 'contain',
                      height: 200,
                      width: '100%',
                      p: 2,
                      backgroundColor: '#f5f5f5'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getProductImage({ name: product.name });
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={product.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<CategoryIcon />}
                        sx={{ mb: 1 }}
                      />
                      <Chip
                        label={`Còn: ${product.stock} ${product.unit}`}
                        size="small"
                        color={product.stock > 0 ? 'success' : 'error'}
                        variant="outlined"
                        icon={<InventoryIcon />}
                      />
                    </Box>

                    <Typography
                      gutterBottom
                      variant="h6"
                      component="h3"
                      sx={{
                        fontWeight: 'bold',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '3em',
                      }}
                    >
                      {product.name}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AttachMoneyIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(product.price)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <QrCodeIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          {product.barcode}
                        </Typography>
                      </Box>

                      {product.expiryDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                          <Typography variant="body2" color="text.secondary">
                            HSĐ: {new Date(product.expiryDate).toLocaleDateString('vi-VN')}
                          </Typography>
                        </Box>
                      )}

                      {product.supplier && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SupplierIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {product.supplier}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(product);
                      }}
                      fullWidth
                      variant="outlined"
                      sx={{ mr: 1 }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Bạn có chắc muốn xóa sản phẩm ${product.name}?`)) {
                          handleDelete(product.id);
                        }
                      }}
                      variant="outlined"
                      fullWidth
                    >
                      Xóa
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(filteredProducts.length / rowsPerPage)}
            page={page + 1}
            onChange={(e, value) => setPage(value - 1)}
            color="primary"
            showFirstButton
            showLastButton
            sx={{ '& .MuiPagination-ul': { flexWrap: 'nowrap' } }}
          />
        </Box>

        {/* Add/Edit Product Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}>
            <DialogTitle>
              {currentProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Hình ảnh sản phẩm
                  </Typography>
                  {formData.images && formData.images.map((url, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          label={`URL ảnh ${index + 1}`}
                          value={url}
                          onChange={(e) => handleImageChange(e, index)}
                          error={!!errors[`image_${index}`]}
                          helperText={errors[`image_${index}`] || ' '}
                          margin="normal"
                        />
                        {formData.images.length > 1 && (
                          <IconButton 
                            onClick={() => removeImageField(index)}
                            color="error"
                            sx={{ mt: 2 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      {url && (
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 150,
                              objectFit: 'contain',
                              border: '1px solid #eee',
                              borderRadius: 1,
                              padding: 1,
                              backgroundColor: '#f9f9f9'
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/300x200?text=Không+tải+được+ảnh';
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  ))}
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={addImageField}
                    sx={{ mt: 1 }}
                  >
                    Thêm ảnh
                  </Button>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                  fullWidth
                  label="Tên sản phẩm *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.category}
                  required
                >
                  <InputLabel>Danh mục *</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="Danh mục *"
                  >
                    <MenuItem value="">
                      <em>Chọn danh mục</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <FormHelperText>{errors.category}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Giá bán (VND) *"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  error={!!errors.price}
                  helperText={errors.price}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Giá nhập (VND)"
                  name="cost"
                  type="number"
                  value={formData.cost}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Đơn vị tính</InputLabel>
                  <Select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    label="Đơn vị tính"
                  >
                    {units.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mã vạch *"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  error={!!errors.barcode}
                  helperText={errors.barcode}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nhà cung cấp"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SupplierIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ngày hết hạn"
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mô tả"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={currentProduct ? <EditIcon /> : <AddIcon />}
            >
              {currentProduct ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      </Paper>
    </Box>
  );
};

export default Products;
