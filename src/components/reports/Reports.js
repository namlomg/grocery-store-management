import React, { useState, useEffect } from 'react';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as ProductIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subMonths, parseISO } from 'date-fns';
import { formatCurrency, formatDate } from '../../utils/format';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  getSalesReport,
  getTopSellingProductsReport
} from '../../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [salesChartData, setSalesChartData] = useState({ labels: [], datasets: [] });
  const [productsChartData, setProductsChartData] = useState({ labels: [], datasets: [] });

  // Sử dụng hàm formatDate từ utils/format

  // Hàm xử lý in báo cáo
  const handlePrintReport = () => {
    // Tạo nội dung báo cáo dựa trên loại báo cáo hiện tại
    let printContent = '';
    const title = reportType === 'sales' ? 'BÁO CÁO BÁN HÀNG' : 'BÁO CÁO SẢN PHẨM BÁN CHẠY';
    const dateRangeText = `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    
    // Tạo tiêu đề báo cáo
    printContent += `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2>CỬA HÀNG TẠP HÓA NHÀ TÔI</h2>
        <h3>${title}</h3>
        <p>Thời gian: ${dateRangeText}</p>
      </div>
    `;

    // Thêm bảng dữ liệu tùy theo loại báo cáo
    if (reportType === 'sales' && salesData.length > 0) {
      printContent += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ngày</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Mã đơn hàng</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Khách hàng</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Số lượng</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
      `;

      salesData.forEach((item, index) => {
        printContent += `
          <tr key="${index}">
            <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(item.date, 'dd/MM/yyyy')}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.orderId || 'N/A'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.customer || 'Khách lẻ'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.itemCount || 0}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.amount?.toLocaleString() || '0'} đ</td>
          </tr>
        `;
      });

      // Tính tổng doanh thu
      const totalRevenue = salesData.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      printContent += `
          <tr>
            <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Tổng cộng:</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${totalRevenue.toLocaleString()} đ</td>
          </tr>
        </tbody>
      </table>
      `;
    } else if (reportType === 'products' && productData.length > 0) {
      printContent += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">STT</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tên sản phẩm</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Số lượng bán</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
      `;

      productData.forEach((product, index) => {
        printContent += `
          <tr key="${index}">
            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${product.name || 'N/A'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${product.quantity?.toLocaleString() || '0'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${product.revenue?.toLocaleString() || '0'} đ</td>
          </tr>
        `;
      });

      // Tính tổng doanh thu
      const totalRevenue = productData.reduce((sum, product) => sum + (product.revenue || 0), 0);
      
      printContent += `
          <tr>
            <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Tổng doanh thu:</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${totalRevenue.toLocaleString()} đ</td>
          </tr>
        </tbody>
      </table>
      `;
    } else {
      printContent += '<p>Không có dữ liệu để hiển thị</p>';
    }

    // Thêm chân trang
    printContent += `
      <div style="text-align: right; margin-top: 50px;">
        <div style="margin-bottom: 40px;">
          <p>Ngày in: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p>Người in: ${localStorage.getItem('userName') || 'Quản trị viên'}</p>
        </div>
      </div>
    `;

    // Mở cửa sổ in
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1.6cm; font-family: Arial, sans-serif; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f5f5f5; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h2, h3 { margin: 5px 0; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">In báo cáo</button>
            <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Đóng</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Lấy dữ liệu báo cáo
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (reportType === 'sales') {
        // Lấy báo cáo bán hàng
        const salesReport = await getSalesReport({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        
        // Chuyển đổi dữ liệu để hiển thị
        const formattedSalesData = [];
        salesReport.data.dailyData.forEach(day => {
          day.orders.forEach(order => {
            formattedSalesData.push({
              id: order.orderId,
              date: order.date,
              orderId: order.orderId,
              customer: order.customer || 'Khách lẻ',
              amount: order.total,
              status: order.status,
              itemCount: order.itemCount
            });
          });
        });
        
        setSalesData(formattedSalesData);
        
        // Chuẩn bị dữ liệu cho biểu đồ doanh thu
        const chartLabels = salesReport.data.dailyData.map(day => formatDate(day._id));
        const chartData = salesReport.data.dailyData.map(day => day.totalSales);
        
        setSalesChartData({
          labels: chartLabels,
          datasets: [
            {
              label: 'Doanh thu',
              data: chartData,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        });
        
        // Cập nhật summary data
        setSummaryData([
          { 
            label: 'Tổng doanh thu', 
            value: salesReport.data.summary.totalRevenue, 
            icon: <MoneyIcon />, 
            color: 'success.main' 
          },
          { 
            label: 'Tổng đơn hàng', 
            value: salesReport.data.summary.totalOrders, 
            icon: <ShoppingCartIcon />, 
            color: 'primary.main' 
          },
          { 
            label: 'Số lượng sản phẩm', 
            value: salesReport.data.summary.totalItems, 
            icon: <TrendIcon />, 
            color: 'info.main' 
          },
        ]);
      } else if (reportType === 'products') {
        // Lấy báo cáo sản phẩm bán chạy
        const productsReport = await getTopSellingProductsReport({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: 100 // Lấy tối đa 100 sản phẩm
        });
        
        setProductData(productsReport.data);
        
        // Chuẩn bị dữ liệu cho biểu đồ sản phẩm bán chạy (top 5)
        const topProducts = [...productsReport.data].sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);
        
        setProductsChartData({
          labels: topProducts.map(p => p.name),
          datasets: [
            {
              label: 'Số lượng bán',
              data: topProducts.map(p => p.totalSold),
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
              ],
              borderWidth: 1,
            },
          ],
        });
        
        // Tính tổng doanh thu và số lượng bán
        const totalRevenue = productsReport.data.reduce((sum, item) => sum + item.totalRevenue, 0);
        const totalSold = productsReport.data.reduce((sum, item) => sum + item.totalSold, 0);
        
        setSummaryData([
          { 
            label: 'Tổng doanh thu', 
            value: totalRevenue, 
            icon: <MoneyIcon />, 
            color: 'success.main' 
          },
          { 
            label: 'Số lượng bán', 
            value: totalSold, 
            icon: <ShoppingCartIcon />, 
            color: 'primary.main' 
          },
          { 
            label: 'Sản phẩm', 
            value: productsReport.data.length, 
            icon: <ProductIcon />, 
            color: 'info.main' 
          },
        ]);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo:', err);
      setError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  // Gọi API khi thay đổi loại báo cáo hoặc khoảng thời gian
  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
    setPage(0);
    setSalesData([]);
    setProductData([]);
  };

  const handleStartDateChange = (date) => {
    setDateRange(prev => ({ ...prev, startDate: date }));
  };

  const handleEndDateChange = (date) => {
    setDateRange(prev => ({ ...prev, endDate: date }));
  };
  
  // Làm mới dữ liệu
  const handleRefresh = () => {
    fetchReportData();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Lấy dữ liệu hiện tại dựa trên loại báo cáo
  const currentData = reportType === 'sales' ? salesData : productData;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Báo cáo & Thống kê
        </Typography>
        <Box>
          <Tooltip title="In báo cáo">
            <IconButton 
              color="primary" 
              sx={{ mr: 1 }}
              onClick={handlePrintReport}
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xuất Excel">
            <IconButton color="success">
              <ExportIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Loại báo cáo</InputLabel>
              <Select
                value={reportType}
                onChange={handleReportTypeChange}
                label="Loại báo cáo"
              >
                <MenuItem value="sales">Báo cáo bán hàng</MenuItem>
                <MenuItem value="products">Báo cáo sản phẩm</MenuItem>
                <MenuItem value="inventory">Báo cáo tồn kho</MenuItem>
                <MenuItem value="revenue">Báo cáo doanh thu</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Từ ngày"
                value={dateRange.startDate}
                onChange={handleStartDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
                format="dd/MM/yyyy"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Đến ngày"
                value={dateRange.endDate}
                onChange={handleEndDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
                format="dd/MM/yyyy"
                minDate={dateRange.startDate}
              />
            </Grid>
          </LocalizationProvider>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<FilterIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Lọc dữ liệu'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Box sx={{ mt: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {summaryData.map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)',
                    transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
                    borderLeft: `4px solid ${item.color}`,
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
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          mb: 1
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography 
                        variant="h4" 
                        component="div"
                        sx={{
                          fontWeight: 700,
                          fontSize: '1.75rem',
                          lineHeight: 1.2,
                          color: 'text.primary'
                        }}
                      >
                        {typeof item.value === 'number' && item.value >= 1000
                          ? formatCurrency(item.value)
                          : item.value}
                      </Typography>
                    </div>
                    <Box 
                      sx={{
                        backgroundColor: `${item.color}15`,
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {React.cloneElement(item.icon, { 
                        sx: { 
                          color: item.color, 
                          fontSize: '2rem',
                          opacity: 0.9
                        } 
                      })}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Data Table */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {reportType === 'sales' ? 'Chi tiết bán hàng' : 'Sản phẩm bán chạy'}
          </Typography>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Tìm kiếm..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {reportType === 'sales' ? (
                  <>
                    <TableCell>Ngày</TableCell>
                    <TableCell>Mã đơn hàng</TableCell>
                    <TableCell>Khách hàng</TableCell>
                    <TableCell align="right">Số tiền</TableCell>
                    <TableCell>Trạng thái</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>Tên sản phẩm</TableCell>
                    <TableCell>Danh mục</TableCell>
                    <TableCell align="right">Đã bán</TableCell>
                    <TableCell align="right">Doanh thu</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={reportType === 'sales' ? 5 : 4} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={reportType === 'sales' ? 5 : 4} align="center" sx={{ py: 4 }}>
                    <Typography color="error">
                      {error}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : currentData.length > 0 ? (
                currentData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow hover key={`${row.id || index}-${row.orderId || ''}`}>
                      {reportType === 'sales' ? (
                        <>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.orderId || `#${index + 1}`}</TableCell>
                          <TableCell>{row.customer}</TableCell>
                          <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                              color={row.status === 'completed' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.category || 'Khác'}</TableCell>
                          <TableCell align="right">{row.totalSold || row.sold || 0}</TableCell>
                          <TableCell align="right">{formatCurrency(row.totalRevenue || row.revenue)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={reportType === 'sales' ? 5 : 4} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      Không có dữ liệu để hiển thị trong khoảng thời gian này
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={currentData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trong ${count} mục`
          }
        />
      </Paper>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Doanh thu theo ngày
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              {salesChartData.labels.length > 0 ? (
                <Bar
                  data={salesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return ` ${formatCurrency(context.raw)}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value, true);
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="textSecondary">
                    Không có dữ liệu doanh thu trong khoảng thời gian này
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Sản phẩm bán chạy
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              {productsChartData.labels.length > 0 ? (
                <Doughnut
                  data={productsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 12,
                          padding: 15,
                          font: {
                            size: 12
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return ` ${label}: ${value} sản phẩm (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="textSecondary">
                    Không có dữ liệu sản phẩm
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
