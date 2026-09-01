const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://gi-shop-api.onrender.com/api');

const getToken = () => localStorage.getItem('token');

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status} (${res.statusText})`);
    }
    throw new Error('Backend API server returned HTML instead of JSON. Ensure the Node.js backend server is running.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API Error');
  }
  return data;
};

// Auth & Profile
export const login = (data) => request('/login', { method: 'POST', body: JSON.stringify(data) });
export const googleLogin = (data) => request('/auth/google', { method: 'POST', body: JSON.stringify(data) });
export const register = (data) => request('/register', { method: 'POST', body: JSON.stringify(data) });
export const getMe = () => request('/me');
export const updateUserProfile = (data) => request('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
export const registerNotificationToken = (token, platform = 'web') => request('/notifications/register-token', { method: 'POST', body: JSON.stringify({ token, platform }) });

// Discovery
export const getCities = () => request('/cities');
export const getShops = (city) => request(`/shops${city ? `?city=${encodeURIComponent(city)}` : ''}`);
export const getShopDetails = (id) => request(`/shops/${id}`);
export const compareItems = (city, q) => {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (q) params.append('q', q);
  return request(`/items/compare?${params.toString()}`);
};

// Customer Orders & Invites
export const placeOrder = (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) });
export const getCustomerOrders = () => request('/customer/orders');
export const getCustomerInvites = () => request('/customer/invites');
export const respondToInvite = (id, action) => request(`/customer/invites/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) });
export const getCustomerHistory = () => request('/customer/history');

// Shopkeeper & Cashier APIs
export const getItems = () => request('/shop/items');
export const saveItem = (data) => request('/shop/items', { method: 'POST', body: JSON.stringify(data) });
export const editItem = (id, data) => request(`/shop/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteItem = (id) => request(`/shop/items/${id}`, { method: 'DELETE' });

export const toggleShopStatus = (isOpen) => request('/shop/status', { method: 'PUT', body: JSON.stringify({ isOpen }) });
export const getMyDetailedShop = () => request('/shop/details');
export const updateMyDetailedShop = (data) => request('/shop/details', { method: 'PUT', body: JSON.stringify(data) });

export const getShopOrders = () => request('/shop/orders');
export const acceptShopOrder = (id, packingMinutes) => request(`/shop/orders/${id}/accept`, { method: 'POST', body: JSON.stringify({ packingMinutes }) });
export const declineShopOrder = (id, reason) => request(`/shop/orders/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
export const completeShopOrder = (id) => request(`/shop/orders/${id}/complete`, { method: 'POST' });
export const cancelCustomerOrder = (id) => request(`/customer/orders/${id}/cancel`, { method: 'POST' });
export const updateOrderCollection = (id, collectionStatus) => request(`/customer/orders/${id}/collection`, { method: 'POST', body: JSON.stringify({ collectionStatus }) });

export const getCustomers = () => request('/shop/customers');
export const saveCustomer = (data) => request('/shop/customers', { method: 'POST', body: JSON.stringify(data) });
export const blockCustomer = (phone, reason) => request('/shop/customers/block', { method: 'PUT', body: JSON.stringify({ phone, reason }) });
export const unblockCustomer = (phone) => request('/shop/customers/unblock', { method: 'PUT', body: JSON.stringify({ phone }) });
export const terminateCustomer = (phone) => request('/shop/customers/terminate', { method: 'PUT', body: JSON.stringify({ phone }) });

export const getSales = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/shop/sales${query ? `?${query}` : ''}`);
};
export const saveSale = (data) => request('/shop/sales', { method: 'POST', body: JSON.stringify(data) });
export const updateSaleNote = (id, note) => request(`/shop/sales/${id}/note`, { method: 'PUT', body: JSON.stringify({ note }) });
export const saveSettlement = (data) => request('/shop/settlements', { method: 'POST', body: JSON.stringify(data) });
export const getCustomerLedger = (phone) => request(`/shop/ledger/${phone}`);

// Staff Management (Owner only)
export const inviteStaff = (identifier) => request('/shop/staff/invite', { method: 'POST', body: JSON.stringify({ identifier }) });
export const getStaff = () => request('/shop/staff');
export const deleteStaff = (id) => request(`/shop/staff/${id}`, { method: 'DELETE' });

// Super Manager APIs
export const getAdminShops = () => request('/admin/shops');
export const getAdminUsers = () => request('/admin/users');
export const getAdminCities = () => request('/admin/cities');
export const addAdminCity = (name) => request('/admin/cities', { method: 'POST', body: JSON.stringify({ name }) });
export const deleteAdminCity = (id) => request(`/admin/cities/${id}`, { method: 'DELETE' });
export const terminateShop = (shopId) => request('/admin/terminate-shop', { method: 'PUT', body: JSON.stringify({ shopId }) });
export const reactivateShop = (shopId) => request('/admin/reactivate-shop', { method: 'PUT', body: JSON.stringify({ shopId }) });
export const terminateUser = (userId) => request('/admin/terminate-user', { method: 'PUT', body: JSON.stringify({ userId }) });
export const reactivateUser = (userId) => request('/admin/reactivate-user', { method: 'PUT', body: JSON.stringify({ userId }) });
export const resetAdminPin = (userId, newPin) => request('/admin/reset-pin', { method: 'POST', body: JSON.stringify({ userId, newPin }) });

// Security PIN APIs
export const verifyPin = (pin) => request('/user/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) });
export const changePin = (currentPin, newPin) => request('/user/change-pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) });

// Customer Khata APIs (Read-Only)
export const getCustomerKhata = () => request('/customer/khata');
export const getCustomerShopKhata = (shopId) => request(`/customer/khata/${shopId}`);
