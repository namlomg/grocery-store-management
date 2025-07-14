import React, { useEffect, useMemo } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  Collapse,
  ListSubheader,
  Tooltip,
  alpha,
  styled,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingCart as ProductsIcon,
  Inventory as InventoryIcon,
  EventBusy as ExpiryIcon,
  Receipt as OrdersIcon,
  ExpandLess,
  ExpandMore,
  Store as StoreIcon,
  Assessment as ReportsIcon,
  Assessment as AssessmentIcon,
  PointOfSale as PointOfSaleIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

const menuItems = [
  {
    title: 'Tổng quan',
    items: [
      { text: 'Bảng điều khiển', icon: <DashboardIcon />, path: '/' },
    ]
  },
  {
    title: 'Quản lý bán hàng',
    items: [
      { text: 'Bán hàng nhanh', icon: <PointOfSaleIcon />, path: '/pos/quick-sale' },
      { text: 'Đơn hàng', icon: <OrdersIcon />, path: '/orders' },
      { text: 'Quản lý công nợ', icon: <ReceiptIcon />, path: '/debt' },
    ]
  },
  {
    title: 'Quản lý kho',
    items: [
      { text: 'Sản phẩm', icon: <ProductsIcon />, path: '/products' },
      { text: 'Tồn kho', icon: <InventoryIcon />, path: '/inventory' },
      { text: 'Hạn sử dụng', icon: <ExpiryIcon />, path: '/expiry' },
    ]
  },
  {
    title: 'Báo cáo & Thống kê',
    items: [
      { text: 'Báo cáo bán hàng', icon: <AssessmentIcon />, path: '/reports/sales' },
     
    ]
  }
];

const Sidebar = ({ mobileOpen, onClose, isMobile }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = React.useState({});

  // Kiểu cho tiêu đề menu
  const menuHeaderStyle = {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: theme.palette.text.primary,
    lineHeight: 1.5,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 16px 8px',
  };

  // Kiểu cho mục menu
  const menuItemStyle = {
    fontWeight: 500,
    fontSize: '0.95rem',
  };

  useEffect(() => {
    const newOpenItems = {};
    menuItems.forEach(section => {
      if (section.items) {
        const isActive = section.items.some(item => 
          location.pathname === item.path
        );
        if (isActive) {
          newOpenItems[section.title] = true;
        }
      }
    });
    setOpenItems(newOpenItems);
  }, [location.pathname]);

  const handleClick = (title) => {
    setOpenItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const StyledListItem = styled(ListItemButton)(({ theme, selected }) => ({
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0.5, 2),
    padding: theme.spacing(1, 2),
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      color: theme.palette.primary.main,
      '& .MuiListItemIcon-root': {
        color: theme.palette.primary.main,
      },
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
      },
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  }));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, textAlign: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <StoreIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          Cửa Hàng Tạp Hóa
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Quản lý bán hàng
        </Typography>
      </Box>
      
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {menuItems.map((group, index) => (
          <React.Fragment key={group.title}>
            <ListSubheader 
              component="div" 
              id={`subheader-${group.title}`}
              sx={menuHeaderStyle}
            >
              {group.title}
            </ListSubheader>
            <List component="div" disablePadding>
              {group.items.map((item) => {
                const isSelected = location.pathname === item.path;
                return (
                  <Tooltip title={item.text} key={item.path} placement="right" arrow>
                    <ListItem 
                      disablePadding
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          },
                        },
                      }}
                      selected={isSelected}
                    >
                      <ListItemButton>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {React.cloneElement(item.icon, {
                            fontSize: 'small',
                            color: isSelected ? theme.palette.primary.main : 'inherit'
                          })}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text}
                          primaryTypographyProps={{
                            noWrap: true,
                            variant: 'body2',
                            sx: {
                              ...menuItemStyle,
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                              fontSize: '1.0rem',
                              '&:hover': {
                                color: theme.palette.primary.main,
                              },
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                );
              })}
            </List>
            {index < menuItems.length - 1 && <Divider sx={{ my: 2 }} />}
          </React.Fragment>
        ))}
      </Box>
      
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary">
          Phiên bản 1.0.0
        </Typography>
      </Box>
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: 'none',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer
  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="sidebar navigation"
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: 'none',
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 0 15px 0 rgba(0, 0, 0, 0.05)',
            position: 'fixed',
            top: '64px',
            height: 'calc(100% - 64px)',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
