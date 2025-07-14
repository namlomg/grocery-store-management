import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, useMediaQuery, Container } from '@mui/material';

// Components
import Dashboard from './components/Dashboard';
import Products from './components/products/Products';
import QuickSale from './components/pos/QuickSale';
import Orders from './components/orders/Orders';
import DebtManagement from './components/debt/DebtManagement';
import Inventory from './components/inventory/Inventory';
import Expiry from './components/expiry/Expiry';
import SalesReport from './components/reports/Reports';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Context
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  drawerWidth: 260,
});

// Layout with navbar and sidebar
const MainLayout = ({ children }) => {
  console.log('MainLayout rendering...');
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { currentUser } = useAuth();

  console.log('MainLayout - currentUser:', currentUser);
  console.log('MainLayout - isMobile:', isMobile);
  console.log('MainLayout - mobileOpen:', mobileOpen);
  console.log('MainLayout - children:', children);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (mobileOpen && isMobile) {
      setMobileOpen(false);
    }
  }, [location, isMobile, mobileOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <Navbar 
        onMenuToggle={handleDrawerToggle} 
        isMobile={isMobile}
      />
      
      {/* Sidebar */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        onClose={handleDrawerClose}
        isMobile={isMobile}
      />
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          position: 'fixed',
          top: '64px',
          left: { sm: `${theme.drawerWidth}px` },
          right: 0,
          bottom: 0,
          overflow: 'auto',
          p: 3,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Box 
          className="main-content-wrapper"
          sx={{
            width: '100%',
            height: '100%',
            '& > *': {
              width: '100% !important',
              maxWidth: '100% !important',
              margin: '0 !important',
              padding: '0 !important',
            },
            '& .MuiPaper-root': {
              width: '100% !important',
              maxWidth: '100% !important',
              margin: '0 !important',
              padding: '0 !important',
            },
            '& .MuiContainer-root': {
              width: '100% !important',
              maxWidth: '100% !important',
              margin: '0 !important',
              padding: '0 !important',
            }
          }}
        >
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};

// Public route component
const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return !currentUser ? children : <Navigate to="/" replace />;
};

// ProtectedRouteWrapper is no longer needed as we're using ProtectedRoute directly in Routes

function App() {
  console.log('App component rendering...');
  
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <AppProvider>
          <CssBaseline />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            
            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout><Outlet /></MainLayout>}>
                <Route index element={<Dashboard />} />
                
                {/* Sales Management Routes */}
                <Route path="pos/quick-sale" element={<QuickSale />} />
                <Route path="orders" element={<Orders />} />
                <Route path="debt" element={<DebtManagement />} />
                
                {/* Inventory Management Routes */}
                <Route path="inventory" element={<Inventory />} />
                <Route path="products" element={<Products />} />
                <Route path="expiry" element={<Expiry />} />
                
                {/* Report Routes */}
                <Route path="reports">
                  <Route path="sales" element={<SalesReport type="sales" />} />
                  <Route path="inventory" element={<SalesReport type="inventory" />} />
                  <Route path="revenue" element={<SalesReport type="revenue" />} />
                </Route>
                
                {/* Settings Routes */}
                <Route path="settings">
                  <Route path="store" element={<div>Cấu hình cửa hàng</div>} />
                  <Route path="users" element={<div>Quản lý người dùng</div>} />
                  <Route path="roles" element={<div>Phân quyền</div>} />
                </Route>
              </Route>
            </Route>
            
            {/* 404 - Redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
