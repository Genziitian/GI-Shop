import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production Backend Host
const DEFAULT_HOST = 'https://gi-shop-api.onrender.com';

const TOKEN_KEY = '@shop_ledger_jwt_token';
const USER_KEY = '@shop_ledger_user_data';
const BASE_URL_KEY = '@shop_ledger_base_url';

let currentBaseUrl = DEFAULT_HOST;

export const initBaseUrl = async () => {
  try {
    const customUrl = await AsyncStorage.getItem(BASE_URL_KEY);
    if (customUrl) {
      currentBaseUrl = customUrl;
    } else {
      currentBaseUrl = DEFAULT_HOST;
    }
  } catch (e) {
    currentBaseUrl = DEFAULT_HOST;
  }
  return currentBaseUrl;
};

export const getBaseUrl = () => currentBaseUrl;

export const setCustomBaseUrl = async (url) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  currentBaseUrl = cleanUrl;
  await AsyncStorage.setItem(BASE_URL_KEY, cleanUrl);
};

export const resetBaseUrl = async () => {
  currentBaseUrl = DEFAULT_HOST;
  await AsyncStorage.removeItem(BASE_URL_KEY);
};

// Token & Session Storage
export const storeToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const storeUser = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};

export const getSupportSettings = async () => {
  return await fetchWithAuth('/support-settings');
};

// Generic Authenticated Fetch Wrapper
export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${currentBaseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.message.includes('Network request failed')) {
      throw new Error(`Unable to connect to backend server at ${currentBaseUrl}. Please ensure server is running.`);
    }
    throw error;
  }
};

// --- AUTH APIs ---
export const login = async ({ email, password }) => {
  const res = await fetchWithAuth('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    await storeToken(res.token);
    await storeUser({ ...res.user, shop: res.shop });
  }
  return res;
};

