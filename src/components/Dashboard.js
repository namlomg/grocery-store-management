import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, CircularProgress, Alert } from '@mui/material';
import {
  ShoppingCart as ProductsIcon,
  AttachMoney as RevenueIcon,
  Inventory as InventoryIcon,
  EventBusy as ExpiryIcon,
  Star as StarIcon,
  LocalOffer as CategoryIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/format';
import { 
  getTodayRevenue, 
  getLowStockProducts, 
  getTopSellingProducts,
  getTotalProducts,
  getExpiringProductsCount 
} from '../services/api';

const DashboardCard = ({ title, value, subValue, icon: Icon, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      borderRadius: 2,
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)',
      transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
      '&:hover': {
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)'
      }
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <div>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          gutterBottom 
          sx={{
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.75rem',
            fontWeight: 500
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h4" 
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: '1.75rem',
            lineHeight: 1.2,
            color: 'text.primary',
            mb: 1
          }}
        >
          {value}
        </Typography>
        {subValue && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem'
            }}
          >
            {subValue}
          </Typography>
        )}
      </div>
      <Box 
        sx={{
          backgroundColor: `${color}15`,
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon sx={{ 
          color: color, 
          fontSize: '2rem',
          opacity: 0.9
        }} />
      </Box>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    orderCount: 0,
    totalProducts: 0,
    expiringProductsCount: 0,
    lowStockProducts: [],
    topSellingProducts: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));
        
        // Gọi các API song song
        const [
          revenueData, 
          lowStockData, 
          topSellingData,
          totalProductsData,
          expiringProductsData
        ] = await Promise.all([
          getTodayRevenue(),
          getLowStockProducts(10), // Lấy sản phẩm có tồn kho <= 10
          getTopSellingProducts(5, 'day'), // Lấy top 5 sản phẩm bán chạy trong ngày
          getTotalProducts(),
          getExpiringProductsCount(30) // Kiểm tra trong 30 ngày tới
        ]);

        setStats({
          todayRevenue: revenueData.data?.revenue || 0,
          orderCount: revenueData.data?.orderCount || 0,
          totalProducts: totalProductsData.data?.total || 0,
          expiringProductsCount: expiringProductsData.data?.count || 0,
          lowStockProducts: lowStockData.data || [],
          topSellingProducts: topSellingData.data || [],
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Không thể tải dữ liệu. Vui lòng thử lại sau.'
        }));
      }
    };

    fetchDashboardData();
  }, []);

  if (stats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (stats.error) {
    return (
      <Box my={4}>
        <Alert severity="error">{stats.error}</Alert>
      </Box>
    );
  }

  // Tổng hợp dữ liệu thống kê
  const statsData = {
    totalProducts: stats.totalProducts,
    expiringSoonCount: stats.expiringProductsCount,
    todayRevenue: formatCurrency(stats.todayRevenue),
    orderCount: stats.orderCount,
    lowStockCount: stats.lowStockProducts.length,
    topSelling: stats.topSellingProducts,
    lowStockProducts: stats.lowStockProducts,
    hasData: true
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Tổng quan
      </Typography>
      
      {/* Thống kê nhanh */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Tổng sản phẩm" 
            value={statsData.totalProducts} 
            icon={ProductsIcon} 
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Doanh thu hôm nay" 
            value={statsData.todayRevenue} 
            icon={RevenueIcon} 
            color="#2196F3"
            subValue={`${statsData.orderCount} đơn hàng`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Sản phẩm tồn kho thấp" 
            value={statsData.lowStockCount} 
            icon={InventoryIcon} 
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Sắp hết hạn" 
            value={statsData.expiringSoonCount} 
            icon={ExpiryIcon} 
            color="#F44336"
          />
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* Sản phẩm bán chạy */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sản phẩm bán chạy
            </Typography>
            <List>
              {statsData.topSelling && statsData.topSelling.length > 0 ? (
                statsData.topSelling.map((product, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <StarIcon color="warning" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={product.name} 
                        secondary={`Đã bán: ${product.totalSold || 0} ${product.unit || 'cái'}`} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(product.totalRevenue || 0)}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  {statsData.hasData ? 'Không có dữ liệu bán hàng hôm nay' : 'Đang tải dữ liệu...'}
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        
        {/* Sản phẩm tồn kho thấp */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sản phẩm tồn kho thấp
            </Typography>
            <List>
              {statsData.lowStockProducts && statsData.lowStockProducts.length > 0 ? (
                statsData.lowStockProducts.map((product, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.light' }}>
                          <InventoryIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={product.name} 
                        secondary={`Tồn kho: ${product.stock || 0} ${product.unit || 'cái'}`} 
                      />
                      <Typography variant="body2" color="error">
                        Còn {product.stock || 0}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  {statsData.hasData ? 'Không có sản phẩm nào tồn kho thấp' : 'Đang tải dữ liệu...'}
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
