import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/format';
import { getDebtDetails, createPayment } from '../../services/debtService';
import PaymentDialog from './PaymentDialog';

const DebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debt, setDebt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Lấy thông tin chi tiết công nợ
  const fetchDebtDetails = async () => {
    try {
      setLoading(true);
      const response = await getDebtDetails(id);
      setDebt(response.data);
    } catch (err) {
      console.error('Error fetching debt details:', err);
      setError('Không thể tải thông tin công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDebtDetails();
    }
  }, [id]);

  // Xử lý thanh toán thành công
  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    fetchDebtDetails(); // Làm mới dữ liệu
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!debt) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Không tìm thấy thông tin công nợ
      </Alert>
    );
  }

  const remainingAmount = debt.amount - (debt.paidAmount || 0);
  const isPaid = remainingAmount <= 0;

  return (
    <Box>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/debts');
          }}
        >
          Quản lý công nợ
        </Link>
        <Typography color="text.primary">Chi tiết công nợ</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate('/debts')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            Chi tiết công nợ: {debt.order?.orderNumber || 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PaymentIcon />}
            onClick={() => setPaymentDialogOpen(true)}
            disabled={isPaid}
            sx={{ mr: 1 }}
          >
            Thanh toán
          </Button>
          <Button
            variant="outlined"
            startIcon={<ReceiptIcon />}
            onClick={() => navigate(`/orders/${debt.order?._id}`)}
          >
            Xem đơn hàng
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Thông tin chính */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Thông tin công nợ</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PersonIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Khách hàng:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ ml: 4, mb: 2 }}>
                    {debt.customer?.name || 'Khách lẻ'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Ngày tạo:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ ml: 4, mb: 2 }}>
                    {formatDate(debt.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Hạn thanh toán:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ ml: 4, mb: 2 }}>
                    {debt.dueDate ? formatDate(debt.dueDate) : 'Không xác định'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <MoneyIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Trạng thái:</Typography>
                  </Box>
                  <Box sx={{ ml: 4, mb: 2 }}>
                    <Chip
                      label={isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      color={isPaid ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Ghi chú:</Typography>
                  <Paper variant="outlined" sx={{ p: 2, minHeight: 80, bgcolor: 'action.hover' }}>
                    {debt.notes || 'Không có ghi chú'}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Thông tin thanh toán */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Thông tin thanh toán</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2">Tổng tiền:</Typography>
                  <Typography variant="h6">{formatCurrency(debt.amount)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2">Đã thanh toán:</Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(debt.paidAmount || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2">Còn nợ:</Typography>
                  <Typography variant="h6" color={isPaid ? 'success.main' : 'error.main'}>
                    {formatCurrency(remainingAmount)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Lịch sử thanh toán */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <HistoryIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="h6">Lịch sử thanh toán</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {debt.payments && debt.payments.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ngày</TableCell>
                        <TableCell align="right">Số tiền</TableCell>
                        <TableCell>Hình thức</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {debt.payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            {payment.paymentMethod === 'cash' ? 'Tiền mặt' : 
                             payment.paymentMethod === 'bank' ? 'Chuyển khoản' :
                             payment.paymentMethod === 'momo' ? 'MoMo' : 'Khác'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                  Chưa có giao dịch thanh toán nào
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog thanh toán */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        debt={debt}
        onSuccess={handlePaymentSuccess}
      />
    </Box>
  );
};

export default DebtDetail;
