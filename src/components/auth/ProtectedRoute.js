import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

const ProtectedRoute = ({ requiredRole }) => {
  const { currentUser, isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
    
    // Đánh dấu đã kiểm tra xác thực
    if (!loading) {
      setAuthChecked(true);
    }
  }, [location, loading]);

  // Hiển thị loading khi đang kiểm tra xác thực
  if (loading || !authChecked) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Đang kiểm tra xác thực...
        </Typography>
      </Box>
    );
  }

  const isAuth = isAuthenticated();
  
  // Kiểm tra xác thực
  if (!isAuth) {
    // Lưu URL hiện tại để chuyển hướng lại sau khi đăng nhập
    const returnUrl = location.pathname + location.search;
    return <Navigate to="/login" state={{ from: returnUrl }} replace />;
  }

  // Kiểm tra quyền truy cập nếu cần
  const hasRequiredRole = !requiredRole || hasRole(requiredRole);
  
  // Nếu đã xác thực và có quyền truy cập, render children hoặc Outlet
  if (isAuth && hasRequiredRole) {
    return <Outlet />;
  }
  if (!hasRequiredRole) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Truy cập bị từ chối
        </Typography>
        <Typography variant="body1">
          Bạn không có quyền truy cập vào trang này.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
        >
          Về trang chủ
        </Button>
      </Box>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
