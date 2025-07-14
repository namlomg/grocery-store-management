import { format, isAfter, subDays, parseISO, differenceInDays, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Tạo ID ngẫu nhiên
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Hàm xác định trạng thái hạn sử dụng
export const getExpiryStatus = (expiryDate) => {
  try {
    if (!expiryDate) return 'unknown';
    
    // Xử lý trường hợp expiryDate là chuỗi hoặc đối tượng Date
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    
    // Kiểm tra nếu không phải là ngày hợp lệ
    if (isNaN(expiry.getTime())) {
      console.error('Ngày hết hạn không hợp lệ:', expiryDate);
      return 'unknown';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tính số ngày còn lại đến hạn
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Xác định trạng thái dựa trên số ngày còn lại
    if (diffDays < 0) return 'expired';     // Đã hết hạn
    if (diffDays <= 7) return 'warning';    // Cảnh báo (còn dưới 7 ngày)
    return 'safe';                          // Còn hạn
  } catch (error) {
    console.error('Lỗi khi xác định trạng thái hạn sử dụng:', error);
    return 'unknown';
  }
};

// Tính phần trăm ngày còn lại
export const calculateRemainingDaysPercentage = (expiryDate) => {
  if (!expiryDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return 0;
  
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((expiry - new Date(today.getFullYear(), today.getMonth(), 1)) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, Math.min(100, (diffDays / 30) * 100));
};

// Lấy thông tin hiển thị trạng thái
export const getStatusLabel = (expiryDate) => {
  const status = getExpiryStatus(expiryDate);
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(expiry.getTime())) return { label: 'Không xác định', color: 'default' };
  
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  switch (status) {
    case 'expired':
      return { 
        label: `Hết hạn ${Math.abs(diffDays)} ngày`,
        color: 'error',
        icon: <ErrorOutlineIcon fontSize="small" />
      };
    case 'warning':
      return { 
        label: `Còn ${diffDays} ngày`,
        color: 'warning',
        icon: <WarningAmberIcon fontSize="small" />
      };
    case 'safe':
      return { 
        label: `Còn ${diffDays} ngày`,
        color: 'success',
        icon: <CheckCircleOutlineIcon fontSize="small" />
      };
    default:
      return { 
        label: 'Không xác định',
        color: 'default',
        icon: <InfoOutlinedIcon fontSize="small" />
      };
  }
};

// Định dạng ngày tháng
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '';
  try {
    return format(new Date(date), formatStr, { locale: vi });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};
