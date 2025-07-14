import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Lock as LockIcon, Email as EmailIcon } from '@mui/icons-material';
import { login, getCurrentUser } from '../../services/api';

const Login = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Kiểm tra xem người dùng đã đăng nhập chưa
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      
      console.log('Attempting to login with:', { email });
      
      // Gọi API đăng nhập
      const response = await login(email, password);
      console.log('Login response:', response);
      
      // Kiểm tra xem có token trong response không
      if (!response.token) {
        throw new Error('Không nhận được token từ máy chủ');
      }
      
      // Đảm bảo token đã được lưu vào localStorage
      const storedToken = localStorage.getItem('token');
      console.log('Stored token:', storedToken);
      
      if (!storedToken) {
        // Thử lưu lại token thủ công nếu chưa được lưu
        localStorage.setItem('token', response.token);
        const newStoredToken = localStorage.getItem('token');
        if (!newStoredToken) {
          throw new Error('Không thể lưu token vào bộ nhớ cục bộ');
        }
      }
      
      // Lấy thông tin người dùng hiện tại
      console.log('Fetching current user data...');
      const userData = await getCurrentUser();
      console.log('Current user data:', userData);
      
      if (!userData) {
        throw new Error('Không thể lấy thông tin người dùng');
      }
      
      // Lưu thông tin người dùng vào localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Kiểm tra xem có URL trước đó không (để chuyển hướng lại sau khi đăng nhập)
      const from = location.state?.from?.pathname || '/';
      console.log('Redirecting to:', from);
      
      // Chuyển hướng sau khi đăng nhập thành công
      navigate(from, { replace: true });
      
    } catch (err) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Xóa thông tin đăng nhập không hợp lệ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại sau.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Email hoặc mật khẩu không đúng';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              width: 60,
              height: 60,
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <LockIcon fontSize="large" />
          </Box>
          
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            ĐĂNG NHẬP HỆ THỐNG
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <EmailIcon color="action" sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <LockIcon color="action" sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'ĐĂNG NHẬP'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
              >
                Quên mật khẩu?
              </Link>
            </Box>
          </Box>
        </Paper>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Cửa Hàng Tạp Hóa Nhà Tôi
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Phiên bản 1.0.0
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
