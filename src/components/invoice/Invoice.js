import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const Invoice = forwardRef(({ order }, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      ref={ref}
      sx={{
        width: isMobile ? '100%' : 400,
        p: 3,
        bgcolor: 'background.paper',
        '@media print': {
          width: '100%',
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box textAlign="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">CỬA HÀNG TẠP HÓA NHÀ TÔI</Typography>
        <Typography variant="body2">Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM</Typography>
        <Typography variant="body2">Điện thoại: 0909 123 456</Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Order Info */}
      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">Mã hóa đơn: {order?.id}</Typography>
          <Typography variant="body2">
            {order?.date ? format(new Date(order.date), 'HH:mm dd/MM/yyyy', { locale: vi }) : ''}
          </Typography>
        </Box>
        <Typography variant="body2">Nhân viên: {order?.staff || 'Admin'}</Typography>
        <Typography variant="body2">Khách hàng: {order?.customerName || 'Khách lẻ'}</Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Order Items */}
      <Box mb={2}>
        {order?.items?.map((item, index) => (
          <Box key={index} display="flex" justifyContent="space-between" mb={1}>
            <Box>
              <Typography variant="body2">{item.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {item.quantity} {item.unit} x {item.price.toLocaleString()} đ
              </Typography>
            </Box>
            <Typography variant="body2">
              {(item.quantity * item.price).toLocaleString()} đ
            </Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Summary */}
      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">Tạm tính:</Typography>
          <Typography variant="body2">
            {order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} đ
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">Giảm giá:</Typography>
          <Typography variant="body2">0 đ</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight="bold">Tổng cộng:</Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {order?.total?.toLocaleString()} đ
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">Khách đưa:</Typography>
          <Typography variant="body2">
            {order?.customerPayment?.toLocaleString() || '0'} đ
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2">Tiền thối:</Typography>
          <Typography variant="body2" fontWeight="bold">
            {order?.customerPayment ? (order.customerPayment - order.total).toLocaleString() : '0'} đ
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Footer */}
      <Box textAlign="center" mt={2}>
        <Typography variant="caption" display="block">Cảm ơn quý khách!</Typography>
        <Typography variant="caption" display="block">Hẹn gặp lại</Typography>
      </Box>
    </Box>
  );
});

export default Invoice;
