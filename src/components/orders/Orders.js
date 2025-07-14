import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  CardHeader,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getOrders, updateOrderStatus } from '../../services/api';

const Orders = () => {
  console.log('Orders component is rendering');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // State cho modal xem chi tiết
  const [orderDetailModal, setOrderDetailModal] = useState({
    open: false,
    order: null,
    loading: false,
  });
  const [orders, setOrders] = useState({ 
    data: [], 
    total: 0,
    totalPages: 1,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status and payment method mappings
  const statusMap = {
    pending: { label: 'Chờ xử lý', color: 'warning' },
    processing: { label: 'Đang xử lý', color: 'info' },
    completed: { label: 'Hoàn thành', color: 'success' },
    cancelled: { label: 'Đã hủy', color: 'error' },
  };

  const paymentMethodMap = {
    cash: { label: 'Tiền mặt', icon: '💰' },
    momo: { label: 'Ví MoMo', icon: '📱' },
    banking: { label: 'Chuyển khoản', icon: '🏦' },
    card: { label: 'Thẻ', icon: '💳' },
  };

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders with params:', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });
      
      const response = await getOrders({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });
      
      console.log('API Response:', response);
      
      // Xử lý response dựa trên cấu trúc dữ liệu
      let ordersData = [];
      let total = 0;
      let totalPages = 1;
      let currentPage = 1;
      
      // Nếu response là mảng
      if (Array.isArray(response)) {
        console.log('Response is an array');
        ordersData = response;
        total = response.length;
      }
      // Nếu response có thuộc tính data là mảng
      else if (response && Array.isArray(response.data)) {
        console.log('Response has data array');
        ordersData = response.data;
        total = response.total || response.data.length;
        totalPages = response.totalPages || 1;
        currentPage = response.currentPage || 1;
      }
      // Nếu response có thuộc tính data là object chứa mảng data
      else if (response && response.data && Array.isArray(response.data.data)) {
        console.log('Response has data.data array');
        ordersData = response.data.data;
        total = response.data.total || response.data.data.length;
        totalPages = response.data.totalPages || 1;
        currentPage = response.data.currentPage || 1;
      }
      // Nếu response là object và có success = true
      else if (response && response.success === true) {
        console.log('Response has success=true');
        ordersData = response.data || [];
        total = response.total || response.count || ordersData.length;
        totalPages = response.totalPages || 1;
        currentPage = response.currentPage || 1;
      }
      
      console.log('Processed orders data:', {
        data: ordersData,
        total,
        totalPages,
        currentPage
      });
      
      // Lấy thông tin chi tiết đơn hàng
      const fetchOrderDetails = async (orderId) => {
        try {
          console.log('Fetching order details for ID:', orderId);
          const response = await axios.get(`/api/orders/${orderId}`);
          console.log('Order details response:', response.data);
          return response.data;
        } catch (error) {
          console.error('Error fetching order details:', error);
          return null;
        }
      };

      // Cập nhật state
      setOrders({
        data: ordersData,
        total,
        totalPages,
        currentPage
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
      setSnackbar({
        open: true,
        message: 'Lỗi khi tải danh sách đơn hàng: ' + (err.response?.data?.message || err.message),
        severity: 'error',
      });
      
      // Đặt dữ liệu rỗng khi có lỗi
      setOrders({
        data: [],
        total: 0,
        totalPages: 1,
        currentPage: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on component mount and when page/rowsPerPage/searchTerm changes
  useEffect(() => {
    console.log('Fetching orders...');
    fetchOrders();
  }, [page, rowsPerPage, searchTerm]);

  // Handle status update
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setSnackbar({
        open: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        severity: 'success',
      });
      fetchOrders(); // Refresh orders list
    } catch (err) {
      console.error('Error updating order status:', err);
      setSnackbar({
        open: true,
        message: 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng',
        severity: 'error',
      });
    }
    handleCloseMenu();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  // Mở menu thao tác
  const handleMenuOpen = (event, order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  // Đóng menu thao tác
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrder(null);
  };

  // Xem chi tiết đơn hàng trong modal
  const handleViewDetails = async () => {
    if (selectedOrder) {
      try {
        setOrderDetailModal(prev => ({ ...prev, loading: true }));
        
        // Gọi API để lấy đầy đủ thông tin đơn hàng
        const response = await axios.get(`/api/orders/${selectedOrder._id}`);
        console.log('Full order details:', response.data);
        
        setOrderDetailModal({
          open: true,
          order: response.data,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching order details:', error);
        // Nếu lỗi, vẫn hiển thị với dữ liệu đã có
        setOrderDetailModal({
          open: true,
          order: selectedOrder,
          loading: false,
        });
      }
    }
    handleMenuClose();
  };

  // Đóng modal xem chi tiết
  const handleCloseOrderDetail = () => {
    setOrderDetailModal({
      open: false,
      order: null,
      loading: false,
    });
  };

  // In hóa đơn
  const handlePrintInvoice = () => {
    if (selectedOrder) {
      // Mở cửa sổ in hoặc tạo PDF
      window.print();
    }
    handleMenuClose();
  };

  // Hủy đơn hàng
  const handleCancelOrder = async () => {
    if (selectedOrder) {
      try {
        // Gọi API cập nhật trạng thái đơn hàng
        const response = await updateOrderStatus(selectedOrder._id, { status: 'cancelled' });
        
        if (response.success) {
          // Cập nhật UI
          setOrders(prev => ({
            ...prev,
            data: prev.data.map(order => 
              order._id === selectedOrder._id 
                ? { ...order, status: 'cancelled' } 
                : order
            )
          }));
          
          // Hiển thị thông báo
          setSnackbar({
            open: true,
            message: 'Đã hủy đơn hàng thành công',
            severity: 'success'
          });
        }
      } catch (error) {
        console.error('Lỗi khi hủy đơn hàng:', error);
        setSnackbar({
          open: true,
          message: 'Có lỗi xảy ra khi hủy đơn hàng',
          severity: 'error'
        });
      }
    }
    handleMenuClose();
  };

  // Đóng thông báo
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenMenu = (event, order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedOrder(null);
  };

  // Show loading state
  if (loading && (!orders || !orders.data || orders.data.length === 0)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  // Show error message
  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchOrders}>
              Thử lại
            </Button>
          }
        >
          {error || 'Không thể tải danh sách đơn hàng'}
        </Alert>
      </Box>
    );
  }
  
  // Show empty state
  if (!orders || !orders.data || orders.data.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Chưa có đơn hàng nào
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchOrders}
          startIcon={<RefreshIcon />}
        >
          Tải lại
        </Button>
      </Box>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            <Typography variant="h6" component="div">
              Quản lý đơn hàng
            </Typography>
            <Tooltip title="Làm mới">
              <IconButton onClick={handleRefresh} size="small" sx={{ ml: 1 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
        action={
          <Box display="flex" alignItems="center">
            <TextField
              size="small"
              placeholder="Tìm kiếm đơn hàng..."
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{ mr: 2, minWidth: 300 }}
            />
            <Button 
              variant="contained" 
              color="primary"
              href="/orders/new"
            >
              Tạo đơn hàng mới
            </Button>
          </Box>
        }
      />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn hàng</TableCell>
                <TableCell>Khách hàng</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell>Số lượng sản phẩm</TableCell>
                <TableCell>Tổng tiền</TableCell>
                <TableCell>Hình thức thanh toán</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.data && orders.data.length > 0 ? (
                orders.data.map((order) => (
                  <TableRow hover key={order._id}>
                    <TableCell>
                      <Typography variant="body2" color="primary" fontWeight="medium">
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{order.customer?.name || 'Khách lẻ'}</TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      {order.items.reduce((total, item) => total + item.quantity, 0)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(order.total)}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box mr={1}>
                          {paymentMethodMap[order.paymentMethod]?.icon || '💳'}
                        </Box>
                        {paymentMethodMap[order.paymentMethod]?.label || 'Khác'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusMap[order.status]?.label || order.status}
                        color={statusMap[order.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, order)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="body1">
                      {searchTerm ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={orders.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trong ${count} đơn hàng`
          }
        />
      </CardContent>

      {/* Order Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Xem chi tiết" />
        </MenuItem>
        <MenuItem onClick={handlePrintInvoice}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="In hóa đơn" />
        </MenuItem>
        {selectedOrder?.status === 'processing' && (
          <MenuItem onClick={() => handleStatusUpdate(selectedOrder._id, 'completed')}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Đánh dấu đã hoàn thành" />
          </MenuItem>
        )}
        {selectedOrder?.status !== 'cancelled' && selectedOrder?.status !== 'completed' && (
          <MenuItem onClick={handleCancelOrder}>
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Hủy đơn hàng" primaryTypographyProps={{ color: 'error' }} />
          </MenuItem>
        )}
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Modal xem chi tiết đơn hàng */}
      <Dialog 
        open={orderDetailModal.open} 
        onClose={handleCloseOrderDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi tiết đơn hàng #{orderDetailModal.order?.orderNumber}</DialogTitle>
        <DialogContent dividers>
          {orderDetailModal.loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : orderDetailModal.order ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Thông tin đơn hàng</strong>
                </Typography>
                <Box mb={2}>
                  <Typography><strong>Mã đơn hàng:</strong> {orderDetailModal.order.orderNumber}</Typography>
                  <Typography><strong>Ngày tạo:</strong> {format(new Date(orderDetailModal.order.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}</Typography>
                  <Typography><strong>Trạng thái:</strong> {statusMap[orderDetailModal.order.status]?.label || orderDetailModal.order.status}</Typography>
                  <Typography><strong>Hình thức thanh toán:</strong> {paymentMethodMap[orderDetailModal.order.paymentMethod]?.label || orderDetailModal.order.paymentMethod}</Typography>
                  <Typography><strong>Nhân viên:</strong> {orderDetailModal.order.staff || 'Không xác định'}</Typography>
                  <Typography><strong>Ghi chú:</strong> {orderDetailModal.order.notes || 'Không có ghi chú'}</Typography>
                </Box>

                {orderDetailModal.order.customer && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Thông tin khách hàng</strong>
                    </Typography>
                    <Box mb={2}>
                      <Typography><strong>Tên:</strong> {orderDetailModal.order.customer?.name || 'Khách lẻ'}</Typography>
                      <Typography><strong>SĐT:</strong> {orderDetailModal.order.customer?.phone || 'Chưa có'}</Typography>
                    </Box>
                  </>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Chi tiết sản phẩm</strong>
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderDetailModal.order.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">{item.name || 'Sản phẩm không xác định'}</Typography>
                            {item.variant && (
                              <Typography variant="caption" color="textSecondary">
                                {item.variant}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                          </TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total || (item.price * item.quantity))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>Tổng tiền:</strong></TableCell>
                        <TableCell align="right">
                          <strong>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderDetailModal.order.subtotal || 0)}
                          </strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>Giảm giá:</strong></TableCell>
                        <TableCell align="right">
                          <strong>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderDetailModal.order.discount || 0)}
                          </strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>Thành tiền:</strong></TableCell>
                        <TableCell align="right">
                          <strong>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderDetailModal.order.total || 0)}
                          </strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>Khách đưa:</strong></TableCell>
                        <TableCell align="right">
                          <strong>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderDetailModal.order.customerPayment || 0)}
                          </strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right"><strong>Tiền thối lại:</strong></TableCell>
                        <TableCell align="right">
                          <strong>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderDetailModal.order.change || 0)}
                          </strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          ) : (
            <Typography>Không tìm thấy thông tin đơn hàng</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDetail} color="primary">
            Đóng
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              handleCloseOrderDetail();
              handlePrintInvoice();
            }}
            startIcon={<PrintIcon />}
          >
            In hóa đơn
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default Orders;