export const register = async (userData) => {
  return await fetchWithAuth('/api/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const getMe = async () => {
  return await fetchWithAuth('/api/me');
};

export const googleLogin = async (data) => {
  const res = await fetchWithAuth('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.token) {
    await storeToken(res.token);
    await storeUser({ ...res.user, shop: res.shop });
  }
  return res;
};

export const changePassword = async (currentPassword, newPassword) => {
  return await fetchWithAuth('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

// --- SHOPKEEPER APIs ---
export const getItems = async () => {
  return await fetchWithAuth('/api/shop/items');
};

export const saveItem = async (itemData) => {
  return await fetchWithAuth('/api/shop/items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
};

export const editItem = async (id, itemData) => {
  return await fetchWithAuth(`/api/shop/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(itemData),
  });
};

export const deleteItem = async (id) => {
  return await fetchWithAuth(`/api/shop/items/${id}`, {
    method: 'DELETE',
  });
};

export const getCustomers = async () => {
  return await fetchWithAuth('/api/shop/customers');
};

export const searchRegisteredCustomer = async (query) => {
  return await fetchWithAuth(`/api/shop/customers/search-registered?query=${encodeURIComponent(query)}`);
};

export const saveCustomer = async (customerData) => {
  return await fetchWithAuth('/api/shop/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
};

export const terminateCustomer = async (phone) => {
  return await fetchWithAuth('/api/shop/customers/terminate', {
    method: 'PUT',
    body: JSON.stringify({ phone }),
  });
};

export const saveSale = async (saleData) => {
  return await fetchWithAuth('/api/shop/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  });
};

export const saveSettlement = async (settlementData) => {
  return await fetchWithAuth('/api/shop/settlements', {
    method: 'POST',
    body: JSON.stringify(settlementData),
  });
};

export const getCustomerLedger = async (phone) => {
  return await fetchWithAuth(`/api/shop/ledger/${encodeURIComponent(phone)}`);
};

export const getShopSales = async () => {
  return await fetchWithAuth('/api/shop/sales');
};

export const updateSaleNote = async (saleId, note) => {
  return await fetchWithAuth(`/api/shop/sales/${saleId}/note`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  });
};

export const getShopOrders = async () => {
  return await fetchWithAuth('/api/shop/orders');
};

export const acceptShopOrder = async (orderId, packingMinutes) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ packingMinutes }),
  });
};

export const declineShopOrder = async (orderId, reason) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const completeShopOrder = async (orderId) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/complete`, {
    method: 'POST',
  });
};

export const updateShopOrderItems = async (orderId, items) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/update-items`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
};

export const requestShopOrderPayment = async (orderId, discount, paymentMethod) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/get-payment`, {
    method: 'POST',
    body: JSON.stringify({ discount, paymentMethod }),
  });
};

export const verifyShopOrderOTP = async (orderId, otp) => {
  return await fetchWithAuth(`/api/shop/orders/${orderId}/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
};

export const getStaff = async () => {
  return await fetchWithAuth('/api/shop/staff');
};

export const inviteStaff = async (identifier) => {
  return await fetchWithAuth('/api/shop/staff/invite', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
};

export const deleteStaff = async (staffId) => {
  return await fetchWithAuth(`/api/shop/staff/${staffId}`, {
    method: 'DELETE',
  });
};

export const getMyDetailedShop = async () => {
  return await fetchWithAuth('/api/shop/details');
};

export const updateMyDetailedShop = async (shopData) => {
  return await fetchWithAuth('/api/shop/details', {
    method: 'PUT',
    body: JSON.stringify(shopData),
  });
};

export const toggleShopStatus = async () => {
  return await fetchWithAuth('/api/shop/status', {
    method: 'PUT',
  });
};

// --- PIN SECURITY APIs ---
export const verifyPin = async (pin) => {
  return await fetchWithAuth('/api/user/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
};

export const changePin = async (currentPin, newPin) => {
  return await fetchWithAuth('/api/user/change-pin', {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin }),
  });
};

export const resetUserPin = async (userId, newPin) => {
  return await fetchWithAuth('/api/admin/reset-pin', {
    method: 'POST',
    body: JSON.stringify({ userId, newPin }),
  });
};

// --- CUSTOMER APIs ---
export const getCustomerOrders = async () => {
  return await fetchWithAuth('/api/customer/orders');
};

export const getCustomerHistory = async () => {
  return await fetchWithAuth('/api/customer/history');
};

export const updateUserProfile = async (profileData) => {
  return await fetchWithAuth('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const getCustomerKhata = async () => {
  return await fetchWithAuth('/api/customer/khata');
};

export const getCustomerShopKhata = async (shopId) => {
  return await fetchWithAuth(`/api/customer/khata/${shopId}`);
};

export const cancelCustomerOrder = async (orderId) => {
  return await fetchWithAuth(`/api/customer/orders/${orderId}/cancel`, { method: 'POST' });
};

export const updateOrderCollection = async (orderId, collectionStatus) => {
  return await fetchWithAuth(`/api/customer/orders/${orderId}/collection`, {
    method: 'POST',
    body: JSON.stringify({ collectionStatus }),
  });
};

export const getCities = async () => {
  return await fetchWithAuth('/api/cities');
};

export const getShops = async (city) => {
  return await fetchWithAuth(`/api/shops?city=${encodeURIComponent(city || '')}`);
};

export const getShopDetails = async (shopId) => {
  return await fetchWithAuth(`/api/shops/${shopId}`);
};

export const compareItems = async (city, query) => {
  return await fetchWithAuth(`/api/items/compare?city=${encodeURIComponent(city || '')}&q=${encodeURIComponent(query || '')}`);
};

export const placeOrder = async (orderData) => {
  return await fetchWithAuth('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

export const getCustomerInvites = async () => {
  return await fetchWithAuth('/api/customer/invites');
};

export const respondToInvite = async (inviteId, action) => {
  return await fetchWithAuth(`/api/customer/invites/${inviteId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
};
