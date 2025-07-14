import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiLogin(email, password);
      
      if (!response || !response.token) {
        throw new Error('Không nhận được token từ máy chủ');
      }
      
      // Lưu token vào localStorage
      localStorage.setItem('token', response.token);
      
      // Lấy thông tin người dùng nếu có trong response
      let user = response.user;
      
      // Nếu không có thông tin user trong response, gọi API để lấy
      if (!user) {
        try {
          user = await getCurrentUser();
        } catch (err) {
          console.error('Không thể lấy thông tin người dùng:', err);
          // Vẫn tiếp tục nếu không lấy được thông tin user
        }
      }
      
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        console.warn('Không có thông tin người dùng sau khi đăng nhập');
      }
      
      return user || {};
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear user data regardless of API call result
      setCurrentUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [navigate]);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!currentUser && !!localStorage.getItem('token');
  }, [currentUser]);

  // Check if user has required role
  const hasRole = useCallback((requiredRole) => {
    if (!currentUser) return false;
    return currentUser.role === requiredRole;
  }, [currentUser]);

  // Check if user is logged in on initial load
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userFromStorage = localStorage.getItem('user');
        
        if (!token || !userFromStorage) {
          if (isMounted) {
            setCurrentUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Set user from localStorage first for immediate UI update
        if (isMounted) {
          try {
            const parsedUser = JSON.parse(userFromStorage);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
            localStorage.removeItem('user');
          }
        }
        
        // Then verify with the server
        try {
          const userData = await getCurrentUser();
          
          if (isMounted) {
            if (userData) {
              setCurrentUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            } else {
              // If server returns no user data, clear auth
              console.warn('No user data returned from server');
              setCurrentUser(null);
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        } catch (err) {
          console.error('Error verifying token with server:', err);
          // Don't log out on network errors, use cached user
          if (isMounted && !token) {
            setCurrentUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
        if (isMounted) {
          setCurrentUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    currentUser,
    isAuthenticated,
    hasRole,
    login,
    logout,
    error,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
