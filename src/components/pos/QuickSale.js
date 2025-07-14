import React, { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box, Paper, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Chip, Tooltip, InputAdornment, FormControlLabel, Switch, Divider, Badge, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

// Icons
import PersonIcon from '@mui/icons-material/Person';
import {
  Search as SearchIcon, 
  Add as AddIcon, 
  Remove as RemoveIcon, 
  Delete as DeleteIcon, 
  Receipt as ReceiptIcon, 
  Close as CloseIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Keyboard as KeyboardIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getProducts, createOrder, getProductByBarcode, searchProducts } from '../../services/api';

const QuickSale = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: 'Khách lẻ', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isDebt, setIsDebt] = useState(false);
  const [debtAmount, setDebtAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerPayment, setCustomerPayment] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const searchTimeout = useRef(null);
  const barcodeInputRef = useRef(null);
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lọc sản phẩm dựa trên searchTerm
  const filteredProducts = React.useMemo(() => {
    console.log('Filtering products. Search term:', searchTerm, 'Products:', products);
    
    if (!searchTerm.trim()) {
      console.log('No search term, returning all products');
      return products;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = products
      .filter(product => product.stock > 0) // Chỉ hiển thị sản phẩm còn hàng
      .filter(product => 
        (product.name && product.name.toLowerCase().includes(term)) ||
        (product.barcode && product.barcode.toLowerCase().includes(term)) ||
        (product.description && product.description.toLowerCase().includes(term))
      )
      .slice(0, 9); // Giới hạn số lượng sản phẩm hiển thị
    
    console.log('Filtered products:', filtered);
    return filtered;
  }, [products, searchTerm]);

  // Khởi tạo và dừng quét mã vạch
  const stopBarcodeScanner = useCallback(() => {
    if (!isScanning) return;
    
    Quagga.offDetected();
    Quagga.stop();
    setIsScanning(false);
    setIsBarcodeMode(false);
  }, [isScanning]);

  // Biến lưu trạng thái quét
  const lastScanned = useRef({ code: null, time: 0 });
  const SCAN_INTERVAL = 1000; // Thời gian chờ giữa các lần quét (ms)

  // Cấu hình quét mã vạch
  const quaggaConfig = {
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: scannerRef.current,
      constraints: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: { min: 1, max: 2 },
        facingMode: 'environment'
      },
    },
    locator: {
      patchSize: 'medium',
      halfSample: true
    },
    numOfWorkers: navigator.hardwareConcurrency || 4, // Sử dụng số core CPU có sẵn
    frequency: 20, // Tăng tần suất quét
    decoder: {
      readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'code_39_reader', 'upc_reader'],
      multiple: false // Chỉ đọc một mã vạch mỗi lần
    },
    locate: true
  };

  // Xử lý kết quả quét mã vạch
  const onDetected = useCallback((result) => {
    const now = Date.now();
    const code = result?.codeResult?.code;
    
    // Bỏ qua nếu:
    // - Không có mã vạch
    // - Mã vạch giống lần quét trước và chưa đủ thời gian chờ
    if (!code || 
        (lastScanned.current.code === code && 
         now - lastScanned.current.time < SCAN_INTERVAL)) {
      return;
    }
    
    // Lưu thông tin lần quét
    lastScanned.current = { code, time: now };
    
    console.log('Barcode detected:', code);
    
      // Tìm sản phẩm theo mã vạch
      const product = products.find(p => p.barcode === code);
      if (product) {
        // Thêm sản phẩm vào giỏ hàng
        setCart(prevCart => {
          const existingItem = prevCart.find(item => item.product._id === product._id);
          
          if (existingItem) {
            // Nếu sản phẩm đã có trong giỏ, tăng số lượng lên 1
            return prevCart.map(item =>
              item.product._id === product._id
                ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
                : item
            );
          } else {
            // Nếu sản phẩm chưa có trong giỏ, thêm mới
            return [
              ...prevCart,
              {
                product,
                quantity: 1,
                price: product.price,
                total: product.price
              }
            ];
          }
        });
        
        enqueueSnackbar(`Đã thêm ${product.name} vào giỏ hàng`, { variant: 'success' });
        
        // Phát âm thanh thông báo
        if (typeof window !== 'undefined') {
          const audio = new Audio('/beep.mp3');
          audio.play().catch(e => console.log('Lỗi phát âm thanh:', e));
        }
      } else {
        enqueueSnackbar('Không tìm thấy sản phẩm với mã vạch này', { variant: 'warning' });
      }
  }, [products, enqueueSnackbar]);

  const startBarcodeScanner = useCallback(() => {
    if (!isBarcodeMode || isScanning) return;
    
    console.log('Starting barcode scanner...');
    setIsScanning(true);
    
    // Reset trạng thái quét trước đó
    lastScanned.current = { code: null, time: 0 };
    
    // Cập nhật target trước khi khởi tạo
    const currentConfig = {
      ...quaggaConfig,
      inputStream: {
        ...quaggaConfig.inputStream,
        target: scannerRef.current
      }
    };
    
    Quagga.init(currentConfig, function(err) {
      if (err) {
        console.error('Error initializing Quagga:', err);
        enqueueSnackbar('Không thể khởi tạo camera: ' + (err.message || 'Lỗi không xác định'), { 
          variant: 'error',
          autoHideDuration: 5000
        });
        setIsScanning(false);
        setIsBarcodeMode(false);
        return;
      }
      
      console.log('Quagga initialized successfully');
      
      // Xóa các sự kiện cũ trước khi thêm mới
      Quagga.offDetected();
      Quagga.onDetected(onDetected);
      
      // Bắt đầu quét (không sử dụng Promise)
      try {
        Quagga.start();
        console.log('Quagga started successfully');
        
        // Tự động lấy nét camera
        setTimeout(() => {
          if (scannerRef.current) {
            const video = scannerRef.current.querySelector('video');
            if (video) {
              video.autofocus = true;
              video.focus();
            }
          }
        }, 500); // Thêm độ trễ để đảm bảo video đã sẵn sàng
      } catch (err) {
        console.error('Error starting Quagga:', err);
        enqueueSnackbar('Không thể bắt đầu camera: ' + (err.message || 'Lỗi không xác định'), { 
          variant: 'error',
          autoHideDuration: 5000
        });
        setIsScanning(false);
        setIsBarcodeMode(false);
      }
    });
    
    // Cleanup khi component unmount
    return () => {
      console.log('Cleaning up barcode scanner...');
      Quagga.offDetected();
      Quagga.stop();
    };
  }, [isBarcodeMode, isScanning, onDetected, enqueueSnackbar]);

  // Xử lý sự kiện phím tắt
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bật chế độ barcode khi nhấn phím / và không ở trong ô input
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isBarcodeMode) {
          setIsBarcodeMode(true);
          // Tập trung vào vùng quét mã vạch
          if (scannerRef.current) {
            scannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      // Thoát chế độ barcode khi nhấn Escape
      if (e.key === 'Escape' && isBarcodeMode) {
        e.preventDefault();
        setIsBarcodeMode(false);
      }
      // Thêm sản phẩm nhanh bằng phím số
      if (e.key >= '1' && e.key <= '9' && e.ctrlKey && filteredProducts.length > 0) {
        const index = parseInt(e.key) - 1;
        if (index < filteredProducts.length) {
          addToCart(filteredProducts[index]);
        }
      }
    };

    // Thêm sự kiện click toàn màn hình để thoát chế độ quét
    const handleClickOutside = (e) => {
      if (isBarcodeMode && scannerRef.current && !scannerRef.current.contains(e.target)) {
        setIsBarcodeMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      stopBarcodeScanner();
    };
  }, [filteredProducts, stopBarcodeScanner, isBarcodeMode]);

  // Bật/tắt quét mã vạch khi thay đổi isBarcodeMode
  useEffect(() => {
    if (isBarcodeMode) {
      // Thêm một độ trễ nhỏ để đảm bảo DOM đã được cập nhật
      const timer = setTimeout(() => {
        startBarcodeScanner();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        stopBarcodeScanner();
      };
    } else {
      stopBarcodeScanner();
    }
    
    return () => {
      stopBarcodeScanner();
    };
  }, [isBarcodeMode, startBarcodeScanner, stopBarcodeScanner]);

  // Tìm kiếm sản phẩm
  useEffect(() => {
    console.log('Search term changed:', searchTerm);
    
    if (searchTerm.trim() === '') {
      console.log('Search term is empty, fetching all products');
      fetchAllProducts();
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        console.log('Searching for products with query:', searchTerm);
        setIsLoading(true);
        const response = await searchProducts(searchTerm);
        console.log('Search response:', response);
        
        if (response && response.success) {
          console.log('Found products:', response.data);
          setProducts(response.data || []);
        } else {
          console.log('No products found or error in response');
          setProducts([]);
        }
      } catch (error) {
        console.error('Error searching products:', error);
        enqueueSnackbar('Lỗi khi tìm kiếm sản phẩm: ' + (error.message || 'Lỗi không xác định'), { 
          variant: 'error' 
        });
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // Tăng thời gian debounce lên 500ms

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  // Gọi API lấy danh sách sản phẩm khi component được tải lần đầu
  useEffect(() => {
    console.log('Component mounted, fetching products...');
    fetchAllProducts();
  }, []);
  
  // Log khi danh sách sản phẩm thay đổi
  useEffect(() => {
    console.log('Products updated:', products);
  }, [products]);
  
  // Log khi filteredProducts thay đổi
  useEffect(() => {
    console.log('Filtered products updated:', filteredProducts);
  }, [filteredProducts]);

  // Lấy tất cả sản phẩm
  const fetchAllProducts = async () => {
    try {
      console.log('Fetching all products...');
      setIsLoading(true);
      const response = await getProducts();
      console.log('All products response:', response);
      if (response.success) {
        console.log('Setting products:', response.data);
        setProducts(response.data);
      } else {
        console.error('Failed to fetch products:', response.message);
      }
    } catch (error) {
      enqueueSnackbar('Lỗi khi tải danh sách sản phẩm', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý quét mã vạch
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const barcode = e.target.barcode.value.trim();
    if (!barcode) return;

    try {
      setIsLoading(true);
      const response = await getProductByBarcode(barcode);
      if (response.success && response.data) {
        addToCart(response.data);
        e.target.reset();
      } else {
        enqueueSnackbar('Không tìm thấy sản phẩm', { variant: 'warning' });
      }
    } catch (error) {
      enqueueSnackbar('Lỗi khi quét mã vạch', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };



  // Thêm sản phẩm vào giỏ hàng
  const addToCart = (product, quantity = 1) => {
    // Kiểm tra số lượng tồn kho
    if (product.stock < quantity) {
      enqueueSnackbar(`Số lượng tồn kho không đủ. Còn lại: ${product.stock}`, { variant: 'warning' });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product._id === product._id);
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
      
      // Kiểm tra lại tồn kho khi cộng dồn số lượng
      if (product.stock < newQuantity) {
        enqueueSnackbar(`Số lượng tồn kho không đủ. Còn lại: ${product.stock}`, { variant: 'warning' });
        return prevCart;
      }

      if (existingItem) {
        return prevCart.map(item =>
          item.product._id === product._id
            ? { 
                ...item, 
                quantity: newQuantity, 
                total: newQuantity * item.price 
              }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product,
          quantity,
          price: product.price,
          total: product.price * quantity
        }
      ];
    });
    
    // Thông báo thêm vào giỏ hàng thành công
    enqueueSnackbar(`Đã thêm ${product.name} vào giỏ hàng`, { variant: 'success' });
  };

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product._id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    );
  };

  // Xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product._id !== productId));
  };

  // Tính tổng tiền
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;
  const change = Math.max(0, customerPayment - total);

  // Xử lý thanh toán
  const handleCheckout = async () => {
    if (cart.length === 0) {
      enqueueSnackbar('Vui lòng thêm sản phẩm vào giỏ hàng', { variant: 'warning' });
      return;
    }

    // Kiểm tra thông tin khách hàng nếu thanh toán nợ
    if (isDebt) {
      if (!customer.name || !customer.name.trim()) {
        enqueueSnackbar('Vui lòng nhập tên khách hàng', { variant: 'error' });
        return;
      }
      if (!customer.phone || !customer.phone.trim()) {
        enqueueSnackbar('Vui lòng nhập số điện thoại khách hàng', { variant: 'error' });
        return;
      }
      
      // Kiểm tra định dạng số điện thoại (10-11 số, bắt đầu bằng 0)
      const phoneRegex = /^0[0-9]{9,10}$/;
      if (!phoneRegex.test(customer.phone.trim())) {
        enqueueSnackbar('Số điện thoại không hợp lệ', { variant: 'error' });
        return;
      }
    }
    
    // Nếu không phải thanh toán nợ thì kiểm tra số tiền thanh toán
    if (!isDebt && customerPayment < total) {
      enqueueSnackbar('Số tiền thanh toán không đủ', { variant: 'error' });
      return;
    }

    try {
      // Chuyển đổi paymentMethod sang dạng chữ thường để phù hợp với server
      const formatPaymentMethod = {
        'CASH': 'cash',
        'BANK_TRANSFER': 'banking',
        'MOMO': 'momo',
        'CREDIT_CARD': 'card',
        'DEBT': 'debt'
      }[paymentMethod] || 'cash';

      // Nếu là thanh toán nợ, cập nhật thông tin
      const paymentStatus = isDebt ? 'unpaid' : 'paid';
      const actualCustomerPayment = isDebt ? customerPayment : customerPayment;
      const debtAmount = isDebt ? (total - customerPayment) : 0;

      const orderData = {
        items: cart.map(item => ({
          product: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal,
        discount,
        total,
        customerPayment: actualCustomerPayment,
        change: isDebt ? 0 : Math.max(0, customerPayment - total),
        paymentMethod: formatPaymentMethod,
        customer: {
          ...customer,
          debt: isDebt ? (customer.debt || 0) + debtAmount : (customer.debt || 0)
        },
        notes: isDebt ? `Nợ: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debtAmount)}` : '',
        status: 'completed',
        paymentStatus,
        isDebt,
        debtAmount: isDebt ? debtAmount : 0
      };

      const response = await createOrder(orderData);
      
      if (response.success) {
        // Cập nhật lại danh sách sản phẩm để cập nhật số lượng tồn kho
        await fetchAllProducts();
        
        setCurrentReceipt(response.data);
        setReceiptOpen(true);
        setCart([]);
        setCustomer({ name: 'Khách lẻ', phone: '', debt: 0 });
        setCustomerPayment(0);
        setDiscount(0);
        setIsDebt(false);
        setDebtAmount(0);
        
        enqueueSnackbar(
          isDebt 
            ? `Đã tạo đơn nợ thành công. Số tiền nợ: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debtAmount)}`
            : 'Thanh toán thành công', 
          { variant: 'success' }
        );
      }
    } catch (error) {
      console.error('Lỗi khi thanh toán:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán', 
        { variant: 'error' }
      );
    }
  };

  // In hóa đơn
  const handlePrintReceipt = () => {
    window.print();
  };

  // Đóng hóa đơn
  const handleCloseReceipt = () => {
    setReceiptOpen(false);
  };

  // Render phím tắt
  const renderShortcutKeys = () => (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Chip 
        icon={<KeyboardIcon fontSize="small" />} 
        label="Ctrl + Số: Thêm nhanh sản phẩm" 
        size="small" 
        variant="outlined"
      />
      <Chip 
        icon={<QrCodeScannerIcon fontSize="small" />} 
        label="/: Bật quét mã vạch" 
        size="small" 
        variant="outlined"
      />
      <Chip 
        icon={<CloseIcon fontSize="small" />} 
        label="Esc: Thoát chế độ quét" 
        size="small" 
        variant="outlined"
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Cột sản phẩm */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={isBarcodeMode ? 'Đang quét mã vạch...' : 'Tìm kiếm sản phẩm...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    inputRef={barcodeInputRef}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {isBarcodeMode ? <QrCodeScannerIcon /> : <SearchIcon />}
                        </InputAdornment>
                      ),
                      endAdornment: isBarcodeMode && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              stopBarcodeScanner();
                              setSearchTerm('');
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Tooltip title={isBarcodeMode ? 'Tắt quét mã vạch' : 'Bật quét mã vạch (/)'}>
                    <IconButton
                      onClick={() => {
                        const newMode = !isBarcodeMode;
                        setIsBarcodeMode(newMode);
                        if (!newMode) {
                          setSearchTerm('');
                        }
                      }}
                      color={isBarcodeMode ? 'primary' : 'default'}
                    >
                      <QrCodeScannerIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {isBarcodeMode && (
                  <Box 
                    ref={scannerRef} 
                    sx={{ 
                      width: '100%',
                      height: '300px',
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: 1,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'black',
                      '& video, & canvas': {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      },
                      '& .drawingBuffer': {
                        display: 'none', // Ẩn canvas nếu không cần thiết
                      },
                      '& .overlay': {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: '2px solid #3f51b5',
                        zIndex: 1,
                      },
                    }}
                  >
                    {!isScanning ? (
                      <Typography variant="body1" color="white">
                        Đang khởi tạo camera...
                      </Typography>
                    ) : (
                      <div className="overlay">
                        <Box 
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '80%',
                            height: '100px',
                            border: '2px solid #ffeb3b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          <Typography variant="body1">Đưa mã vạch vào khung</Typography>
                        </Box>
                      </div>
                    )}
                  </Box>
                )}
              </Box>
            {renderShortcutKeys()}
          </Paper>

          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography>Đang tải sản phẩm...</Typography>
              </Box>
            ) : filteredProducts.length > 0 ? (
              <Grid container spacing={2}>
                {filteredProducts.map((product, index) => (
                  <Grid item xs={6} sm={4} md={3} key={product._id}>
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{
                        p: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                    >
                      <Box
                        component="img"
                        src={product.images?.[0] || '/placeholder-product.png'}
                        alt={product.name}
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          objectFit: 'cover', 
                          mb: 1,
                          opacity: product.stock > 0 ? 1 : 0.5
                        }}
                      />
                      <Typography 
                        variant="body2" 
                        noWrap 
                        sx={{ 
                          width: '100%',
                          textDecoration: product.stock <= 0 ? 'line-through' : 'none'
                        }}
                      >
                        {product.name}
                      </Typography>
                      <Typography 
                        variant="subtitle2" 
                        color={product.stock > 0 ? 'primary' : 'text.disabled'}
                        fontWeight="bold"
                      >
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(product.price)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={product.stock > 0 ? 'text.secondary' : 'error'}
                      >
                        Tồn: {product.stock} {product.unit || ''}
                      </Typography>
                      {product.barcode && (
                        <Typography variant="caption" color="text.disabled" display="block">
                          {product.barcode}
                        </Typography>
                      )}
                      {product.stock > 0 && (
                        <Chip
                          label={`${index + 1}`}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 'bold',
                            display: ['none', 'flex']
                          }}
                        />
                      )}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                height="100%"
                textAlign="center"
                p={3}
              >
                <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Không tìm thấy sản phẩm
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm 
                    ? 'Không có sản phẩm nào phù hợp với từ khóa tìm kiếm.'
                    : 'Không có sản phẩm nào trong kho.'
                  }
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Cột thanh toán */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Hóa đơn
            </Typography>

            {/* Thông tin khách hàng */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonIcon color={isDebt ? 'primary' : 'action'} sx={{ mr: 1 }} />
                <Typography variant="subtitle1" color={isDebt ? 'primary' : 'text.primary'}>Thông tin khách hàng</Typography>
                {isDebt && (
                  <Chip 
                    label="Bắt buộc" 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                    sx={{ ml: 1, fontSize: '0.7rem' }} 
                  />
                )}
              </Box>
              
              <TextField
                fullWidth
                label="Tên khách hàng"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                size="small"
                margin="normal"
                required={isDebt}
                error={isDebt && (!customer.name || !customer.name.trim())}
                helperText={isDebt && (!customer.name || !customer.name.trim()) ? 'Vui lòng nhập tên khách hàng' : ''}
                InputLabelProps={{
                  shrink: true,
                }}
                placeholder={isDebt ? 'Nhập tên khách hàng' : 'Khách lẻ'}
              />
              
              <TextField
                fullWidth
                label="Số điện thoại"
                value={customer.phone}
                onChange={(e) => {
                  // Chỉ cho phép nhập số
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setCustomer({ ...customer, phone: value });
                }}
                size="small"
                margin="normal"
                required={isDebt}
                error={isDebt && (!customer.phone || !/^0[0-9]{9,10}$/.test(customer.phone.trim()))}
                helperText={
                  isDebt && !customer.phone 
                    ? 'Vui lòng nhập số điện thoại' 
                    : (isDebt && !/^0[0-9]{9,10}$/.test(customer.phone.trim()) 
                        ? 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)' 
                        : '')
                }
                InputLabelProps={{
                  shrink: true,
                }}
                placeholder={isDebt ? 'Nhập số điện thoại' : 'Không bắt buộc'}
                inputProps={{
                  maxLength: 11
                }}
              />
              
              {isDebt && customer.debt > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng nợ hiện tại: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.debt)}</strong>
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Danh sách sản phẩm đã chọn */}
            <TableContainer sx={{ maxHeight: 300, mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell align="right">SL</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                    <TableCell align="center">Xóa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.product._id}>
                      <TableCell>
                        <Typography variant="body2">{item.product.name}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography variant="body2" sx={{ mx: 1 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(item.price)}
                      </TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(item.total)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFromCart(item.product._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Tổng thanh toán */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Tạm tính:</Typography>
                <Typography>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(subtotal)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Giảm giá:</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  sx={{ width: 100 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₫</InputAdornment>,
                  }}
                />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1">Tổng cộng:</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(total)}
                </Typography>
              </Box>

              <FormControl fullWidth size="small" margin="normal">
                <InputLabel>Phương thức thanh toán</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    // Nếu chọn thanh toán nợ, tự động điền thông tin
                    if (e.target.value === 'DEBT') {
                      setIsDebt(true);
                      setCustomerPayment(0);
                    } else {
                      setIsDebt(false);
                    }
                  }}
                  label="Phương thức thanh toán"
                >
                  <MenuItem value="CASH">Tiền mặt</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Chuyển khoản ngân hàng</MenuItem>
                  <MenuItem value="MOMO">Ví điện tử Momo</MenuItem>
                  <MenuItem value="CREDIT_CARD">Thẻ tín dụng</MenuItem>
                  <MenuItem value="DEBT">Ghi nợ</MenuItem>
                </Select>
              </FormControl>

              {isDebt && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="warning.contrastText" gutterBottom>
                    <strong>Chế độ thanh toán nợ</strong>
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    Khách hàng sẽ thanh toán sau. Vui lòng ghi chú thông tin khách hàng.
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label={isDebt ? "Số tiền đặt cọc (nếu có)" : "Khách thanh toán"}
                type="number"
                value={customerPayment}
                onChange={(e) => setCustomerPayment(Number(e.target.value) || 0)}
                margin="normal"
                disabled={isDebt && customerPayment === 0}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₫</InputAdornment>,
                  endAdornment: isDebt && (
                    <InputAdornment position="end">
                      <Button 
                        size="small" 
                        onClick={() => {
                          // Tự động điền số tiền đặt cọc là 0
                          setCustomerPayment(0);
                        }}
                        disabled={customerPayment === 0}
                      >
                        Không đặt cọc
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
              
              {isDebt && (
                <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.contrastText">
                    <strong>Tổng tiền:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    <strong>Đặt cọc:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customerPayment)}
                  </Typography>
                  <Typography variant="body2" color="error.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                    <strong>Còn nợ:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total - customerPayment)}
                  </Typography>
                </Box>
              )}

              {customerPayment > 0 && (
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography>Tiền thừa:</Typography>
                  <Typography
                    color={change > 0 ? 'error' : 'text.primary'}
                    fontWeight={change > 0 ? 'bold' : 'normal'}
                  >
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(change)}
                  </Typography>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                color={isDebt ? 'warning' : 'primary'}
                size="large"
                startIcon={<ReceiptIcon />}
                onClick={handleCheckout}
                disabled={cart.length === 0}
                sx={{ mt: 2 }}
              >
                {isDebt ? 'Xác nhận ghi nợ' : 'Thanh toán'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Hóa đơn */}
      <Dialog open={receiptOpen} onClose={handleCloseReceipt} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Hóa đơn bán hàng</Typography>
            <IconButton onClick={handleCloseReceipt}>
              <QrCodeScannerIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentReceipt && (
            <Box>
              <Box textAlign="center" mb={2}>
                <Typography variant="h6" gutterBottom>
                  Cửa hàng tạp hóa
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Điện thoại: 0909123456
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">
                  Mã hóa đơn: {currentReceipt.orderNumber}
                </Typography>
                <Typography variant="body2">
                  Ngày: {new Date(currentReceipt.createdAt).toLocaleString('vi-VN')}
                </Typography>
                <Typography variant="body2">
                  Nhân viên: {currentReceipt.staff}
                </Typography>
                <Typography variant="body2">
                  Khách hàng: {currentReceipt.customer.name}
                </Typography>
                {currentReceipt.customer.phone && (
                  <Typography variant="body2">
                    Điện thoại: {currentReceipt.customer.phone}
                  </Typography>
                )}
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên sản phẩm</TableCell>
                      <TableCell align="right">SL</TableCell>
                      <TableCell align="right">Đơn giá</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentReceipt.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(item.price)}
                        </TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Tạm tính:</Typography>
                  <Typography>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(currentReceipt.subtotal)}
                  </Typography>
                </Box>
                {currentReceipt.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Giảm giá:</Typography>
                    <Typography>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(currentReceipt.discount)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle1">Tổng cộng:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(currentReceipt.total)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Khách thanh toán:</Typography>
                  <Typography>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(currentReceipt.customerPayment)}
                  </Typography>
                </Box>
                {currentReceipt.change > 0 && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Tiền thừa:</Typography>
                    <Typography fontWeight="bold">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(currentReceipt.change)}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box mt={2} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Cảm ơn quý khách!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hẹn gặp lại
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReceipt} color="primary">
            Đóng
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePrintReceipt}
            startIcon={<ReceiptIcon />}
          >
            In hóa đơn
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickSale;
