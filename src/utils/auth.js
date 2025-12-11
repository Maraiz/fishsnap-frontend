// utils/auth.js
// ⭐ Updated untuk Cookie-Based Authentication (bukan localStorage)

import axiosInstance from './axiosConfig';

export const AUTH_KEYS = {
  USER: 'user', // Hanya user data yang disimpan di localStorage
  USER_ID: 'userId'
};

// ⭐ IMPORTANT: Tokens ada di httpOnly cookies, tidak bisa diakses dari JavaScript
// Jadi kita tidak perlu getAuthToken() lagi

// ⭐ Get user data dari localStorage
export const getUserData = () => {
  try {
    const userData = localStorage.getItem(AUTH_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// ⭐ Check if user is logged in - cek dari user data di localStorage
export const isLoggedIn = () => {
  const user = getUserData();
  return !!user; // Jika ada user data, berarti logged in
};

// ⭐ Get user ID
export const getUserId = () => {
  const userData = getUserData();
  return userData?.id || localStorage.getItem(AUTH_KEYS.USER_ID);
};

// ⭐ Clear all auth data (logout)
export const clearAuthData = () => {
  // Clear localStorage
  localStorage.removeItem(AUTH_KEYS.USER);
  localStorage.removeItem(AUTH_KEYS.USER_ID);
  
  // Clear cookies via API
  axiosInstance.delete('/logout').catch(err => {
    console.error('Logout error:', err);
  });
  
  // Dispatch logout event
  window.dispatchEvent(new Event('userLoggedOut'));
};

// ⭐ Store auth data (login) - hanya simpan user data, token di cookie
export const setAuthData = (userData) => {
  if (userData) {
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData));
    
    if (userData.id) {
      localStorage.setItem(AUTH_KEYS.USER_ID, userData.id.toString());
    }
  }
  
  // Dispatch login event
  window.dispatchEvent(new Event('userLoggedIn'));
};

// ⭐ DEPRECATED: Tidak perlu lagi karena pakai axiosInstance
// Token otomatis dikirim via cookies
export const makeAuthenticatedRequest = async (url, options = {}) => {
  console.warn('makeAuthenticatedRequest is deprecated, use axiosInstance instead');
  
  try {
    const fullUrl = url.startsWith('http') ? url : `http://45.158.126.83:5000${url}`;
    
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include', // Penting untuk cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Handle token expiry
    if (response.status === 401) {
      console.warn('Token expired or invalid, clearing auth data');
      clearAuthData();
      window.location.href = '/login';
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Authenticated request failed:', error);
    throw error;
  }
};

// ⭐ DEPRECATED: Headers otomatis dihandle oleh axiosInstance
export const getAuthHeaders = () => {
  console.warn('getAuthHeaders is deprecated with cookie-based auth');
  return {
    'Content-Type': 'application/json'
  };
};

// ⭐ Check if user is verified
export const isUserVerified = () => {
  const userData = getUserData();
  return userData?.is_verified === true;
};

// ⭐ Get user role
export const getUserRole = () => {
  const userData = getUserData();
  return userData?.role || 'user';
};

// ⭐ Check if user is admin
export const isAdmin = () => {
  return getUserRole() === 'admin';
};

// ⭐ Verify session - cek apakah token masih valid
export const verifySession = async () => {
  try {
    const response = await axiosInstance.get('/users');
    
    if (response.data) {
      // Update user data di localStorage
      setAuthData(response.data);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Session verification failed:', error);
    
    // Jika 401/403, berarti token invalid
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthData();
      return false;
    }
    
    return false;
  }
};

// ⭐ Initialize auth - cek session saat app load
export const initializeAuth = async () => {
  const user = getUserData();
  
  if (!user) {
    return false; // Not logged in
  }
  
  // Verify token masih valid
  return await verifySession();
};

// ⭐ Handle login response
export const handleLoginResponse = (data) => {
  // Token sudah tersimpan di cookie oleh backend
  // Kita hanya perlu simpan user data
  
  if (data.user) {
    setAuthData(data.user);
  }
  
  console.log('✅ Login successful, user data saved');
};

// ⭐ Handle logout
export const handleLogout = async () => {
  try {
    await axiosInstance.delete('/logout');
    clearAuthData();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    // Tetap clear data lokal meskipun API error
    clearAuthData();
    window.location.href = '/login';
  }
};