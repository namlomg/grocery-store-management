import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
  Badge,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  Chip,
  Paper,
  Typography as MuiTypography,
  ButtonBase,
  Fade,
  ClickAwayListener,
  Popper,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  CircularProgress,
  Skeleton
} from '@mui/material';
import {
  Menu as MenuIcon,
  PointOfSale as PointOfSaleIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Refresh as RefreshIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsActive as NotificationsActiveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import QuickSale from '../quick-sale/QuickSale';
import notificationService from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Component cho nội dung thông báo
const NotificationItem = ({ notification, onClick, onMarkAsRead, onDelete }) => {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'low_stock':
        return <WarningIcon color="warning" />;
      case 'expiring_soon':
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'inventory_update':
        return <InfoIcon color="info" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  const getNotificationTitle = () => {
    switch (notification.type) {
      case 'low_stock':
        return 'Cảnh báo tồn kho thấp';
      case 'expiring_soon':
        return 'Sản phẩm sắp hết hạn';
      case 'expired':
        return 'Sản phẩm đã hết hạn';
      case 'inventory_update':
        return 'Cập nhật tồn kho';
      default:
        return 'Thông báo mới';
    }
  };

  return (
    <ListItem 
      alignItems="flex-start"
      sx={{
        bgcolor: notification.read ? 'background.paper' : 'action.hover',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      disablePadding
    >
      <ListItemButton 
        onClick={onClick}
        sx={{ py: 1.5, px: 2 }}
      >
        <ListItemAvatar sx={{ minWidth: 40 }}>
          <Avatar sx={{ bgcolor: 'background.paper' }}>
            {getNotificationIcon()}
          </Avatar>
        </ListItemAvatar>
        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <MuiTypography 
              variant="subtitle2" 
              color="text.primary"
              noWrap
              sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
            >
              {getNotificationTitle()}
            </MuiTypography>
            {!notification.read && (
              <Box component="span" sx={{ 
                width: 8, 
                height: 8, 
                bgcolor: 'primary.main', 
                borderRadius: '50%',
                ml: 1
              }} />
            )}
          </Box>
          <MuiTypography 
            variant="body2" 
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {notification.message}
          </MuiTypography>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <MuiTypography 
              variant="caption" 
              color="text.disabled"
              sx={{
                display: 'flex',
                alignItems: 'center',
                '& svg': {
                  fontSize: '0.8rem',
                  mr: 0.5
                }
              }}
            >
              {formatDistanceToNow(new Date(notification.createdAt), { 
                addSuffix: true,
                locale: vi
              })}
            </MuiTypography>
          </Box>
        </Box>
      </ListItemButton>
      <ListItemSecondaryAction sx={{ top: '50%', transform: 'translateY(-50%)' }}>
        <IconButton 
          size="small" 
          edge="end" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const Navbar = ({ onMenuToggle }) => {
  console.log('Navbar rendering...');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  console.log('isMobile:', isMobile);
  console.log('onMenuToggle is a function:', typeof onMenuToggle === 'function');
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const notificationPopperRef = useRef(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Hàm xử lý đăng xuất đã được định nghĩa ở dưới
  
  // Lấy thông báo từ API
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Đánh dấu thông báo đã đọc
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await notificationService.markAsRead(notificationId);
      setUnreadCount(response.unreadCount);
      
      // Cập nhật trạng thái đã đọc trong danh sách
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc:', error);
    }
  };
  
  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      setUnreadCount(0);
      
      // Đánh dấu tất cả là đã đọc trong danh sách
      setNotifications(prev => 
        prev.map(notif => ({
          ...notif,
          read: true
        }))
      );
    } catch (error) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
    }
  };
  
  // Xóa một thông báo
  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await notificationService.deleteNotification(notificationId);
      setUnreadCount(response.unreadCount);
      
      // Xóa khỏi danh sách
      setNotifications(prev => 
        prev.filter(notif => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
    }
  };
  
  // Xóa tất cả thông báo
  const handleClearAllNotifications = async () => {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi khi xóa tất cả thông báo:', error);
    }
  };
  
  // Mở/đóng popup thông báo
  const handleNotificationClick = (event) => {
    if (notificationAnchor) {
      // Nếu đang mở thì đóng
      setNotificationAnchor(null);
    } else {
      // Nếu đang đóng thì mở và làm mới dữ liệu
      setNotificationAnchor(event.currentTarget);
      fetchNotifications();
    }
  };
  
  // Đóng popup thông báo
  const handleCloseNotification = () => {
    setNotificationAnchor(null);
  };
  
  // Tải lại danh sách thông báo
  const handleRefreshNotifications = () => {
    fetchNotifications();
  };
  
  // Xử lý khi click vào một thông báo
  const handleNotificationItemClick = (notification) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    
    // Điều hướng dựa trên loại thông báo
    if (notification.product) {
      // Điều hướng đến trang sản phẩm nếu có thông tin sản phẩm
      navigate(`/products/${notification.product._id || notification.product}`);
    } else if (notification.type === 'inventory_update') {
      // Điều hướng đến trang quản lý kho
      navigate('/inventory');
    }
    
    // Đóng popup thông báo
    handleCloseNotification();
  };
  
  // Tự động tải thông báo khi đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      
      // Thiết lập interval để kiểm tra thông báo mới mỗi phút
      const interval = setInterval(fetchNotifications, 60000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);
  
  // Cập nhật trạng thái đăng nhập khi currentUser thay đổi

  useEffect(() => {
    // Cập nhật trạng thái đăng nhập khi currentUser thay đổi
    setIsLoggedIn(!!currentUser);
  }, [currentUser]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    }
  };
  
  // Add keyboard shortcut for quick sale (F9)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setQuickSaleOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography 
            variant="h6" 
            noWrap 
            component={RouterLink} 
            to="/"
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                textDecoration: 'none'
              },
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <PointOfSaleIcon />
            Quản lý cửa hàng tạp hóa
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoggedIn ? (
              <>
                {/* Nút Bán hàng nhanh */}
                <Tooltip title="Bán hàng nhanh (F9)">
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<PointOfSaleIcon />}
                    onClick={() => setQuickSaleOpen(true)}
                    sx={{ 
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)'
                      }
                    }}
                  >
                    Bán Hàng
                  </Button>
                </Tooltip>
                
                {/* Nút thông báo */}
                <Tooltip title="Thông báo">
                  <div> {/* Thêm div bao bọc để tránh xung đột sự kiện */}
                    <IconButton 
                      color="inherit" 
                      onClick={handleNotificationClick}
                      ref={notificationPopperRef}
                      aria-owns={notificationAnchor ? 'notification-popper' : undefined}
                      aria-haspopup="true"
                      aria-expanded={Boolean(notificationAnchor)}
                    >
                      <Badge badgeContent={unreadCount} color="error">
                        {unreadCount > 0 ? (
                          <NotificationsActiveIcon />
                        ) : (
                          <NotificationsNoneIcon />
                        )}
                      </Badge>
                    </IconButton>
                  </div>
                </Tooltip>
                
                {/* Popup thông báo */}
                <Popper
                  open={Boolean(notificationAnchor)}
                  anchorEl={notificationAnchor}
                  placement="bottom-end"
                  transition
                  disablePortal
                  style={{ zIndex: 1300, width: 380, maxWidth: '90vw' }}
                >
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={150}>
                      <Paper elevation={3} sx={{ width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <CardHeader
                          title={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle1" fontWeight="bold">
                                Thông báo
                              </Typography>
                              <Box>
                                <Tooltip title="Làm mới">
                                  <span> {/* Wrapper span for disabled button */}
                                    <IconButton 
                                      size="small" 
                                      onClick={handleRefreshNotifications}
                                      disabled={loading}
                                    >
                                      <RefreshIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {notifications.length > 0 && (
                                  <Tooltip title="Đánh dấu tất cả đã đọc">
                                    <span> {/* Wrapper span for disabled button */}
                                      <IconButton 
                                        size="small" 
                                        onClick={handleMarkAllAsRead}
                                        disabled={unreadCount === 0 || loading}
                                      >
                                        <MarkEmailReadIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          }
                          sx={{ 
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            py: 1,
                            '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' }
                          }}
                        />
                        
                        <Box sx={{ overflowY: 'auto', flex: 1 }}>
                          {loading ? (
                            <Box p={2} textAlign="center">
                              <CircularProgress size={24} />
                              <Typography variant="body2" color="text.secondary" mt={1}>
                                Đang tải thông báo...
                              </Typography>
                            </Box>
                          ) : notifications.length === 0 ? (
                            <Box p={3} textAlign="center">
                              <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                              <Typography variant="body1" color="text.secondary">
                                Không có thông báo nào
                              </Typography>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                sx={{ mt: 2 }}
                                onClick={handleRefreshNotifications}
                              >
                                Làm mới
                              </Button>
                            </Box>
                          ) : (
                            <List disablePadding>
                              {notifications.map((notification) => (
                                <NotificationItem
                                  key={notification._id}
                                  notification={notification}
                                  onClick={() => handleNotificationItemClick(notification)}
                                  onMarkAsRead={() => handleMarkAsRead(notification._id)}
                                  onDelete={handleDeleteNotification}
                                />
                              ))}
                            </List>
                          )}
                        </Box>
                        
                        {notifications.length > 0 && (
                          <CardActions sx={{ 
                            justifyContent: 'space-between', 
                            borderTop: '1px solid', 
                            borderColor: 'divider',
                            p: 1
                          }}>
                            <Tooltip title={unreadCount === 0 ? "Không có thông báo chưa đọc" : ""}>
                              <span> {/* Wrapper span for disabled button */}
                                <Button 
                                  size="small" 
                                  color="primary"
                                  onClick={handleMarkAllAsRead}
                                  disabled={unreadCount === 0 || loading}
                                  startIcon={<MarkEmailReadIcon />}
                                >
                                  Đánh dấu tất cả đã đọc
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={loading ? "Đang xử lý..." : ""}>
                              <span> {/* Wrapper span for disabled button */}
                                <Button 
                                  size="small" 
                                  color="error"
                                  onClick={handleClearAllNotifications}
                                  disabled={loading}
                                  startIcon={<DeleteIcon />}
                                >
                                  Xóa tất cả
                                </Button>
                              </span>
                            </Tooltip>
                          </CardActions>
                        )}
                      </Paper>
                    </Fade>
                  )}
                </Popper>
                
                {/* Click ra ngoài để đóng popup */}
                {notificationAnchor && (
                  <ClickAwayListener 
                    onClickAway={handleCloseNotification}
                    mouseEvent="onMouseDown"
                    touchEvent="onTouchStart"
                  >
                    <Box 
                      sx={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        zIndex: 1299 
                      }} 
                      onClick={handleCloseNotification}
                    />
                  </ClickAwayListener>
                )}
              </>
            ) : (
              // Nếu chưa đăng nhập, hiển thị nút đăng nhập
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
                startIcon={<PersonIcon />}
              >
                Đăng nhập
              </Button>
            )}
            
            {/* User Menu - Chỉ hiển thị khi đã đăng nhập */}
            {isLoggedIn && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <IconButton
                  onClick={handleMenuOpen}
                  color="inherit"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  size="large"
                  sx={{
                    p: 0,
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  {currentUser?.avatar ? (
                    <Avatar
                      alt={currentUser.name || 'User'}
                      src={currentUser.avatar}
                      sx={{ width: 36, height: 36 }}
                    />
                  ) : (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                      }}
                    >
                      {getUserInitials(currentUser?.name || 'User')}
                    </Avatar>
                  )}
                  <Box sx={{ ml: 1, textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.1, textTransform: 'capitalize' }}>
                      {currentUser?.name || 'Người dùng'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.1 }}>
                      {currentUser?.isAdmin ? 'Quản trị viên' : 'Nhân viên'}
                    </Typography>
                  </Box>
                </IconButton>
              </Box>
            )}

            {/* Menu người dùng */}
            {isLoggedIn && (
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 40,
                      height: 40,
                      ml: -0.5,
                      mr: 1,
                    },
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
              >
                <MenuItem disabled>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="large" />
                  </ListItemIcon>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                      {currentUser?.name || 'Người dùng'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentUser?.email || 'user@example.com'}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {currentUser?.isAdmin ? 'Quản trị viên' : 'Nhân viên bán hàng'}
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem
                  component={RouterLink}
                  to="/profile"
                  onClick={handleMenuClose}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Hồ sơ cá nhân" />
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/settings"
                  onClick={handleMenuClose}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Cài đặt tài khoản" />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'error.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 'medium' }} />
                </MenuItem>
              </Menu>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <QuickSale open={quickSaleOpen} onClose={() => setQuickSaleOpen(false)} />
    </>
  );
};

export default Navbar;
