import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { getProducts, getOrders, getCurrentUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const initialState = {
  products: [],
  orders: [],
  inventory: [],
  loading: true,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, loading: false };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload, loading: false };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload], loading: false };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? { ...product, ...action.payload } : product
        ),
        loading: false,
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
        loading: false,
      };
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        loading: false,
      };
    case 'UPDATE_INVENTORY':
      return {
        ...state,
        inventory: action.payload,
        loading: false,
      };
    default:
      return state;
  }
};

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();

  // Hàm kiểm tra xác thực
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return false;
      }
      
      // Kiểm tra token hợp lệ bằng cách gọi API lấy thông tin user
      const userResponse = await getCurrentUser();
      if (!userResponse || !userResponse.success) {
        localStorage.removeItem('token');
        navigate('/login');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      localStorage.removeItem('token');
      navigate('/login');
      return false;
    }
  }, [navigate]);

  // Tải dữ liệu sản phẩm khi component được mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kiểm tra đăng nhập trước
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Tải danh sách sản phẩm
        const productsResponse = await getProducts();
        if (productsResponse && productsResponse.success) {
          dispatch({ type: 'SET_PRODUCTS', payload: productsResponse.data });
        } else {
          throw new Error(productsResponse?.message || 'Không thể tải danh sách sản phẩm');
        }
        
        // Tải danh sách đơn hàng
        const ordersResponse = await getOrders();
        if (ordersResponse && ordersResponse.success) {
          dispatch({ type: 'SET_ORDERS', payload: ordersResponse.data });
        } else {
          console.warn('Không thể tải danh sách đơn hàng:', ordersResponse?.message);
        }
        
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.' 
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchData();
  }, [checkAuth]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export { AppProvider };

export default AppContext;
