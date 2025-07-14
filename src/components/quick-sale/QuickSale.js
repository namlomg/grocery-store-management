import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Paper,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Tooltip,
  Snackbar,
  Alert,
  DialogContentText
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  CameraAlt as CameraIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Quagga from '@ericblade/quagga2';
import Invoice from '../invoice/Invoice';
import { useAppContext } from '../../context/AppContext';
import { createOrder } from '../../services/api';

// Đường dẫn đến file âm thanh
const beepSound = '/beep.mp3';

// Thêm style cho chế độ in
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #printable-invoice, #printable-invoice * {
      visibility: visible;
    }
    #printable-invoice {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      max-width: 100%;
      padding: 20px;
      margin: 0;
    }
    .no-print {
      display: none !important;
    }
  }
`;

// Thêm style vào head
const styleElement = document.createElement('style');
styleElement.type = 'text/css';
styleElement.appendChild(document.createTextNode(printStyles));
document.head.appendChild(styleElement);

const QuickSale = ({ open, onClose }) => {
  const { state, dispatch } = useAppContext();
  const { products } = state;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerPayment, setCustomerPayment] = useState('');
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const invoiceRef = useRef();
  const searchInputRef = useRef();
  const scannerRef = useRef(null);
  const beepAudioRef = useRef(new Audio(beepSound));
  const scannerContainerRef = useRef(null);

  // Hàm thêm sản phẩm vào giỏ hàng
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prevCart, { ...product, quantity: 1 }];
    });
    
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Hàm phát âm thanh beep
  const playBeep = useCallback(() => {
    if (beepAudioRef.current) {
      beepAudioRef.current.currentTime = 0;
      beepAudioRef.current.play().catch(error => {
        console.error('Lỗi khi phát âm thanh:', error);
      });
    }
  }, []);

  // Khởi tạo quét mã vạch
  useEffect(() => {
    if (!showScanner) return;

    const initQuagga = async () => {
      // Đợi cho đến khi DOM được cập nhật
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!scannerRef.current) {
        console.error('Scanner container not found');
        return;
      }

      try {
        // Tạo container cho scanner nếu chưa tồn tại
        let container = scannerRef.current.querySelector('#scanner-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'scanner-container';
          container.style.width = '100%';
          container.style.height = '100%';
          container.style.position = 'relative';
          scannerRef.current.innerHTML = ''; // Xóa nội dung cũ nếu có
          scannerRef.current.appendChild(container);
        }
        
        // Cấu hình camera với các ràng buộc đơn giản hơn
        const constraints = {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: 'environment'
        };
        
        // Kiểm tra quyền truy cập camera trước
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: constraints
          });
          // Dừng stream sau khi kiểm tra
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.error('Lỗi khi kiểm tra camera:', error);
          throw error;
        }
        
        // Khởi tạo Quagga với cấu hình tối ưu cho mã vạch
        await Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current.querySelector('#scanner-container'),
            constraints: constraints,
            area: { // Giới hạn vùng quét để tăng độ chính xác
              top: '30%',
              right: '10%',
              left: '10%',
              bottom: '30%'
            },
            singleChannel: false  // Hỗ trợ đa kênh màu
          },
          decoder: {
            readers: [
              'code_128_reader',
              'ean_reader',
              'ean_8_reader',
              'code_39_reader',
              'code_39_vin_reader',
              'codabar_reader',
              'upc_reader',
              'upc_e_reader'
            ],
            debug: {
              drawBoundingBox: false,
              showFrequency: false,
              drawScanline: false,
              showPattern: false
            }
          },
          locate: true,
          numOfWorkers: Math.min(navigator.hardwareConcurrency || 4, 4),
          frequency: 10,
          multiple: false,
          debug: false
        }, (err) => {
          if (err) {
            console.error('Lỗi khởi tạo Quagga:', err);
            setSnackbar({
              open: true,
              message: 'Không thể khởi tạo máy quét mã vạch',
              severity: 'error'
            });
            setShowScanner(false);
            return;
          }
          
          Quagga.start();
          
          // Biến kiểm soát quá trình quét
          const scanState = {
            isProcessing: false,
            lastScannedCode: '',
            lastScannedTime: 0,
            scanAttempts: 0,
            MAX_SCAN_ATTEMPTS: 3,
            debounceTimer: null,
            lastProcessedCode: ''
          };
          
          // Hàm xử lý kết quả quét
          const processBarcode = (code) => {
            const now = Date.now();
            
            // Kiểm tra nếu mã vừa được xử lý gần đây
            if (code === scanState.lastProcessedCode && (now - scanState.lastScannedTime) < 1000) {
              console.log('Bỏ qua mã vạch vừa xử lý:', code);
              return;
            }
            
            // Cập nhật thời gian quét cuối cùng
            scanState.lastScannedTime = now;
            scanState.lastProcessedCode = code;
            scanState.isProcessing = true;
            
            console.log('Đang xử lý mã vạch:', code);
            
            // Tìm sản phẩm trong danh sách sản phẩm
            const product = products.find(p => p.barcode === code);
            
            if (product) {
              // Dừng quét khi tìm thấy sản phẩm
              Quagga.stop();
              setShowScanner(false);
              
              // Thêm sản phẩm vào giỏ hàng
              addToCart(product);
              
              // Hiển thị thông báo thành công
              setSnackbar({
                open: true,
                message: `Đã thêm ${product.name} vào giỏ hàng`,
                severity: 'success',
                autoHideDuration: 1000
              });
            } else {
              // Hiển thị thông báo lỗi
              setSnackbar({
                open: true,
                message: 'Không tìm thấy sản phẩm với mã vạch này',
                severity: 'error',
                autoHideDuration: 1000
              });
            }
            
            // Reset trạng thái xử lý sau khi hiển thị thông báo
            setTimeout(() => {
              scanState.isProcessing = false;
            }, 1000);
          };
          
          // Xử lý sự kiện quét mã vạch với debounce
          Quagga.onDetected((result) => {
            if (!result?.codeResult?.code) {
              scanState.scanAttempts++;
              if (scanState.scanAttempts >= scanState.MAX_SCAN_ATTEMPTS) {
                setSnackbar({
                  open: true,
                  message: 'Không nhận diện được mã vạch. Vui lòng thử lại',
                  severity: 'error',
                  autoHideDuration: 2000
                });
                scanState.scanAttempts = 0;
              }
              return;
            }
            
            const code = result.codeResult.code;
            
            // Xóa timer cũ nếu có
            if (scanState.debounceTimer) {
              clearTimeout(scanState.debounceTimer);
            }
            
            // Đặt timer mới với độ trễ 300ms
            scanState.debounceTimer = setTimeout(() => {
              if (!scanState.isProcessing) {
                processBarcode(code);
              }
            }, 300);
            
            // Phát âm thanh khi quét được mã vạch
            playBeep();
            
            // Tìm sản phẩm trong danh sách sản phẩm
            const product = products.find(p => p.barcode === code);
            
            if (product) {
              // Dừng quét khi tìm thấy sản phẩm
              Quagga.stop();
              setShowScanner(false);
              
              // Thêm sản phẩm vào giỏ hàng
              addToCart(product);
              
              // Hiển thị thông báo thành công
              setSnackbar({
                open: true,
                message: `Đã thêm ${product.name} vào giỏ hàng`,
                severity: 'success',
                autoHideDuration: 1000
              });
              
              // Reset trạng thái xử lý sau khi hiển thị thông báo
              setTimeout(() => {
                scanState.isProcessing = false;
                scanState.lastScannedCode = '';
              }, 1500);
            } else {
              // Hiển thị thông báo lỗi
              setSnackbar({
                open: true,
                message: 'Không tìm thấy sản phẩm với mã vạch này',
                severity: 'error',
                autoHideDuration: 1000
              });
              
              // Reset trạng thái xử lý sau khi hiển thị thông báo
              setTimeout(() => {
                scanState.isProcessing = false;
              }, 1000);
            }
          });
        });
      } catch (error) {
        console.error('Lỗi truy cập camera:', error);
        setSnackbar({
          open: true,
          message: `Không thể truy cập camera: ${error.message || 'Vui lòng cấp quyền truy cập camera'}`,
          severity: 'error'
        });
        setShowScanner(false);
      }
    };

    initQuagga();

    // Dọn dẹp khi unmount hoặc đóng scanner
    return () => {
      if (Quagga.initialized) {
        Quagga.offDetected();
        Quagga.stop();
        // Xóa container khi đóng scanner
        if (scannerRef.current) {
          scannerRef.current.innerHTML = '';
        }
      }
    };
  }, [showScanner, products, addToCart]);

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toString().includes(searchTerm))
  );

  // Print invoice handler
  const handlePrintInvoice = useCallback(() => {
    if (currentOrder) {
      // Thêm class để ẩn các phần không cần thiết khi in
      document.body.classList.add('printing');
      
      // Kích hoạt in
      window.print();
      
      // Sau khi in xong, xóa class
      const afterPrint = () => {
        document.body.classList.remove('printing');
        window.removeEventListener('afterprint', afterPrint);
      };
      
      window.addEventListener('afterprint', afterPrint);
    }
  }, [currentOrder]);

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Update quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Hàm tạo mã đơn hàng
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}${month}${day}-${random}`;
  };
  
  // Hàm tạo mã đơn hàng theo định dạng ORDER-0001
  const generateOrderNumberV2 = () => {
    const count = Math.floor(Math.random() * 1000) + 1;
    return `ORDER-${count.toString().padStart(4, '0')}`;
  };

  // Hàm tạo mã đơn hàng tạm thời
  const generateTempOrderNumber = () => {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000);
    return `TEMP-${timestamp}-${random}`;
  };

  // Handle checkout
  const handleCheckout = async () => {
    const subtotal = calculateTotal();
    const discount = 0;
    const total = subtotal - discount;
    const payment = parseFloat(customerPayment) || 0;
    const change = Math.max(0, payment - total);
    
    if (payment < total) {
      setSnackbar({
        open: true,
        message: 'Số tiền khách đưa không đủ!',
        severity: 'error'
      });
      return;
    }
    
    // Kiểm tra tồn kho trước khi thanh toán
    const outOfStockItems = [];
    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        outOfStockItems.push({
          name: item.name,
          available: 0,
          requested: item.quantity,
          error: 'Không tìm thấy sản phẩm trong kho'
        });
      } else if (product.stock < item.quantity) {
        outOfStockItems.push({
          name: item.name,
          available: product.stock,
          requested: item.quantity,
          error: 'Không đủ hàng tồn kho'
        });
      }
    });

    if (outOfStockItems.length > 0) {
      const errorMessage = `Không thể thanh toán do một số sản phẩm không đủ tồn kho:\n${outOfStockItems
        .map(item => `- ${item.name}: ${item.error || `Còn ${item.available}, Yêu cầu: ${item.requested}`}`)
        .join('\n')}`;
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
        autoHideDuration: 10000 // Hiển thị lâu hơn để đọc thông báo
      });
      return;
    }
  
  try {
    // Tạo đơn hàng mới
    const orderData = {
      items: cart.map(item => {
        const product = products.find(p => p.id === item.id);
        return {
          product: product._id || product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          total: product.price * item.quantity,
          unit: product.unit || 'cái',
          originalStock: product.stock // Lưu lại số lượng tồn kho ban đầu
        };
      }),
      subtotal,
      discount,
      total,
      customerPayment: payment,
      change,
      paymentMethod: 'cash',
      customer: {
        name: customerName || 'Khách lẻ',
        phone: '',
        address: ''
      },
      staff: 'Nhân viên 1',
      status: 'completed',
      notes: ''
    };
    
    console.log('Dữ liệu đơn hàng gửi đi:', JSON.stringify(orderData, null, 2));
    
    // Gọi API để lưu đơn hàng vào CSDL
    const response = await createOrder(orderData);
    
    if (response.success) {
      // Trừ số lượng tồn kho sau khi tạo đơn hàng thành công
      cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          dispatch({
            type: 'UPDATE_PRODUCT',
            payload: {
              ...product,
              stock: product.stock - item.quantity,
              sold: (product.sold || 0) + item.quantity
            }
          });
        }
      });
      
      // Tạo đơn hàng mới để hiển thị hóa đơn
      const newOrder = {
        id: response.data._id || `ORDER-${Date.now().toString().slice(-6)}`,
        customerName: orderData.customer.name,
        date: new Date().toISOString(),
        items: orderData.items,
        total: orderData.total,
        customerPayment: orderData.customerPayment,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status,
        staff: 'Nhân viên 1'
      };
      
      setCurrentOrder(newOrder);
      setShowInvoice(true);
      
      // Lưu đơn hàng vào context
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      
      // Hiển thị thông báo thành công
      setSnackbar({
        open: true,
        message: 'Tạo đơn hàng thành công!',
        severity: 'success'
      });
      
      // Reset giỏ hàng sau khi thanh toán thành công
      setCart([]);
      setCustomerPayment('');
    }
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    setSnackbar({
      open: true,
      message: error.message || 'Có lỗi xảy ra khi tạo đơn hàng',
      severity: 'error'
    });
  }
  };

  // Handle key press for quick add
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      addToCart(filteredProducts[0]);
    }
  };

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenScanner = () => {
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    if (scannerRef.current) {
      Quagga.stop();
    }
    setShowScanner(false);
  };

  return (
    <>
      {/* Scanner Dialog */}
      <Dialog
        open={showScanner}
        onClose={handleCloseScanner}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        BackdropProps={{ style: { backgroundColor: 'rgba(0,0,0,0.8)' } }}
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            maxWidth: '100%',
            width: '100%',
            maxHeight: '90vh'
          }
        }}
      >
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'black',
          color: 'white',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          <DialogTitle sx={{ 
            p: 2, 
            bgcolor: 'rgba(0,0,0,0.7)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" color="white">
                Quét mã vạch sản phẩm
              </Typography>
              <IconButton 
                onClick={handleCloseScanner} 
                color="inherit"
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <Box sx={{ 
            flex: 1, 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            mt: 6,
            mb: 2
          }}>
            <Box 
              ref={scannerRef}
              sx={{
                width: '100%',
                height: '60vh',
                maxWidth: '100%',
                position: 'relative',
                bgcolor: 'black',
                '& video': {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
                '& #scanner-container': {
                  width: '100%',
                  height: '100%',
                  '& video': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }
                },
                '& canvas.drawingBuffer, & canvas': {
                  display: 'none' // Ẩn canvas debug của Quagga
                }
              }}
            >
              <Box id="scanner-container" sx={{ width: '100%', height: '100%' }} />
            </Box>
            
            {/* Overlay hướng dẫn */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
              p: 2
            }}>
              <Box sx={{
                width: '80%',
                maxWidth: 300,
                height: 200,
                border: '2px solid #ffeb3b',
                borderRadius: 2,
                position: 'relative',
                '&::before, &::after': {
                  content: '""',
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderColor: '#ffeb3b',
                  borderStyle: 'solid',
                  borderWidth: 0
                },
                '&::before': {
                  top: 0,
                  left: 0,
                  borderTopWidth: 4,
                  borderLeftWidth: 4,
                  borderTopLeftRadius: 4
                },
                '&::after': {
                  top: 0,
                  right: 0,
                  borderTopWidth: 4,
                  borderRightWidth: 4,
                  borderTopRightRadius: 4
                },
                '& div:first-of-type': {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: 40,
                  '&::before, &::after': {
                    content: '""',
                    position: 'absolute',
                    width: 40,
                    height: 40,
                    borderColor: '#ffeb3b',
                    borderStyle: 'solid',
                    borderWidth: 0
                  },
                  '&::before': {
                    bottom: 0,
                    left: 0,
                    borderBottomWidth: 4,
                    borderLeftWidth: 4,
                    borderBottomLeftRadius: 4
                  },
                  '&::after': {
                    bottom: 0,
                    right: 0,
                    borderBottomWidth: 4,
                    borderRightWidth: 4,
                    borderBottomRightRadius: 4
                  }
                }
              }}>
                <div></div>
              </Box>
              
              <Typography 
                variant="body1" 
                color="white" 
                sx={{ 
                  mt: 3, 
                  textAlign: 'center',
                  textShadow: '0 0 8px rgba(0,0,0,0.8)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  px: 2,
                  py: 1,
                  borderRadius: 1
                }}
              >
                Đưa mã vạch vào khung hình
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: 'rgba(0,0,0,0.7)',
            textAlign: 'center',
            '& button': {
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }
          }}>
            <Button 
              variant="outlined" 
              onClick={handleCloseScanner}
              startIcon={<CloseIcon />}
              sx={{ minWidth: 150 }}
            >
              Đóng
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Main Quick Sale Dialog */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Bán hàng nhanh</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
            {/* Left side - Product search and list */}
            <Box flex={1} minWidth={isMobile ? '100%' : '50%'}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Tìm kiếm sản phẩm hoặc quét mã vạch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  inputRef={searchInputRef}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Tooltip title="Quét mã vạch">
                  <Button
                    variant="outlined"
                    onClick={handleOpenScanner}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <QrCodeScannerIcon />
                    {!isMobile && <Box component="span" ml={1}>Quét</Box>}
                  </Button>
                </Tooltip>
              </Box>
              
              {searchTerm && (
                <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <Box
                        key={product.id}
                        onClick={() => addToCart(product)}
                        sx={{
                          p: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Typography variant="subtitle2">{product.name}</Typography>
                        <Box display="flex" justifyContent="space-between" mt={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {product.price.toLocaleString()} đ/{product.unit}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tồn: {product.stock}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box p={2} textAlign="center" color="text.secondary">
                      Không tìm thấy sản phẩm
                    </Box>
                  )}
                </Paper>
              )}
              
              {/* Customer info */}
              <Box mt={2}>
                <TextField
                  fullWidth
                  label="Tên khách hàng"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Số tiền khách đưa"
                  type="number"
                  value={customerPayment}
                  onChange={(e) => setCustomerPayment(e.target.value)}
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                  }}
                />
              </Box>
            </Box>
            
            {/* Right side - Cart */}
            <Box flex={1} minWidth={isMobile ? '100%' : '50%'}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Giỏ hàng ({cart.length} sản phẩm)
              </Typography>
              
              <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        p: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.price.toLocaleString()} đ/{item.unit}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center">
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            color="primary"
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          
                          <TextField
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.id, parseInt(e.target.value) || 1)
                            }
                            type="number"
                            size="small"
                            inputProps={{
                              min: 1,
                              style: { textAlign: 'center', width: 40 },
                            }}
                            variant="outlined"
                          />
                          
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            color="primary"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          
                          <Typography variant="body1" mx={1} minWidth={80} textAlign="right">
                            {(item.price * item.quantity).toLocaleString()} đ
                          </Typography>
                          
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box p={2} textAlign="center" color="text.secondary">
                    Chưa có sản phẩm nào trong giỏ hàng
                  </Box>
                )}
              </Paper>
              
              {/* Order summary */}
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle1">Tạm tính:</Typography>
                  <Typography variant="subtitle1">
                    {calculateTotal().toLocaleString()} đ
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Tổng cộng:
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {calculateTotal().toLocaleString()} đ
                  </Typography>
                </Box>
                
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<ReceiptIcon />}
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  Thanh toán
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Invoice Dialog */}
      <Dialog
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="no-print">Xem trước hóa đơn</DialogTitle>
        <DialogContent>
          {currentOrder && (
            <div id="printable-invoice">
              <Invoice 
                order={currentOrder} 
                onClose={() => setShowInvoice(false)} 
              />
            </div>
          )}
        </DialogContent>
        <DialogActions className="no-print">
          <Button onClick={() => setShowInvoice(false)}>Đóng</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePrintInvoice}
          >
            In hóa đơn
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickSale;
