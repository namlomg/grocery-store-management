import axios from 'axios';

// Tạo instance axios mặc định
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hàm để lấy token mới (nếu cần)
const refreshToken = async () => {
  try {
    const response = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, {
      refreshToken: localStorage.getItem('refreshToken')
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Đăng xuất nếu không thể refresh token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return null;
  }
};

// Thêm interceptor cho request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor cho response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Nếu lỗi 401 và chưa thử gọi lại
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        if (newToken) {
          // Cập nhật token mới vào header
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          // Gọi lại request ban đầu với token mới
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Nếu không thể refresh token, đăng xuất người dùng
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Xử lý các lỗi khác
    if (error.response) {
      // Lỗi từ server (4xx, 5xx)
      const { status, data } = error.response;
      
      if (status === 403) {
        // Không có quyền truy cập
        console.error('Access denied:', data.message || 'You do not have permission to perform this action');
      } else if (status === 404) {
        // Không tìm thấy tài nguyên
        console.error('Resource not found:', data.message || 'The requested resource was not found');
      } else if (status >= 500) {
        // Lỗi server
        console.error('Server error:', data.message || 'An error occurred on the server');
      }
    } else if (error.request) {
      // Không nhận được phản hồi từ server
      console.error('No response from server. Please check your connection.');
    } else {
      // Lỗi khi thiết lập request
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const login = async (email, password) => {
  try {
    console.log('Sending login request for:', email);
    const response = await api.post('/auth/login', { email, password });
    
    console.log('Login response:', response.data);
    
    if (!response.data.token) {
      throw new Error('Không nhận được token từ máy chủ');
    }
    
    // Lưu token và thông tin người dùng vào localStorage
    localStorage.setItem('token', response.data.token);
    
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    // Cập nhật header Authorization mặc định
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    
    console.log('Login successful, token saved');
    
    return response.data;
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Xóa thông tin đăng nhập cũ nếu có lỗi
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    
    // Xử lý thông báo lỗi
    let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
    
    if (error.response) {
      // Lỗi từ server
      errorMessage = error.response.data?.message || errorMessage;
    } else if (error.request) {
      // Không nhận được phản hồi từ server
      errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }
    
    throw new Error(errorMessage);
  }
};

export const logout = async () => {
  try {
    // Gọi API logout ở đây nếu cần
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Xóa tất cả thông tin đăng nhập
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    
    // Xóa header Authorization
    delete api.defaults.headers.common['Authorization'];
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = '/login';
  }
};

// Products API
export const getProducts = async (params = {}) => {
  try {
    console.log('Fetching products with params:', params);
    const response = await api.get('/products', { 
      params: {
        ...params,
        sort: 'name',
        status: 'active',
        limit: 1000 // Lấy nhiều sản phẩm hơn cho chức năng tìm kiếm
      } 
    });
    console.log('Products API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await api.post('/products', productData);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id, productData) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Orders API
export const getOrders = async (params = {}) => {
  try {
    const response = await api.get('/orders', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const getOrderById = async (id) => {
  try {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export const createOrder = async (orderData) => {
  try {
    // Nếu là đơn nợ, cập nhật thông tin thanh toán
    if (orderData.isDebt) {
      orderData.paymentStatus = 'unpaid';
      
      // Nếu có đặt cọc, cập nhật số tiền đã thanh toán
      if (orderData.customerPayment > 0) {
        orderData.paymentStatus = 'partial';
      }
      
      // Thêm ghi chú về số tiền nợ
      if (!orderData.notes) {
        orderData.notes = '';
      }
      orderData.notes += `\nKhách nợ: ${new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      }).format(orderData.debtAmount || 0)}`;
    }
    
    const response = await api.post('/orders', orderData);
    
    // Nếu là đơn nợ, cập nhật thông tin công nợ của khách hàng
    if (orderData.isDebt && orderData.customer) {
      try {
        await api.put(`/customers/${orderData.customer._id || 'new'}/debt`, {
          amount: orderData.debtAmount || 0,
          orderId: response.data._id,
          description: `Đơn hàng #${response.data.orderNumber}`
        });
      } catch (debtError) {
        console.error('Lỗi khi cập nhật công nợ khách hàng:', debtError);
        // Vẫn trả về đơn hàng nếu có lỗi khi cập nhật công nợ
        return response.data;
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Lấy sản phẩm theo mã vạch
export const getProductByBarcode = async (barcode) => {
  try {
    const response = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    throw error;
  }
};

// Tìm kiếm sản phẩm nhanh
export const searchProducts = async (query) => {
  try {
    const response = await api.get('/products/search', {
      params: { q: query, limit: 10 }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Inventory API
export const getInventory = async (params = {}) => {
  try {
    const response = await api.get('/inventory', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const importInventory = async (productId, data) => {
  try {
    const response = await api.post(`/inventory/import/${productId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error importing inventory:', error);
    throw error;
  }
};

export const exportInventory = async (productId, data) => {
  try {
    const response = await api.post(`/inventory/export/${productId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error exporting inventory:', error);
    throw error;
  }
};

export const getInventoryHistory = async (productId, params = {}) => {
  try {
    const response = await api.get(`/inventory/history/${productId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    throw error;
  }
};

// Expiry API
export const getExpiringProducts = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Không tìm thấy token trong localStorage');
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    console.log('Đang gọi API /products/expiring với token:', token.substring(0, 20) + '...');
    
    const response = await api.get('/products/expiring', { 
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response:', {
      status: response.status,
      data: response.data
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching expiring products:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    
    if (error.response?.status === 401) {
      // Token hết hạn, thử refresh token
      try {
        console.log('Token hết hạn, đang thử refresh token...');
        await refreshToken();
        const newToken = localStorage.getItem('token');
        console.log('Đã refresh token mới:', newToken ? 'Có' : 'Không');
        
        const response = await api.get('/products/expiring', { 
          params,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      } catch (refreshError) {
        console.error('Lỗi sau khi refresh token:', refreshError);
        // Xử lý đăng xuất nếu refresh token thất bại
        if (refreshError.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw refreshError;
      }
    }
    
    throw error;
  }
};

export const getExpiryAlerts = async (days = 7) => {
  try {
    const response = await api.get(`/products/expiry-alerts?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expiry alerts:', error);
    throw error;
  }
};

export const updateProductExpiry = async (productId, data) => {
  try {
    const response = await api.put(`/products/${productId}/expiry`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating product expiry:', error);
    throw error;
  }
};

// Report API
export const getTotalProducts = async () => {
  try {
    const response = await api.get('/reports/products/total');
    return response.data;
  } catch (error) {
    console.error('Error fetching total products:', error);
    throw error;
  }
};

export const getExpiringProductsCount = async (days = 30) => {
  try {
    const response = await api.get(`/reports/products/expiring-count?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expiring products count:', error);
    throw error;
  }
};

// Báo cáo bán hàng
export const getSalesReport = async (params = {}) => {
  try {
    const { startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    
    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());
    
    const response = await api.get(`/sale-reports/sales?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
};

// Sản phẩm bán chạy
export const getTopSellingProductsReport = async (params = {}) => {
  try {
    const { startDate, endDate, limit = 10 } = params;
    const queryParams = new URLSearchParams();
    
    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());
    if (limit) queryParams.append('limit', limit);
    
    const response = await api.get(`/sale-reports/products/top-selling?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching top selling products report:', error);
    throw error;
  }
};

export const getTodayRevenue = async () => {
  try {
    const response = await api.get('/reports/revenue/today');
    return response.data;
  } catch (error) {
    console.error('Error fetching today revenue:', error);
    throw error;
  }
};

export const getLowStockProducts = async (threshold = 10) => {
  try {
    const response = await api.get(`/reports/products/low-stock?threshold=${threshold}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    throw error;
  }
};

export const getTopSellingProducts = async (limit = 5, period = 'day') => {
  try {
    const response = await api.get(`/reports/products/top-selling?limit=${limit}&period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching top selling products:', error);
    throw error;
  }
};

// Users API
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // Thử lấy từ API trước để đảm bảo dữ liệu mới nhất
    const response = await api.get('/auth/me');
    
    if (response.data) {
      // Lưu thông tin user mới nhất vào localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }
    
    // Nếu API không trả về dữ liệu, thử lấy từ localStorage
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      try {
        return JSON.parse(userFromStorage);
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
        localStorage.removeItem('user');
      }
    }
    
    return null;
  } catch (error) {
    // Nếu có lỗi mạng hoặc server, thử lấy từ localStorage
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.warn('Network error, using cached user data');
      const userFromStorage = localStorage.getItem('user');
      if (userFromStorage) {
        try {
          return JSON.parse(userFromStorage);
        } catch (e) {
          console.error('Error parsing cached user data:', e);
          localStorage.removeItem('user');
        }
      }
    }
    
    // Nếu lỗi 401 (token hết hạn), xóa thông tin đăng nhập
    if (error.response?.status === 401) {
      console.log('Token expired, logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      console.error('Error getting current user:', error);
    }
    
    return null;
  }
};

// Debt Management API
const debtApi = {
  // Lấy danh sách công nợ
  getDebts: async (params = {}) => {
    try {
      const response = await api.get('/debts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching debts:', error);
      throw error;
    }
  },

  // Lấy chi tiết một công nợ
  getDebtById: async (id) => {
    try {
      const response = await api.get(`/debts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching debt ${id}:`, error);
      throw error;
    }
  },

  // Tạo thanh toán công nợ
  createDebtPayment: async (debtId, paymentData) => {
    try {
      const response = await api.post(`/debts/${debtId}/payments`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error creating debt payment:', error);
      throw error;
    }
  },

  // Cập nhật thông tin công nợ
  updateDebt: async (debtId, updateData) => {
    try {
      const response = await api.put(`/debts/${debtId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating debt ${debtId}:`, error);
      throw error;
    }
  },

  // Lấy lịch sử thanh toán công nợ
  getDebtPayments: async (debtId) => {
    try {
      const response = await api.get(`/debts/${debtId}/payments`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payments for debt ${debtId}:`, error);
      throw error;
    }
  },

  // Lấy thống kê công nợ
  getDebtStats: async () => {
    try {
      const response = await api.get('/debts/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching debt stats:', error);
      throw error;
    }
  },

  // Tìm kiếm công nợ theo khách hàng
  searchDebtsByCustomer: async (query) => {
    try {
      const response = await api.get('/debts/search', { params: { q: query } });
      return response.data;
    } catch (error) {
      console.error('Error searching debts:', error);
      throw error;
    }
  }
};

export { debtApi };
export default api;
