import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TextField,
  Button,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  LocalOffer as BarcodeIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Event as EventIcon,
  LocalShipping as LocalShippingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { getExpiringProducts, getExpiryAlerts, updateProductExpiry } from '../../services/api';
import api from '../../services/api';
import { format, isAfter, subDays, parseISO, differenceInDays, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';
import { 
  generateId, 
  getExpiryStatus, 
  calculateRemainingDaysPercentage, 
  getStatusLabel,
  formatDate
} from '../../utils/expiryUtils';

// Icons for snackbar
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

const Expiry = () => {
  const { state, dispatch } = useAppContext();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expiryData, setExpiryData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    warning: 0,
    safe: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Lấy danh sách sản phẩm sắp hết hạn
  const fetchExpiringProducts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Đang tải dữ liệu hạn sử dụng...');
      const response = await getExpiringProducts();
      console.log('Dữ liệu hạn sử dụng nhận được:', response);
      
      if (response?.success && Array.isArray(response.data)) {
        // Xử lý dữ liệu trả về
        const processedData = response.data.map(item => {
          console.log('Dữ liệu sản phẩm từ API:', {
            id: item._id || item.id,
            name: item.name,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            productionDate: item.productionDate,
            stock: item.stock,
            unit: item.unit,
            price: item.price,
            cost: item.cost,
            category: item.category,
            images: item.images
          });
          
          return {
            ...item,
            id: item._id || item.id, // Đảm bảo có trường id
            // Đảm bảo các trường bắt buộc có giá trị mặc định nếu thiếu
            name: item.name || 'Không có tên',
            batchNumber: item.batchNumber, // Giữ nguyên giá trị từ API, kể cả null/undefined
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            productionDate: item.productionDate ? new Date(item.productionDate) : null,
            stock: item.stock || 0,
            unit: item.unit || '',
            price: item.price || 0,
            cost: item.cost || 0,
            category: item.category || 'Chưa phân loại',
            images: item.images || [],
            // Tính toán trạng thái nếu chưa có
            status: item.status || getExpiryStatus(item.expiryDate)
          };
        });
        
        setExpiryData(processedData);
        
        // Tính toán thống kê
        const newStats = {
          total: processedData.length,
          expired: 0,
          warning: 0,
          safe: 0
        };
        
        processedData.forEach(item => {
          if (item.status === 'expired') newStats.expired++;
          else if (item.status === 'warning') newStats.warning++;
          else newStats.safe++;
        });
        
        console.log('Thống kê hạn sử dụng:', newStats);
        setStats(newStats);
      } else {
        console.error('Dữ liệu không hợp lệ từ máy chủ:', response);
        throw new Error(response?.message || 'Dữ liệu không hợp lệ từ máy chủ');
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu hạn sử dụng:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Không thể tải dữ liệu hạn sử dụng',
        severity: 'error'
      });
      setExpiryData([]); // Đặt lại dữ liệu trống nếu có lỗi
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Gọi API khi component mount
  useEffect(() => {
    fetchExpiringProducts();
  }, [fetchExpiringProducts]);
  
  // Lọc và phân trang dữ liệu
  const { filteredData, paginatedData } = useMemo(() => {
    // Lọc theo trạng thái
    let filteredItems = filter === 'all' 
      ? [...expiryData] 
      : expiryData.filter(item => item.status === filter);
    
    // Tìm kiếm
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name?.toLowerCase().includes(term) || 
        (item.batchNumber && item.batchNumber.toLowerCase().includes(term))
      );
    }
    
    // Phân trang
    const paginatedItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    return { 
      filteredData: filteredItems, 
      paginatedData: paginatedItems 
    };
  }, [expiryData, filter, searchTerm, page, rowsPerPage]);

  // Xử lý submit form thêm/cập nhật thông tin hạn sử dụng
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Nếu đang trong quá trình xử lý, không làm gì cả
    if (isSubmitting) return;
    
    // Validate form
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // Nếu đang cập nhật sản phẩm đã có
      if (selectedProduct?.id) {
        const response = await updateProductExpiry(selectedProduct.id, {
          expiryDate,
          batchNumber,
          quantity: parseInt(quantity, 10)
        });

        if (response.success) {
          await fetchExpiringProducts();
          setSnackbar({
            open: true,
            message: 'Cập nhật thông tin hạn sử dụng thành công',
            severity: 'success'
          });
          setOpenDialog(false);
        }
      } else {
        // Xử lý thêm mới lô hàng
        const product = state.products.find(p => p.id === selectedProduct);
        if (!product) {
          throw new Error('Không tìm thấy thông tin sản phẩm');
        }

        // Tạo lô hàng mới
        const newBatch = {
          id: generateId(),
          productId: selectedProduct,
          name: product.name,
          category: product.category,
          image: product.image,
          batchNumber: batchNumber || `LOT${String(selectedProduct).padStart(4, '0')}`,
          expiryDate: expiryDate,
          quantity: parseInt(quantity),
          remaining: parseInt(quantity),
          price: product.price,
          unit: product.unit,
          status: getExpiryStatus(expiryDate),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Gọi API để tạo mới lô hàng
        const response = await updateProductExpiry(selectedProduct, {
          ...newBatch,
          action: 'add_batch'
        });

        if (response.success) {
          await fetchExpiringProducts();
          setSnackbar({
            open: true,
            message: `Đã thêm lô hàng ${newBatch.batchNumber} thành công!`,
            severity: 'success'
          });
          setOpenDialog(false);
        }
      }
    } catch (error) {
      console.error('Lỗi khi xử lý dữ liệu hạn sử dụng:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xử lý dữ liệu',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setPage(0);
  };

  const handleOpenDialog = async (product = null) => {
    if (product) {
      try {
        setLoading(true);
        // Lấy thông tin chi tiết sản phẩm nếu cần
        setSelectedProduct(product);
        setExpiryDate(product.expiryDate || '');
        setBatchNumber(product.batchNumber || '');
        setQuantity(product.quantity || product.stock || '');
      } catch (error) {
        console.error('Lỗi khi tải thông tin sản phẩm:', error);
        setSnackbar({
          open: true,
          message: 'Không thể tải thông tin sản phẩm',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedProduct(null);
      setExpiryDate('');
      setBatchNumber('');
      setQuantity('');
    }
    setErrors({});
    setOpenDialog(true);
  };

  // Xử lý xóa lô hàng
  const handleDelete = async (id) => {
    console.log('All expiry data:', expiryData);
    console.log('Trying to delete item with id:', id);
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa lô hàng này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Tìm lô hàng cần xóa
      const itemToDelete = expiryData.find(item => item.id === id || item._id === id);
      console.log('Item to delete:', itemToDelete);
      
      if (!itemToDelete) {
        throw new Error('Không tìm thấy lô hàng');
      }

      // Lấy ID sản phẩm và ID inventory
      const productId = itemToDelete._id || itemToDelete.id;
      let inventoryId = itemToDelete.inventoryId;
      
      // Nếu không có inventoryId, thử tìm trong bảng inventory
      if (!inventoryId) {
        try {
          const inventoryResponse = await api.get(`/inventory/history/${productId}`);
          if (inventoryResponse.data && inventoryResponse.data.length > 0) {
            // Tìm inventory item tương ứng với sản phẩm
            const inventoryItem = inventoryResponse.data.find(
              item => item.product && item.product._id === productId
            );
            if (inventoryItem) {
              inventoryId = inventoryItem._id;
            }
          }
        } catch (inventoryError) {
          console.error('Lỗi khi lấy thông tin inventory:', inventoryError);
        }
      }
      
      // Xóa sản phẩm
      console.log('Đang xóa sản phẩm với ID:', productId);
      await api.delete(`/products/${productId}`);
      
      // Nếu có inventoryId, xóa cả trong bảng inventory
      if (inventoryId) {
        console.log('Đang xóa lô hàng với ID:', inventoryId);
        try {
          await api.delete(`/inventory/${inventoryId}`);
        } catch (inventoryError) {
          console.warn('Không thể xóa lô hàng trong inventory:', inventoryError);
          // Vẫn tiếp tục dù có lỗi khi xóa inventory
        }
      }
      
      // Cập nhật lại danh sách
      const updatedData = expiryData.filter(item => item.id !== id && item._id !== id);
      setExpiryData(updatedData);
      
      // Cập nhật thống kê
      updateStats(updatedData);
      
      setSnackbar({
        open: true,
        message: 'Đã xóa lô hàng thành công',
        severity: 'success'
      });
    } catch (error) {
      console.error('Lỗi khi xóa lô hàng:', error);
      console.error('Error response:', error.response?.data);
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xóa lô hàng',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    
    setOpenDialog(false);
    // Reset form sau khi đóng dialog
    setTimeout(() => {
      setSelectedProduct('');
      setExpiryDate('');
      setQuantity('');
      setBatchNumber('');
      setErrors({});
      setIsSubmitting(false);
    }, 300);
  };
  
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedProduct) {
      newErrors.product = 'Vui lòng chọn sản phẩm';
    } else if (state?.products) {
      const product = state.products.find(p => p.id === selectedProduct);
      if (!product) {
        newErrors.product = 'Không tìm thấy thông tin sản phẩm';
      }
    } else {
      newErrors.product = 'Không thể tải danh sách sản phẩm';
    }
    
    if (!expiryDate) {
      newErrors.expiryDate = 'Vui lòng chọn ngày hết hạn';
    } else {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(expiry.getTime())) {
        newErrors.expiryDate = 'Ngày không hợp lệ';
      } else if (expiry < today) {
        newErrors.expiryDate = 'Ngày hết hạn phải lớn hơn hoặc bằng ngày hiện tại';
      }
    }
    
    if (!quantity) {
      newErrors.quantity = 'Vui lòng nhập số lượng';
    } else if (isNaN(quantity) || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    } else if (parseInt(quantity) > 10000) {
      newErrors.quantity = 'Số lượng tối đa là 10.000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Hàm validateForm đã được giữ nguyên

  const getExpiryStatus = useCallback((dateString) => {
    if (!dateString) return 'safe';
    
    try {
      const expiry = new Date(dateString);
      if (isNaN(expiry.getTime())) return 'safe';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysUntilExpiry = differenceInDays(expiry, today);
      
      if (daysUntilExpiry < 0) return 'danger';
      if (daysUntilExpiry <= 30) return 'warning';
      return 'safe';
    } catch (error) {
      console.error('Lỗi khi kiểm tra hạn sử dụng:', error);
      return 'safe';
    }
  }, []);

  const getStatusLabel = useCallback((dateString) => {
    if (!dateString) {
      return { 
        label: 'Không có HSD',
        color: 'default',
        icon: <InfoIcon fontSize="small" />
      };
    }
    
    const status = getExpiryStatus(dateString);
    const expiryDate = new Date(dateString);
    
    // Kiểm tra nếu ngày không hợp lệ
    if (isNaN(expiryDate.getTime())) {
      return { 
        label: 'Ngày không hợp lệ',
        color: 'default',
        icon: <WarningIcon fontSize="small" />
      };
    }
    
    const daysLeft = differenceInDays(expiryDate, today);
    
    switch (status) {
      case 'danger':
        return { 
          label: `Hết hạn (${Math.abs(daysLeft)} ngày)`, 
          color: 'error',
          icon: <WarningIcon fontSize="small" />
        };
      case 'warning':
        return { 
          label: `Hết hạn trong ${daysLeft} ngày`, 
          color: 'warning',
          icon: <WarningIcon fontSize="small" />
        };
      default:
        return { 
          label: `Còn hạn (${daysLeft} ngày)`,
          color: 'success',
          icon: <InfoIcon fontSize="small" />
        };
    }
  }, [today]);

  // Lấy tên sản phẩm theo ID
  const getProductName = (productId) => {
    const product = state.products.find(p => p.id === productId);
    return product ? product.name : 'Sản phẩm không xác định';
  };

  // Tính số ngày còn lại đến hết hạn
  const getDaysUntilExpiry = useCallback((expiryDate) => {
    if (!expiryDate) return 'Không có thông tin';
    
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return 'Ngày không hợp lệ';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffDays = differenceInDays(expiry, today);
      
      if (diffDays < 0) {
        return `Đã hết hạn ${Math.abs(diffDays)} ngày`;
      } else if (diffDays === 0) {
        return 'Hết hạn hôm nay';
      } else if (diffDays === 1) {
        return 'Còn 1 ngày';
      } else {
        return `Còn ${diffDays} ngày`;
      }
    } catch (error) {
      console.error('Lỗi khi tính ngày hết hạn:', error);
      return 'Lỗi';
    }
  }, []);

  // Tính phần trăm ngày còn lại
  const calculateRemainingDaysPercentage = (expiryDate) => {
    if (!expiryDate) return 0;
    
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return 0;
      
      const created = subDays(expiry, 365); // Giả sử hạn sử dụng 1 năm
      const totalDays = differenceInDays(expiry, created);
      const daysPassed = differenceInDays(today, created);
      
      return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    } catch (error) {
      console.error('Lỗi khi tính phần trăm hạn sử dụng:', error);
      return 0;
    }
  };

  // Hàm cập nhật thống kê
  const updateStats = (data) => {
    const now = new Date();
    const warningThreshold = addDays(now, 30); // Cảnh báo trước 30 ngày
    
    const stats = {
      total: data.length,
      expired: 0,
      warning: 0,
      safe: 0
    };
    
    data.forEach(item => {
      if (!item.expiryDate) return;
      
      const expiryDate = new Date(item.expiryDate);
      
      if (expiryDate < now) {
        stats.expired++;
      } else if (expiryDate <= warningThreshold) {
        stats.warning++;
      } else {
        stats.safe++;
      }
    });
    
    setStats(stats);
  };

  // Lấy danh sách sản phẩm chưa có hạn sử dụng
  const availableProducts = useMemo(() => 
    state.products.filter(p => !p.expiryDate),
    [state.products]
  );

  // Tính tổng số trang
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Reset về trang đầu tiên khi bộ lọc thay đổi
  useEffect(() => {
    setPage(0);
  }, [filter, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <EventIcon color="primary" sx={{ mr: 1 }} />
            Quản lý Hạn sử dụng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý và theo dõi hạn sử dụng của các lô hàng trong kho
          </Typography>
        </Box>
        <Box>
          <Tooltip title={availableProducts.length === 0 ? 'Tất cả sản phẩm đã được thêm vào quản lý hạn sử dụng' : ''}>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                disabled={availableProducts.length === 0 || isSubmitting}
                sx={{ ml: 1 }}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Thêm lô hàng'}
                {isSubmitting && <CircularProgress size={24} sx={{ ml: 1 }} />}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              // Làm mới dữ liệu
              setSearchTerm('');
              setFilter('all');
            }}
            sx={{ ml: 1 }}
          >
            Làm mới
          </Button>
        </Box>
      </Box>
      
      {availableProducts.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tất cả sản phẩm đã được thêm vào quản lý hạn sử dụng. 
          Vui lòng thêm sản phẩm mới trước khi quản lý hạn sử dụng.
        </Alert>
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 6 }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: 3,
            '& .MuiAlert-message': { 
              display: 'flex',
              alignItems: 'center' 
            }
          }}
          iconMapping={{
            success: <CheckCircleOutlineIcon fontSize="inherit" />,
            error: <ErrorOutlineIcon fontSize="inherit" />,
            warning: <WarningAmberIcon fontSize="inherit" />,
            info: <InfoOutlinedIcon fontSize="inherit" />
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {snackbar.severity === 'success' ? 'Thành công' : 
               snackbar.severity === 'error' ? 'Lỗi' : 
               snackbar.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
            </Typography>
            {snackbar.message}
          </Box>
        </Alert>
      </Snackbar>

      {/* Thống kê nhanh */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tổng số lô hàng
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Sắp hết hạn
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.warning}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Đã hết hạn
              </Typography>
              <Typography variant="h4" color="error">
                {stats.expired}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Còn hạn sử dụng
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.safe}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm tên sản phẩm, số lô hoặc danh mục..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Lọc theo trạng thái</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                label="Lọc theo trạng thái"
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="danger">Đã hết hạn</MenuItem>
                <MenuItem value="warning">Sắp hết hạn</MenuItem>
                <MenuItem value="safe">Còn hạn sử dụng</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<CalendarIcon />}
              onClick={() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                setFilter('warning');
              }}
            >
              Sắp hết hạn
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {filter === 'danger' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Lưu ý:</strong> Có {expiryData.filter(item => getExpiryStatus(item.expiryDate) === 'danger').length} lô hàng đã hết hạn sử dụng.
        </Alert>
      )}
      {filter === 'warning' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Lưu ý:</strong> Có {expiryData.filter(item => getExpiryStatus(item.expiryDate) === 'warning').length} lô hàng sắp hết hạn sử dụng.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Số lô</TableCell>
              <TableCell>Hạn sử dụng</TableCell>
              <TableCell>Tồn kho</TableCell>
              <TableCell>Đã bán</TableCell>
              <TableCell>số lượng</TableCell>
              <TableCell>Đơn giá</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <EventBusyIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                    <Typography color="textSecondary">
                      {searchTerm ? 'Không tìm thấy lô hàng phù hợp' : 'Chưa có dữ liệu lô hàng'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData
                .map((item) => {
                  const status = getStatusLabel(item.expiryDate);
                  const progressValue = calculateRemainingDaysPercentage(item.expiryDate);
                  
                  return (
                    <TableRow 
                      key={item.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {item.images?.[0] ? (
                            <Box 
                              component="img"
                              src={item.images[0]}
                              alt={item.name}
                              sx={{ 
                                width: 50, 
                                height: 50, 
                                objectFit: 'cover',
                                borderRadius: 1
                              }}
                            />
                          ) : (
                            <Box 
                              sx={{ 
                                width: 50, 
                                height: 50, 
                                bgcolor: 'grey.200',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 1
                              }}
                            >
                              <ImageNotSupportedIcon color="disabled" />
                            </Box>
                          )}
                          <Box>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.category || 'Chưa phân loại'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ minWidth: 24 }}>
                            {status.icon}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" color={status.color} fontWeight="medium">
                              {status.label}
                            </Typography>
                            <Box sx={{ width: '100%', mt: 0.5 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={progressValue} 
                                color={status.color}
                                sx={{ height: 4, borderRadius: 5 }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {item.batchNumber != null ? (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              {item.batchNumber}
                            </Typography>
                            {item.supplier && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.supplier}
                              </Typography>
                            )}
                          </>
                        ) : item.supplier ? (
                          <Typography variant="body2" color="text.secondary">
                            {item.supplier}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.expiryDate ? format(new Date(item.expiryDate), 'dd/MM/yyyy') : 'N/A'}
                        </Typography>
                        {item.productionDate && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            SX: {format(new Date(item.productionDate), 'dd/MM/yyyy')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                          icon={status.icon}
                          sx={{ 
                            minWidth: 150,
                            justifyContent: 'flex-start',
                            '& .MuiChip-icon': {
                              marginLeft: '4px',
                              marginRight: '6px',
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.quantity || 0} {item.unit || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.stock || 0} {item.unit || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0)}
                        </Typography>
                        {item.cost && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Giá vốn: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.cost || 0)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Xóa lô hàng">
                          <IconButton
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            size="small"
                          >
                            <WarningIcon fontSize="small" sx={{ mr: 1 }} />                      </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Add/Edit Expiry Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          py: 1.5
        }}>
          <AssignmentIcon sx={{ mr: 1 }} />
          Thêm lô hàng mới
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText sx={{ mb: 3 }}>
            Vui lòng điền đầy đủ thông tin lô hàng mới. Các trường có dấu <span style={{ color: 'red' }}>*</span> là bắt buộc.
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.product}>
            <InputLabel id="product-select-label">Sản phẩm <span style={{ color: 'red' }}>*</span></InputLabel>
            <Select
              labelId="product-select-label"
              value={selectedProduct}
              label="Sản phẩm *"
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={isSubmitting}
              startAdornment={
                <InputAdornment position="start">
                  <CategoryIcon />
                </InputAdornment>
              }
            >
              {availableProducts.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        style={{ 
                          width: 40, 
                          height: 40, 
                          objectFit: 'cover', 
                          marginRight: 8, 
                          borderRadius: 4 
                        }} 
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: 'grey.200', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginRight: 1,
                          borderRadius: 1
                        }}
                      >
                        <InventoryIcon color="disabled" />
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body1">{product.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tồn kho: {product.stock || 0} {product.unit || 'cái'}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
              {availableProducts.length === 0 && (
                <MenuItem disabled>
                  <Typography color="text.secondary" fontStyle="italic">
                    Không có sản phẩm nào khả dụng
                  </Typography>
                </MenuItem>
              )}
            </Select>
            {errors.product && (
              <Typography color="error" variant="caption" display="block" gutterBottom>
                {errors.product}
              </Typography>
            )}
          </FormControl>
          
          <TextField
            fullWidth
            label="Số lô"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            sx={{ mb: 3 }}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BarcodeIcon />
                </InputAdornment>
              ),
            }}
            helperText="Để trống để tự động tạo số lô"
          />
          
          <TextField
            fullWidth
            label="Ngày hết hạn *"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            error={!!errors.expiryDate}
            helperText={errors.expiryDate || 'Ngày hết hạn của lô hàng'}
            sx={{ mb: 3 }}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EventIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Số lượng *"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity || 'Số lượng nhập vào kho'}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <InventoryIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    {state?.products?.find(p => p.id === selectedProduct)?.unit || 'cái'}
                  </Typography>
                </InputAdornment>
              ),
              inputProps: { min: 1, max: 10000 }
            }}
          />
          
          {selectedProduct && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Thông tin sản phẩm
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tên sản phẩm:</Typography>
                  <Typography variant="body2">
                    {state?.products?.find(p => p.id === selectedProduct)?.name || '--'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Danh mục:</Typography>
                  <Typography variant="body2">
                    {state?.products?.find(p => p.id === selectedProduct)?.category || '--'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tồn kho hiện tại:</Typography>
                  <Typography variant="body2">
                    {state?.products?.find(p => p.id === selectedProduct)?.stock || 0} {state?.products?.find(p => p.id === selectedProduct)?.unit || 'cái'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Giá bán:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(state?.products?.find(p => p.id === selectedProduct)?.price || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={handleCloseDialog} 
            disabled={isSubmitting}
            variant="outlined"
            color="inherit"
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting || availableProducts.length === 0}
            startIcon={isSubmitting ? null : <LocalShippingIcon />}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Đang lưu...
              </>
            ) : 'Lưu lô hàng'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expiry;
