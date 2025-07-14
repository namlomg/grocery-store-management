import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  FileDownload as FileDownloadIcon,
  AttachMoney as AttachMoneyIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isAfter, isBefore, subDays, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { debtApi } from '../../services/api';

const DebtManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  // State for debt statistics
  const [stats, setStats] = useState({
    totalDebt: 0,
    overdueDebt: 0,
    dueThisWeek: 0,
    totalCustomers: 0,
    overdueCustomers: 0,
    dueThisWeekCustomers: 0
  });

  // Lấy dữ liệu công nợ từ API
  const fetchDebts = async () => {
    try {
      setLoading(true);
      const params = {
        status: filterStatus === 'all' ? undefined : filterStatus,
        q: searchTerm || undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        page: page + 1,
        limit: rowsPerPage
      };
      
      // Gọi API để lấy dữ liệu công nợ
      const response = await debtApi.getDebts(params);
      
      // Kiểm tra cấu trúc dữ liệu trả về
      if (response && response.data) {
        setDebts(Array.isArray(response.data) ? response.data : []);
        
        // Cập nhật tổng số bản ghi nếu có
        if (response.pagination && response.pagination.total) {
          setTotalRows(response.pagination.total);
        } else if (response.total) {
          setTotalRows(response.total);
        } else {
          setTotalRows(Array.isArray(response.data) ? response.data.length : 0);
        }
      } else {
        setDebts([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu công nợ:', error);
      enqueueSnackbar('Lỗi khi tải dữ liệu công nợ', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      setDebts([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Lấy thống kê công nợ
  const fetchDebtStats = async () => {
    try {
      const response = await debtApi.getDebtStats();
      
      // Kiểm tra xem dữ liệu có tồn tại không
      if (response && response.data) {
        setStats({
          totalDebt: response.data.totalDebt || 0,
          overdueDebt: response.data.overdueDebt || 0,
          dueThisWeek: response.data.dueThisWeek || 0,
          totalCustomers: response.data.totalCustomers || 0,
          overdueCustomers: response.data.overdueCustomers || 0,
          dueThisWeekCustomers: response.data.dueThisWeekCustomers || 0
        });
      } else {
        // Nếu không có dữ liệu, đặt tất cả về 0
        setStats({
          totalDebt: 0,
          overdueDebt: 0,
          dueThisWeek: 0,
          totalCustomers: 0,
          overdueCustomers: 0,
          dueThisWeekCustomers: 0
        });
      }
    } catch (error) {
      console.error('Lỗi khi tải thống kê công nợ:', error);
      // Nếu có lỗi, đặt tất cả về 0
      setStats({
        totalDebt: 0,
        overdueDebt: 0,
        dueThisWeek: 0,
        totalCustomers: 0,
        overdueCustomers: 0,
        dueThisWeekCustomers: 0
      });
      // Hiển thị thông báo cho người dùng
      enqueueSnackbar('Không thể tải thống kê công nợ', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };
  
  // Xử lý thanh toán công nợ
  const handlePaymentSubmit = async () => {
    if (!selectedDebt || !selectedDebt._id) {
      enqueueSnackbar('Không tìm thấy thông tin công nợ', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }

    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      enqueueSnackbar('Vui lòng nhập số tiền thanh toán hợp lệ', { 
        variant: 'warning',
        autoHideDuration: 3000
      });
      return;
    }
    
    try {
      const paymentData = {
        amount: Number(paymentAmount),
        paymentMethod,
        note: paymentNote
      };
      
      await debtApi.createDebtPayment(selectedDebt._id, paymentData);
      
      enqueueSnackbar('Thanh toán công nợ thành công', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      setPaymentDialogOpen(false);
      
      // Làm mới dữ liệu
      fetchDebts();
      fetchDebtStats();
      
      // Reset form
      setPaymentAmount('');
      setPaymentNote('');
      
    } catch (error) {
      console.error('Lỗi khi xử lý thanh toán:', error);
      enqueueSnackbar('Lỗi khi xử lý thanh toán', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };
  
  // Xử lý thay đổi trạng thái lọc
  const handleStatusChange = (event) => {
    setFilterStatus(event.target.value);
    setPage(0); // Reset về trang đầu tiên khi thay đổi bộ lọc
  };
  
  // Xử lý thay đổi trang
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Xử lý thay đổi số dòng mỗi trang
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Xử lý tìm kiếm
  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setPage(0);
    
    // Nếu có từ khóa, gọi API tìm kiếm
    if (value.trim()) {
      debtApi.searchDebtsByCustomer(value)
        .then(response => {
          // Kiểm tra cấu trúc dữ liệu trả về
          if (response && response.data) {
            setDebts(Array.isArray(response.data) ? response.data : []);
          } else {
            setDebts([]);
          }
        })
        .catch(error => {
          console.error('Lỗi khi tìm kiếm công nợ:', error);
          enqueueSnackbar('Lỗi khi tìm kiếm công nợ', { 
            variant: 'error',
            autoHideDuration: 3000
          });
          setDebts([]);
        });
    } else {
      // Nếu không có từ khóa, tải lại toàn bộ dữ liệu
      fetchDebts();
    }
  };
  
  // Xử lý mở dialog thanh toán
  const handleOpenPaymentDialog = (debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(debt.remainingAmount > 0 ? debt.remainingAmount.toString() : '');
    setPaymentDialogOpen(true);
  };

  // Xử lý xem chi tiết công nợ
  const handleViewDetails = (debt) => {
    if (debt.orderNumber) {
      // Điều hướng đến trang chi tiết đơn hàng nếu có mã đơn hàng
      window.open(`/orders?search=${debt.orderNumber}`, '_blank');
    } else {
      enqueueSnackbar('Không tìm thấy thông tin đơn hàng', { 
        variant: 'warning',
        autoHideDuration: 3000
      });
    }
  };
  
  // Xử lý đóng dialog thanh toán
  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedDebt(null);
    setPaymentAmount('');
    setPaymentNote('');
  };
  
  // Effect để tải dữ liệu khi tham số thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDebts();
      fetchDebtStats();
    }, 300); // Thêm debounce để tránh gọi API quá nhiều
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filterStatus, searchTerm, startDate, endDate]);

  // Sử dụng dữ liệu đã được phân trang từ API
  // const paginatedDebts = debts; // Không cần dùng nữa vì đã xử lý phân trang ở API
  const totalPages = 1; // TODO: Cập nhật từ API khi có phân trang phía backend

  // Định dạng tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  // Định dạng ngày tháng
  const formatDate = (dateString, formatStr = 'dd/MM/yyyy') => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), formatStr, { locale: vi });
  };

  // Xử lý thanh toán công nợ
  const handlePayment = (debt) => {
    handleOpenPaymentDialog(debt);
  };

  // Hiển thị trạng thái công nợ
  const renderStatusChip = (status, dueDate) => {
    const isOverdue = dueDate && isBefore(parseISO(dueDate), new Date());
    
    if (status === 'paid') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Đã thanh toán"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    } else if (isOverdue) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Quá hạn"
          color="error"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Đang nợ"
          color="warning"
          size="small"
        />
      );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Quản lý công nợ
        </Typography>

        {/* Thống kê nhanh */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Tổng số công nợ */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="textSecondary">
                    Tổng số công nợ
                  </Typography>
                </Box>
                <Typography variant="h4" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {formatCurrency(stats.totalDebt)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.totalCustomers || 0} khách hàng nợ
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* Công nợ quá hạn */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="textSecondary">
                    Công nợ quá hạn
                  </Typography>
                </Box>
                <Typography variant="h4" color="error" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {formatCurrency(stats.overdueDebt)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.overdueCustomers || 0} khách hàng
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* Công nợ đến hạn trong 7 ngày */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="textSecondary">
                    Công nợ đến hạn trong 7 ngày
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'warning.main', mb: 1, fontWeight: 'bold' }}>
                  {formatCurrency(stats.dueThisWeek)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.dueThisWeekCustomers || 0} khách hàng đến hạn
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bộ lọc và tìm kiếm */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Tìm kiếm theo tên, SĐT, mã đơn hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Trạng thái"
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="pending">Đang nợ</MenuItem>
                  <MenuItem value="overdue">Quá hạn</MenuItem>
                  <MenuItem value="paid">Đã thanh toán</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Từ ngày"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Đến ngày"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                fullWidth
              >
                Lọc
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                fullWidth
              >
                Xuất
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Bảng danh sách công nợ */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn hàng</TableCell>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell align="right">Tổng tiền</TableCell>
                  <TableCell align="right">Đã thanh toán</TableCell>
                  <TableCell align="right">Còn nợ</TableCell>
                  <TableCell>Ngày đặt hàng</TableCell>
                  <TableCell>Hạn thanh toán</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : debts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      Không có dữ liệu công nợ
                    </TableCell>
                  </TableRow>
                ) : (
                  debts.map((debt) => (
                      <TableRow
                        hover
                        key={debt._id || debt.id || Math.random().toString(36).substr(2, 9)}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {debt.orderNumber || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {debt.customer?.name || 'Khách lẻ'}
                            </Typography>
                            {debt.customer?.phone && (
                              <Typography variant="body2" color="textSecondary">
                                {debt.customer.phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(debt.totalAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {formatCurrency(debt.paidAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error.main" fontWeight="bold">
                            {formatCurrency(debt.remainingAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(debt.createdAt, 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {debt.dueDate ? (
                            <Typography
                              color={
                                debt.status === 'paid'
                                  ? 'text.secondary'
                                  : isBefore(parseISO(debt.dueDate), new Date())
                                  ? 'error.main'
                                  : 'warning.main'
                              }
                            >
                              {formatDate(debt.dueDate, 'dd/MM/yyyy')}
                            </Typography>
                          ) : (
                            <Typography color="text.secondary">Không có hạn</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderStatusChip(debt.status, debt.dueDate)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Thanh toán">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handlePayment(debt)}
                                disabled={debt.status === 'paid'}
                              >
                                <AttachMoneyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xem chi tiết">
                              <IconButton 
                                color="info" 
                                size="small"
                                onClick={() => handleViewDetails(debt)}
                              >
                                <ReceiptIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton color="warning" size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={debts.length} // Tổng số bản ghi từ API
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} trong số ${count !== -1 ? count : `hơn ${to}`} bản ghi`
            }
          />
        </Paper>

        {/* Dialog thanh toán */}
        <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Xác nhận thanh toán công nợ</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Xác nhận thanh toán cho đơn hàng <strong>{selectedDebt?.orderNumber}</strong> của khách hàng <strong>{selectedDebt?.customer?.name}</strong>?
              <br />
              Số tiền còn nợ: <strong>{formatCurrency(selectedDebt?.remainingAmount || 0)}</strong>
            </DialogContentText>
            
            <TextField
              autoFocus
              margin="dense"
              label="Số tiền thanh toán"
              type="number"
              fullWidth
              variant="outlined"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₫</InputAdornment>,
              }}
              sx={{ mt: 2 }}
            />
            
            <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
              <InputLabel>Phương thức thanh toán</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                label="Phương thức thanh toán"
              >
                <MenuItem value="CASH">Tiền mặt</MenuItem>
                <MenuItem value="BANK_TRANSFER">Chuyển khoản</MenuItem>
                <MenuItem value="CREDIT_CARD">Thẻ tín dụng</MenuItem>
                <MenuItem value="OTHER">Khác</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              margin="dense"
              label="Ghi chú"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog} color="inherit">
              Hủy
            </Button>
            <Button 
              onClick={handlePaymentSubmit} 
              variant="contained" 
              color="primary"
              startIcon={<AttachMoneyIcon />}
              disabled={!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0}
            >
              Xác nhận thanh toán
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default DebtManagement;
