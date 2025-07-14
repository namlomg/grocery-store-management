import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  getProducts,
  importInventory,
  exportInventory,
  getInventoryHistory,
  createProduct,
} from '../../services/api';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Pagination,
  Stack,
  Divider,
  Chip
} from '@mui/material';
import {
  // Icons
  QrCode as QrCodeIcon,
  AttachMoney as AttachMoneyIcon,
  Scale as ScaleIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  Input as InputIcon,
  Output as OutputIcon,
  ArrowUpward as ImportIcon,
  ArrowDownward as ExportIcon
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [inventoryAction, setInventoryAction] = useState('import');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // State cho dialog lịch sử
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importPrice, setImportPrice] = useState('');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [errors, setErrors] = useState({});

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

  const handleOpenDialog = (action, product = null) => {
    setInventoryAction(action);
    setSelectedProduct(product || {
      _id: 'new',
      name: '',
      cost: 0,
      price: 0,
      stock: 0,
      unit: 'cái',
      supplier: '',
      barcode: ''
    });
    setQuantity('');
    setNote('');
    setImportPrice(product?.cost?.toString() || '');
    setPrice(product?.price?.toString() || '');
    setExpiryDate(product?.expiryDate ? format(new Date(product.expiryDate), 'yyyy-MM-dd') : '');
    setSupplier(product?.supplier || '');
    setUnit(product?.unit || 'cái');
    setBatchNumber('');
    setBarcode('');
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
    setQuantity('');
    setExpiryDate('');
    setImportPrice('');
    setPrice('');
    setSupplier('');
    setNote('');
  };

  // Mở dialog lịch sử và tải dữ liệu
  const handleOpenHistoryDialog = async (product) => {
    try {
      setHistoryLoading(true);
      setHistoryDialogOpen(true);
      
      // Gọi API để lấy lịch sử nhập/xuất
      const response = await getInventoryHistory(product._id);
      setHistoryData(response.data.docs || []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử:', error);
      setSnackbar({
        open: true,
        message: 'Không thể tải lịch sử nhập/xuất',
        severity: 'error'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Đóng dialog lịch sử
  const handleCloseHistoryDialog = () => {
    setHistoryDialogOpen(false);
    setHistoryData([]);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate sản phẩm
    if (!selectedProduct) {
      newErrors.product = 'Vui lòng chọn sản phẩm';
    }
    
    // Validate số lượng
    if (!quantity) {
      newErrors.quantity = 'Số lượng là bắt buộc';
    } else if (isNaN(quantity) || parseFloat(quantity) <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    }
    
    // Validate giá nhập (chỉ khi nhập kho)
    if (inventoryAction === 'import') {
      if (!expiryDate) {
      }
      if (!price || parseFloat(price) < 0) {
        newErrors.price = 'Vui lòng nhập giá bán hợp lệ';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Tạo đối tượng dữ liệu sản phẩm mới nếu cần
      const productData = {
        name: selectedProduct.name,
        cost: parseFloat(importPrice),
        price: parseFloat(price),
        unit: unit,
        supplier: supplier,
        barcode: barcode || undefined,
        stock: parseFloat(quantity),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        batchNumber: batchNumber || undefined
      };

      const data = {
        quantity: parseFloat(quantity),
        note: note || undefined,
        batchNumber: batchNumber || undefined,
        ...(inventoryAction === 'import' && {
          importPrice: parseFloat(importPrice),
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
          supplier: supplier,
          unit: unit,
          cost: parseFloat(importPrice),
          price: parseFloat(price),
          barcode: barcode || undefined,
          name: selectedProduct.name,
          isNewProduct: selectedProduct._id === 'new' // Đánh dấu đây là sản phẩm mới
        })
      };

      let response;
      if (inventoryAction === 'import') {
        // Nếu là sản phẩm mới, gửi yêu cầu tạo sản phẩm trước
        if (selectedProduct._id === 'new') {
          const newProduct = await createProduct(productData);
          response = await importInventory(newProduct._id, data);
          response.isNewProduct = true;
          response.newProduct = newProduct;
        } else {
          response = await importInventory(selectedProduct._id, data);
        }
        
        // Nếu có sản phẩm mới được tạo, thêm vào danh sách
        if (response.isNewProduct && response.newProduct) {
          setProducts(prevProducts => [response.newProduct, ...prevProducts]);
        }
      } else {
        response = await exportInventory(selectedProduct._id, data);
      }

      // Làm mới danh sách sản phẩm
      await fetchProducts();
      
      setSnackbar({ 
        open: true, 
        message: response.message || `${inventoryAction === 'import' ? 'Nhập' : 'Xuất'} kho thành công`, 
        severity: 'success' 
      });
      handleCloseDialog();
    } catch (err) {
      console.error(`Lỗi khi ${inventoryAction === 'import' ? 'nhập' : 'xuất'} kho:`, err);
      const errorMessage = err.response?.data?.message || err.message;
      
      // Xử lý lỗi cụ thể
      let displayMessage = `Lỗi khi ${inventoryAction === 'import' ? 'nhập' : 'xuất'} kho`;
      
      if (errorMessage.includes('Số lượng tồn kho không đủ')) {
        displayMessage = 'Số lượng tồn kho không đủ cho giao dịch này';
      } else if (errorMessage.includes('Không tìm thấy lô hàng')) {
        displayMessage = 'Không tìm thấy lô hàng này trong kho';
      } else if (errorMessage) {
        displayMessage += `: ${errorMessage}`;
      }
      
      setSnackbar({
        open: true,
        message: displayMessage,
        severity: 'error',
        action: errorMessage.includes('Số lượng tồn kho') ? (
          <Button color="inherit" size="small" onClick={() => {
            // Xem chi tiết tồn kho
            // Có thể thêm chức năng xem chi tiết tồn kho ở đây
          }}>
            Kiểm tra tồn kho
          </Button>
        ) : null
      });
    }
  };

  // Lấy danh sách sản phẩm từ API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts({ 
        withStock: true,
        include: 'inventory'
      });
      
      // Xử lý dữ liệu trả về
      const productsWithStock = response.data.map(product => ({
        ...product,
        // Đảm bảo stock luôn là số
        stock: Number(product.stock) || 0,
        // Định dạng lại ngày hết hạn nếu có
        expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
        // Thêm thông tin lô hàng nếu có
        batchInfo: product.batchNumber ? `Lô: ${product.batchNumber}` : ''
      }));
      
      setProducts(productsWithStock || []);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
      setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      setSnackbar({
        open: true,
        message: 'Lỗi khi tải danh sách sản phẩm',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi component được mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Lọc sản phẩm dựa trên từ khóa tìm kiếm
  const filteredProducts = products.filter(product => {
    if (!product) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      product.name?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.supplier?.toLowerCase().includes(searchLower) ||
      product.batchNumber?.toLowerCase().includes(searchLower) ||
      product.unit?.toLowerCase().includes(searchLower)
    );
    
    // Lọc sản phẩm có số lượng tồn kho thấp nếu cần
    const hasLowStock = product.stock !== undefined && product.stock < 10; // Ví dụ: cảnh báo khi dưới 10 sản phẩm
    
    return searchTerm ? matchesSearch : true;
  });

  // Render danh sách sản phẩm
  const renderProducts = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box p={3} textAlign="center">
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <Box p={3} textAlign="center">
          <Typography>Không tìm thấy sản phẩm nào</Typography>
        </Box>
      );
    }

    // Hàm kiểm tra sắp hết hạn (còn dưới 30 ngày)
    const isExpiringSoon = (expiryDate) => {
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      const today = new Date();
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    };

    // Hàm kiểm tra đã hết hạn
    const isExpired = (expiryDate) => {
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      const today = new Date();
      return expiry < today;
    };

    return (
      <Grid container spacing={3}>
        {filteredProducts
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((product) => {
            const expiringSoon = isExpiringSoon(product.expiryDate);
            const expired = isExpired(product.expiryDate);
            const lowStock = product.stock !== undefined && product.stock < 10;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                <Card 
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: expired ? '4px solid #f44336' : 
                              expiringSoon ? '4px solid #ff9800' : 
                              lowStock ? '4px solid #ffeb3b' : '4px solid #4caf50'
                  }}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={product.images?.[0] || '/placeholder-product.png'}
                    alt={product.name}
                    sx={{ objectFit: 'contain', backgroundColor: '#f5f5f5', p: 1 }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography gutterBottom variant="h6" component="div" noWrap sx={{ maxWidth: '70%' }}>
                        {product.name}
                      </Typography>
                      <Chip 
                        label={`${product.stock || 0} ${product.unit || ''}`}
                        color={product.stock > 10 ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Mã: {product.barcode || 'N/A'}
                    </Typography>
                    
                    <Box mt={1} mb={1}>
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <AttachMoneyIcon color="primary" fontSize="small" />
                        <Typography variant="h6" color="primary" ml={0.5}>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(product.price || 0)}
                        </Typography>
                        {product.cost && (
                          <Typography variant="caption" color="text.secondary" ml={1}>
                            (Giá nhập: {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(product.cost)})
                          </Typography>
                        )}
                      </Box>
                      
                      {product.supplier && (
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            NCC: {product.supplier}
                          </Typography>
                        </Box>
                      )}
                      
                      {product.expiryDate && (
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          mt={0.5}
                          sx={{
                            color: expired ? '#f44336' : expiringSoon ? '#ff9800' : 'inherit'
                          }}
                        >
                          <CalendarIcon fontSize="small" />
                          <Typography variant="caption" ml={0.5}>
                            HSD: {new Date(product.expiryDate).toLocaleDateString()}
                            {expired && ' (Đã hết hạn)'}
                            {expiringSoon && !expired && ' (Sắp hết hạn)'}
                          </Typography>
                        </Box>
                      )}
                      
                      {product.batchNumber && (
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <QrCodeIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary" ml={0.5}>
                            Lô: {product.batchNumber}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<ImportIcon />}
                      onClick={() => handleOpenDialog('import', product)}
                      variant="outlined"
                      color="primary"
                    >
                      Nhập
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ExportIcon />}
                      onClick={() => handleOpenDialog('export', product)}
                      disabled={!product.stock || product.stock <= 0}
                      variant="outlined"
                      color="secondary"
                    >
                      Xuất
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleOpenHistoryDialog(product)}
                      startIcon={<HistoryIcon />}
                    >
                      Lịch sử
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
      </Grid>
    );
  };

  // Render dialog nhập/xuất kho
  const renderDialog = () => (
    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        {selectedProduct?._id === 'new' 
          ? 'Thêm sản phẩm mới & Nhập kho' 
          : inventoryAction === 'import' ? 'Nhập kho' : 'Xuất kho'}
      </DialogTitle>
      <DialogContent>
        <Box mt={2}>
          <TextField
            label="Tên sản phẩm"
            value={selectedProduct?.name || ''}
            fullWidth
            margin="normal"
            error={!!errors.name}
            helperText={errors.name}
            onChange={(e) => {
              if (selectedProduct) {
                setSelectedProduct({
                  ...selectedProduct,
                  name: e.target.value
                });
                // Xóa lỗi khi người dùng bắt đầu nhập
                if (errors.name) {
                  setErrors(prev => ({
                    ...prev,
                    name: undefined
                  }));
                }
              }
            }}
            disabled={inventoryAction === 'export'}
          />
          
          {inventoryAction === 'import' && (
            <TextField
              label="Mã vạch mới (nếu có)"
              value={barcode || ''}
              fullWidth
              margin="normal"
              onChange={(e) => setBarcode(e.target.value)}
              helperText="Để trống nếu giữ mã vạch hiện tại"
            />
          )}
          
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary" mr={1}>
              Tồn kho hiện tại:
            </Typography>
            <Chip 
              label={`${selectedProduct?.stock || 0} ${selectedProduct?.unit || 'cái'}`}
              color={selectedProduct?.stock > 10 ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
            {selectedProduct?.batchNumber && (
              <Chip 
                label={`Lô: ${selectedProduct.batchNumber}`}
                size="small"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          
          <TextField
            label={`Số lượng ${inventoryAction === 'import' ? 'nhập' : 'xuất'}`}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            fullWidth
            margin="normal"
            error={!!errors.quantity}
            helperText={errors.quantity || (inventoryAction === 'export' ? `Số lượng tối đa: ${selectedProduct?.stock || 0}` : '')}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {selectedProduct?.unit || 'cái'}
                </InputAdornment>
              ),
              inputProps: {
                min: 0.01,
                step: 0.01
              }
            }}
          />

          {inventoryAction === 'import' && (
            <>
              <TextField
                label="Giá nhập"
                type="number"
                value={importPrice}
                onChange={(e) => setImportPrice(e.target.value)}
                fullWidth
                margin="normal"
                error={!!errors.importPrice}
                helperText={errors.importPrice || 'Giá nhập mới sẽ cập nhật giá nhập của sản phẩm'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  ),
                  inputProps: {
                    min: 0,
                    step: 1000
                  }
                }}
              />

              <Box display="flex" alignItems="center" mb={1}>
                <TextField
                  label="Ngày hết hạn"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={!!errors.expiryDate}
                  helperText={errors.expiryDate || 'Ngày hết hạn của lô hàng này'}
                />
                {selectedProduct?.expiryDate && (
                  <Chip 
                    label={`HSD hiện tại: ${new Date(selectedProduct.expiryDate).toLocaleDateString()}`}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 2, mt: 2 }}
                  />
                )}
              </Box>

              <Box display="flex" alignItems="center" mb={1}>
                <TextField
                  label="Nhà cung cấp"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  fullWidth
                  margin="normal"
                  error={!!errors.supplier}
                  helperText={errors.supplier}
                />
                {selectedProduct?.supplier && !supplier && (
                  <Button 
                    size="small" 
                    onClick={() => setSupplier(selectedProduct.supplier)}
                    sx={{ ml: 1, mt: 2 }}
                  >
                    Dùng NCC cũ
                  </Button>
                )}
              </Box>

              <FormControl fullWidth margin="normal" error={!!errors.unit}>
                <InputLabel>Đơn vị tính</InputLabel>
                <Select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  label="Đơn vị tính"
                >
                  <MenuItem value="cái">Cái</MenuItem>
                  <MenuItem value="gói">Gói</MenuItem>
                  <MenuItem value="chai">Chai</MenuItem>
                  <MenuItem value="lon">Lon</MenuItem>
                  <MenuItem value="kg">Kg</MenuItem>
                  <MenuItem value="g">Gram</MenuItem>
                  <MenuItem value="lít">Lít</MenuItem>
                  <MenuItem value="ml">Ml</MenuItem>
                </Select>
                {errors.unit && <FormHelperText>{errors.unit}</FormHelperText>}
              </FormControl>

              <TextField
                label="Số lô (nếu có)"
                value={selectedProduct?.batchNumber || ''}
                fullWidth
                margin="normal"
                disabled
                helperText="Số lô sẽ được tự động tạo nếu để trống"
              />
            </>
          )}

          <TextField
            label="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            placeholder="Ví dụ: Nhập hàng từ đợt khuyến mãi tháng 7..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCloseDialog} variant="outlined">Hủy</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color={inventoryAction === 'import' ? 'primary' : 'secondary'}
          startIcon={inventoryAction === 'import' ? <ImportIcon /> : <ExportIcon />}
          size="large"
          fullWidth
        >
          {inventoryAction === 'import' ? 'Xác nhận nhập kho' : 'Xác nhận xuất kho'}
        </Button>
      </DialogActions>
    </Dialog>
  );

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
            Quản lý Tồn kho
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ImportIcon />}
              onClick={() => handleOpenDialog('import')}
            >
              Nhập kho
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ExportIcon />}
              onClick={() => handleOpenDialog('export')}
            >
              Xuất kho
            </Button>
          </Box>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm sản phẩm..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {renderProducts()}

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
      </Paper>

      {renderDialog()}

      {/* Thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dialog lịch sử nhập/xuất */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={handleCloseHistoryDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Lịch sử nhập/xuất</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Box p={2} textAlign="center">
              <Typography>Không có dữ liệu lịch sử</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ngày</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell align="right">Số lượng</TableCell>
                    <TableCell>Ghi chú</TableCell>
                    <TableCell>Người thực hiện</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.type === 'import' ? 'Nhập kho' : 'Xuất kho'}
                      </TableCell>
                      <TableCell align="right">
                        {item.quantity} {item.unit || ''}
                      </TableCell>
                      <TableCell>{item.note || 'Không có'}</TableCell>
                      <TableCell>
                        {item.createdBy?.name || 'Hệ thống'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog} color="primary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
