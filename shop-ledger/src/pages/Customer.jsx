import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMe, getCities, getShops, getShopDetails, compareItems, placeOrder, 
  getCustomerOrders, getCustomerHistory, getCustomerInvites, respondToInvite,
  updateUserProfile, changePin, changePassword, verifyPin, getCustomerKhata, getCustomerShopKhata,
  cancelCustomerOrder, updateOrderCollection
} from '../lib/api';
import { notifyError } from '../lib/errorHandler';
import { MobileTopBar, MGroup, MRow, MSegment } from '../components/MobileKit';
import { registerPasskey, loginWithPasskey } from '../lib/passkey';
import { 
  Store, ShoppingCart, Receipt, Clock, MapPin, Search, Plus, Minus, 
  X, CheckCircle, AlertCircle, LogOut, Phone, ShieldCheck, UserCheck, 
  Tag, ArrowRight, AlertTriangle, Printer, FileText, Download, Key, Lock, User,
  MessageCircle, BookOpen, Fingerprint, Eye, EyeOff, FileSpreadsheet, Database, CheckSquare, Square, CalendarRange, Shield, Mail, Menu, Trash2, Globe
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import logoImg from '../assets/logo.png';
import OrderTimelineModal from '../components/OrderTimelineModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { ShopCardSkeleton, ProductGridSkeleton, OrderCardSkeleton, KhataOverviewSkeleton } from '../components/SkeletonLoader';

// Defensive helpers: bad/missing server data must never blank the screen.
const safeItems = (raw) => {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    return Array.isArray(v) ? v.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
};
const num = (v) => Number(v) || 0;
const money = (v) => `₹${num(v).toFixed(2)}`;
const lineAmount = (e) => num(e?.amount) || num(e?.rate) * num(e?.qty) || num(e?.item?.price) * num(e?.qty);
const orderTotal = (o, items) => (num(o?.estimatedTotal) > 0 ? num(o.estimatedTotal) : items.reduce((s, it) => s + lineAmount(it), 0));
const statusMeta = (st) => ({
  PENDING: { label: 'Pending', tone: 'amber' },
  PACKING: { label: 'Packing', tone: 'amber' },
  READY: { label: 'Ready for pickup', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  COLLECTED: { label: 'Collected', tone: 'green' },
  NOT_COLLECTED: { label: 'Not collected', tone: 'red' },
  CANCELLED_BY_CUSTOMER: { label: 'Cancelled', tone: 'red' },
  AUTO_CANCELLED_EXPIRED: { label: 'Expired', tone: 'red' },
  DECLINED: { label: 'Declined', tone: 'red' },
}[st] || { label: String(st || 'Order'), tone: 'grey' });

export default function Customer() {
  const [openCards, setOpenCards] = useState({});
  const toggleCard = (k) => setOpenCards(p => ({ ...p, [k]: !p[k] }));
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [staffRole, setStaffRole] = useState(null);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'compare' | 'khata' | 'orders'
  
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopSearch, setShopSearch] = useState('');
  
  // Selected Shop Showcase & Order Creator State
  const [activeShop, setActiveShop] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [activeCartShop, setActiveCartShop] = useState(null); // { id, name }
  const [orderList, setOrderList] = useState({}); // { [itemId]: { item, qty, amount } }
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');
  const [orderErrorMsg, setOrderErrorMsg] = useState('');

  // Cart Conflict Modal (Single-Shop Rule)
  const [cartConflict, setCartConflict] = useState(null); // { pendingItem, pendingShop }

  // Compare Tab State
  const [compareQuery, setCompareQuery] = useState('');
  const [compareResults, setCompareResults] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Orders & Purchases State
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [invites, setInvites] = useState([]);

  // Active Receipt & Order Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [selectedTimelineOrder, setSelectedTimelineOrder] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Customer Profile Modal & Settings State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [customerSettingsTab, setCustomerSettingsTab] = useState('profile'); // 'profile' | 'security' | 'export'
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    city: 'Delhi',
    address: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');

  // Security PIN State & Visibility
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  // Account Password Form & Visibility
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Customer Data Export & Backup State
  const [exportDateRange, setExportDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exportCategories, setExportCategories] = useState({
    orders: true,
    khata: true,
    profile: true,
    summary: true
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState('');
  const [exportError, setExportError] = useState('');

  // Customer Screen / Account Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [unlockMode, setUnlockMode] = useState('PIN'); // 'PIN' | 'PASSWORD'
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Date Filter State for All Orders & Receipts (Today, Yesterday, Month, Custom, All)
  const [ordersDateFilter, setOrdersDateFilter] = useState('All');
  const [ordersCustomStart, setOrdersCustomStart] = useState('');
  const [ordersCustomEnd, setOrdersCustomEnd] = useState('');

  // My Khata State
  const [khataOverview, setKhataOverview] = useState({ overallDue: 0, stores: [] });
  const [khataLoading, setKhataLoading] = useState(false);
  const [selectedKhataStore, setSelectedKhataStore] = useState(null);
  const [storeKhataDetails, setStoreKhataDetails] = useState(null);
  const [storeKhataLoading, setStoreKhataLoading] = useState(false);
  const [storeKhataFilter, setStoreKhataFilter] = useState('All');
  const [storeKhataCustomStart, setStoreKhataCustomStart] = useState('');
  const [storeKhataCustomEnd, setStoreKhataCustomEnd] = useState('');

  const loadUserData = async () => {
    try {
      const data = await getMe();
      setCurrentUser(data.user);
      if (data.user) {
        setProfileForm({
          name: data.user.name || '',
          phone: data.user.phone || '',
          city: data.user.city || 'Delhi',
          address: data.user.address || ''
        });
      }
      if (data.user.city) setSelectedCity(data.user.city);
      if (data.staffRole) setStaffRole(data.staffRole);

      const [cList, inv] = await Promise.all([getCities(), getCustomerInvites()]);
      setCities(cList);
      setInvites(inv);
    } catch (e) {
      if (e.message.includes('Unauthorized') || e.message.includes('terminated')) handleLogout();
    }
  };

  const loadShops = async (city) => {
    setShopsLoading(true);
    try {
      const data = await getShops(city);
      setShops(data);
    } catch (e) {
      console.error(e);
    } finally {
      setShopsLoading(false);
    }
  };

  const loadCompareData = async (city, q) => {
    setCompareLoading(true);
    try {
      const data = await compareItems(city, q);
      setCompareResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCompareLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await getCustomerOrders();
      setOrders(Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []));
    } catch (e) {
      console.error('Failed to load orders:', e);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      const data = await getCustomerHistory();
      setPurchases(Array.isArray(data?.sales) ? data.sales : (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error('Failed to load purchases:', e);
      setPurchases([]);
    }
  };

  const loadKhataData = async () => {
    setKhataLoading(true);
    try {
      const data = await getCustomerKhata();
      setKhataOverview(data || { overallDue: 0, stores: [] });
    } catch (e) {
      console.error('Failed to load khata overview:', e);
    } finally {
      setKhataLoading(false);
    }
  };

  const loadStoreKhataDetails = async (store) => {
    setSelectedKhataStore(store);
    setStoreKhataLoading(true);
    try {
      const shopId = store.shopId || store.id;
      const data = await getCustomerShopKhata(shopId);
      setStoreKhataDetails(data);
    } catch (e) {
      console.error('Failed to load store khata statement:', e);
    } finally {
      setStoreKhataLoading(false);
    }
  };

  const handleStartNewOrderFromStore = async (store) => {
    const shopId = store.shopId || store.id;
    try {
      const details = await getShopDetails(shopId);
      setSelectedKhataStore(null);
      setActiveShop(details);
      setActiveTab('explore');
      setOrderErrorMsg('');
      setOrderSuccessMsg('');
    } catch (e) {
      notifyError(e, 'Shop Catalog');
    }
  };

  const handleCancelCustomerOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel / take back this order? Once cancelled, this action is final and locked.')) {
      return;
    }
    try {
      await cancelCustomerOrder(orderId);
      await loadOrders();
      if (selectedOrderForDetails && selectedOrderForDetails.id === orderId) {
        setSelectedOrderForDetails({ ...selectedOrderForDetails, status: 'CANCELLED_BY_CUSTOMER' });
      }
    } catch (e) {
      notifyError(e, 'Cancel Order');
    }
  };

  const handleUpdateCustomerCollection = async (orderId, collectionStatus) => {
    const promptMsg = collectionStatus === 'COLLECTED' 
      ? 'Confirm that you have collected / received this order? Once marked, it is permanently locked.'
      : 'Confirm that this order was NOT collected? Once marked, it is permanently locked.';
    if (!window.confirm(promptMsg)) {
      return;
    }
    try {
      await updateOrderCollection(orderId, collectionStatus);
      await loadOrders();
      if (selectedOrderForDetails && selectedOrderForDetails.id === orderId) {
        setSelectedOrderForDetails({ ...selectedOrderForDetails, status: collectionStatus, collectionStatus });
      }
    } catch (e) {
      notifyError(e, 'Collection Status');
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    loadShops(selectedCity);
    if (activeTab === 'compare') loadCompareData(selectedCity, compareQuery);
  }, [selectedCity]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
      loadPurchases();
    }
    if (activeTab === 'khata') loadKhataData();
    if (activeTab === 'explore') loadShops(selectedCity);
    if (activeTab === 'compare') loadCompareData(selectedCity, compareQuery);
    if (activeTab === 'more') loadUserData();
  }, [activeTab]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleOpenProfileModal = () => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        city: currentUser.city || 'Delhi',
        address: currentUser.address || ''
      });
    }
    setProfileNotice('');
    setProfileError('');
    setPinNotice('');
    setPinError('');
    setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const cleanPhone = (profileForm.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setProfileError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setProfileSaving(true);
    setProfileNotice('');
    setProfileError('');
    try {
      const res = await updateUserProfile({
        ...profileForm,
        phone: cleanPhone
      });
      if (res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('userData', JSON.stringify(res.user));
        if (res.user.city) setSelectedCity(res.user.city);
      }
      setProfileNotice('Profile details updated successfully!');
      setTimeout(() => setProfileNotice(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinSaving(true);
    setPinNotice('');
    setPinError('');

    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError('New PIN and confirmation do not match');
      setPinSaving(false);
      return;
    }
    if (!/^\d{4}$/.test(pinForm.newPin)) {
      setPinError('PIN must be exactly 4 numeric digits');
      setPinSaving(false);
      return;
    }

    try {
      await changePin(pinForm.currentPin, pinForm.newPin);
      setPinNotice('4-digit PIN updated successfully!');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setTimeout(() => setPinNotice(''), 3000);
    } catch (err) {
      setPinError(err.message || 'Failed to update PIN');
    } finally {
      setPinSaving(false);
    }
  };

  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  const handleRegisterPasskey = async () => {
    setPasskeyRegistering(true);
    setPasskeyNotice('');
    setPasskeyError('');
    try {
      await registerPasskey(`${currentUser?.name || 'Customer'}'s Device`);
      setPasskeyNotice('Passkey registered successfully on this device! You can now log in with Face ID / Fingerprint.');
      setTimeout(() => setPasskeyNotice(''), 5000);
    } catch (err) {
      console.error('[Passkey Registration Error]', err);
      setPasskeyError(err.message || 'Passkey setup was cancelled or failed.');
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordNotice('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      setPasswordSaving(false);
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long');
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await changePassword(passwordForm.currentPassword || null, passwordForm.newPassword);
      setPasswordNotice(res.message || 'Password saved successfully!');
      setCurrentUser(prev => prev ? ({ ...prev, hasPasswordSet: 1 }) : prev);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordNotice(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to save password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUnlockWithPin = async (pinValue) => {
    const pin = pinValue || unlockPin;
    if (!pin || pin.length !== 4) {
      setUnlockError('Please enter full 4-digit PIN');
      return;
    }
    setUnlockLoading(true);
    setUnlockError('');
    try {
      await verifyPin(pin);
      setIsScreenLocked(false);
      setUnlockPin('');
      setUnlockError('');
    } catch (err) {
      setUnlockError(err.message || 'Incorrect PIN. Try again.');
      setUnlockPin('');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleUnlockWithPassword = async (e) => {
    if (e) e.preventDefault();
    if (!unlockPassword) {
      setUnlockError('Please enter your account password');
      return;
    }
    setUnlockLoading(true);
    setUnlockError('');
    try {
      await verifyPin(null, unlockPassword);
      setIsScreenLocked(false);
      setUnlockPassword('');
      setUnlockError('');
    } catch (err) {
      setUnlockError(err.message || 'Incorrect password. Try again.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleUnlockWithPasskey = async () => {
    setUnlockLoading(true);
    setUnlockError('');
    try {
      await loginWithPasskey();
      setIsScreenLocked(false);
      setUnlockPin('');
      setUnlockPassword('');
      setUnlockError('');
    } catch (err) {
      console.error('[Passkey Unlock Error]', err);
      setUnlockError(err.message || 'Passkey verification failed or was cancelled.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleKeypadPress = (digit) => {
    if (unlockPin.length < 4) {
      const newPin = unlockPin + digit;
      setUnlockPin(newPin);
      setUnlockError('');
      if (newPin.length === 4) {
        handleUnlockWithPin(newPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setUnlockPin(prev => prev.slice(0, -1));
    setUnlockError('');
  };

  // Helper: Filter customer records by date
  const filterCustomerRecordsByDate = (records, dateField = 'createdAt') => {
    if (!Array.isArray(records)) return [];
    if (exportDateRange === 'ALL') return records;

    const now = new Date();
    let start = new Date(0);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (exportDateRange === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (exportDateRange === '7DAYS') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (exportDateRange === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (exportDateRange === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (exportDateRange === 'CUSTOM') {
      if (exportStartDate) start = new Date(`${exportStartDate}T00:00:00`);
      if (exportEndDate) end = new Date(`${exportEndDate}T23:59:59`);
    }

    return records.filter(item => {
      const dStr = item[dateField] || item.createdAt || item.date;
      if (!dStr) return true;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d >= start && d <= end;
    });
  };

  // CSV Downloader
  const triggerCSVDownload = (filename, headers, rows) => {
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = '\uFEFF' + [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // JSON Downloader
  const triggerJSONDownload = (filename, data) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Customer Export CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    setExportNotice('');
    setExportError('');

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const userSlug = (currentUser?.name || 'Customer').replace(/\s+/g, '_');

      // 1. Orders
      if (exportCategories.orders) {
        const filteredOrders = filterCustomerRecordsByDate(orders, 'createdAt');
        const orderHeaders = ['Order Number', 'Date', 'Shop Name', 'Status', 'Estimated Total (₹)', 'Items'];
        const orderRows = filteredOrders.map(o => {
          let itemsText = '';
          try {
            const parsed = safeItems(o.itemsJSON);
            itemsText = parsed.map(i => `${i.name} (Qty: ${i.quantity || 1})`).join('; ');
          } catch(e) { itemsText = o.itemsJSON || ''; }

          return [
            o.orderNumber || o.id || '',
            o.createdAt || '',
            o.shopName || '',
            o.status || 'PENDING',
            o.estimatedTotal || 0,
            itemsText
          ];
        });
        triggerCSVDownload(`${userSlug}_Orders_${exportDateRange}_${todayStr}.csv`, orderHeaders, orderRows);
      }

      // 2. Khata Ledger
      if (exportCategories.khata) {
        const khataHeaders = ['Shop Name', 'Shop Phone', 'Outstanding Dues (₹)', 'Total Purchases (₹)', 'Settled (₹)'];
        const khataRows = (khataOverview.stores || []).map(s => [
          s.shopName || '',
          s.shopPhone || '',
          (s.netDue || 0).toFixed(2),
          (s.totalKhataPurchases || 0).toFixed(2),
          (s.totalSettlements || 0).toFixed(2)
        ]);
        triggerCSVDownload(`${userSlug}_Khata_Ledger_${todayStr}.csv`, khataHeaders, khataRows);
      }

      // 3. Profile & Summary
      if (exportCategories.summary) {
        const sumHeaders = ['Metric', 'Value'];
        const sumRows = [
          ['Customer Name', currentUser?.name || ''],
          ['Customer ID', currentUser?.shortId || ''],
          ['Email', currentUser?.email || ''],
          ['Phone', currentUser?.phone || ''],
          ['City', currentUser?.city || ''],
          ['Delivery Address', currentUser?.address || ''],
          ['Total Orders Placed', orders.length],
          ['Active Khata Dues (₹)', (khataOverview.overallDue || 0).toFixed(2)],
          ['Export Timestamp', new Date().toLocaleString()]
        ];
        triggerCSVDownload(`${userSlug}_Account_Summary_${todayStr}.csv`, sumHeaders, sumRows);
      }

      setExportNotice('Export complete! Spreadsheets downloaded successfully.');
      setTimeout(() => setExportNotice(''), 6000);
    } catch(err) {
      setExportError(err.message || 'Failed to export customer data.');
    } finally {
      setExportLoading(false);
    }
  };

  // Customer Export JSON
  const handleExportJSON = () => {
    setExportLoading(true);
    setExportNotice('');
    setExportError('');

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const userSlug = (currentUser?.name || 'Customer').replace(/\s+/g, '_');

      const masterBackup = {
        meta: {
          exportVersion: '1.0',
          exportedAt: new Date().toISOString(),
          customerName: currentUser?.name,
          customerId: currentUser?.shortId,
          email: currentUser?.email,
          phone: currentUser?.phone,
          city: currentUser?.city,
          address: currentUser?.address,
          dateRangeApplied: exportDateRange
        },
        orders: exportCategories.orders ? filterCustomerRecordsByDate(orders, 'createdAt') : undefined,
        khata: exportCategories.khata ? khataOverview : undefined,
        profile: exportCategories.profile ? profileForm : undefined
      };

      triggerJSONDownload(`${userSlug}_Full_Account_Backup_${exportDateRange}_${todayStr}.json`, masterBackup);
      setExportNotice('Full Master JSON Backup downloaded successfully!');
      setTimeout(() => setExportNotice(''), 6000);
    } catch(err) {
      setExportError(err.message || 'Failed to export JSON backup.');
    } finally {
      setExportLoading(false);
    }
  };

  // Customer Print Summary
  const handlePrintSummary = () => {
    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (!printWin) {
      alert('Popup blocked! Please allow popups to print statement.');
      return;
    }

    const filteredOrders = filterCustomerRecordsByDate(orders, 'createdAt');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentUser?.name || 'Customer'} - Account Statement</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1d2939; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #101828; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #0284c7; margin: 0; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e4e7ec; border-radius: 10px; padding: 12px; background: #f7f8fa; }
          .card-title { font-size: 11px; font-weight: 700; color: #667085; text-transform: uppercase; margin-bottom: 4px; }
          .card-val { font-size: 20px; font-weight: 800; color: #101828; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #d0d5dd; padding: 8px 10px; text-align: left; }
          th { background: #eff1f4; font-weight: 700; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e4e7ec; font-size: 11px; color: #98a2b3; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${currentUser?.name || 'Customer Statement'}</h1>
            <div style="font-size: 13px; color: #475467; margin-top: 2px;">
              Customer ID: <strong>${currentUser?.shortId || ''}</strong> • Phone: ${currentUser?.phone || ''}
            </div>
            <div style="font-size: 12px; color: #667085;">${currentUser?.address || ''}, ${currentUser?.city || ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">Period: ${exportDateRange}</div>
            <div style="font-size: 11px; color: #98a2b3; margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Total Orders Placed</div>
            <div class="card-val" style="color: #0284c7;">${orders.length}</div>
          </div>
          <div class="card">
            <div class="card-title">Active Khata Dues</div>
            <div class="card-val" style="color: ${(khataOverview.overallDue || 0) > 0 ? '#c2410c' : '#1f9d5a'};">₹${(khataOverview.overallDue || 0).toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">Active Linked Stores</div>
            <div class="card-val">${(khataOverview.stores || []).length}</div>
          </div>
        </div>

        <h3 style="margin: 16px 0 6px 0; font-size: 15px;">Recent Orders History (${filteredOrders.length} total)</h3>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Shop</th>
              <th>Status</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOrders.map(o => `
              <tr>
                <td><strong>${o.orderNumber || o.id}</strong></td>
                <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</td>
                <td>${o.shopName || 'Shop'}</td>
                <td>${o.status || 'PENDING'}</td>
                <td style="font-weight: 700;">₹${Number(o.estimatedTotal || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          GI SHOP Customer Ledger & Account Summary • Confidential
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleOpenShop = async (shop) => {
    try {
      const details = await getShopDetails(shop.id || shop.shopId);
      setActiveShop(details);
      setActiveTab('explore'); // Ensures shop showcase opens immediately!
      setOrderErrorMsg('');
      setOrderSuccessMsg('');
    } catch (e) {
      notifyError(e, 'Shop Catalog');
    }
  };

  // Smart Quantity & Unit Selector Modal State (Shopkeeper POS Experience for Customer)
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);
  const [selectedModalShop, setSelectedModalShop] = useState(null);
  const [modalSubUnitMode, setModalSubUnitMode] = useState('Piece'); // 'Piece' | 'Kilo' | 'Gram' | 'Litre' | 'ML'
  const [modalQtyInput, setModalQtyInput] = useState(1);
  const [modalDisplayQty, setModalDisplayQty] = useState('1');
  const [modalPriceInput, setModalPriceInput] = useState('');

  const openItemModal = (product, shop) => {
    if (!shop.isOpen) return;
    if (activeCartShop && activeCartShop.id !== shop.id && Object.keys(orderList).length > 0) {
      setCartConflict({ pendingItem: product, pendingShop: shop });
      return;
    }
    setSelectedModalProduct(product);
    setSelectedModalShop(shop);
    const defaultMode = product.unit === 'Litre' ? 'Litre' : (product.unit === 'Kilo' ? 'Kilo' : 'Piece');
    setModalSubUnitMode(defaultMode);
    const existing = orderList[product.id];
    const initialQty = existing ? existing.qty : 1;
    setModalQtyInput(initialQty);
    setDisplayQtyForMode(initialQty, defaultMode);
    setModalPriceInput((initialQty * product.price).toFixed(2));
  };

  const setDisplayQtyForMode = (qtyInBaseUnit, mode) => {
    if (mode === 'Gram' || mode === 'ML') {
      setModalDisplayQty((qtyInBaseUnit * 1000).toString());
    } else {
      setModalDisplayQty(qtyInBaseUnit.toString());
    }
  };

  const handleToggleModalSubUnitMode = (newMode) => {
    setModalSubUnitMode(newMode);
    setDisplayQtyForMode(modalQtyInput, newMode);
  };

  const handleModalDisplayQtyChange = (valStr) => {
    setModalDisplayQty(valStr);
    const valNum = parseFloat(valStr) || 0;
    let actualBaseQty = valNum;
    if (modalSubUnitMode === 'Gram' || modalSubUnitMode === 'ML') {
      actualBaseQty = valNum / 1000;
    }
    setModalQtyInput(actualBaseQty);
    if (selectedModalProduct) {
      setModalPriceInput((actualBaseQty * selectedModalProduct.price).toFixed(2));
    }
  };

  const handleModalPriceChange = (valStr) => {
    setModalPriceInput(valStr);
    const numericPrice = parseFloat(valStr) || 0;
    if (selectedModalProduct && selectedModalProduct.price > 0) {
      const calcBaseQty = parseFloat((numericPrice / selectedModalProduct.price).toFixed(3));
      setModalQtyInput(calcBaseQty);
      setDisplayQtyForMode(calcBaseQty, modalSubUnitMode);
    }
  };

  const handleSetModalPresetQty = (qtyInBaseUnit) => {
    setModalQtyInput(qtyInBaseUnit);
    setDisplayQtyForMode(qtyInBaseUnit, modalSubUnitMode);
    if (selectedModalProduct) {
      setModalPriceInput((qtyInBaseUnit * selectedModalProduct.price).toFixed(2));
    }
  };

  const handleConfirmAddModalItem = () => {
    if (!selectedModalProduct || modalQtyInput <= 0) return;
    const finalAmount = parseFloat(modalPriceInput) || (modalQtyInput * selectedModalProduct.price);
    const shopToSet = selectedModalShop || activeShop;
    if (shopToSet) {
      setActiveCartShop({ id: shopToSet.id, name: shopToSet.shopName });
    }
    setOrderList(prev => ({
      ...prev,
      [selectedModalProduct.id]: {
        item: selectedModalProduct,
        qty: modalQtyInput,
        rate: selectedModalProduct.price,
        amount: finalAmount
      }
    }));
    setSelectedModalProduct(null);
  };

  // Add Item to Cart with Single-Shop Rule
  const handleAddItemToCart = (item, shop) => {
    openItemModal(item, shop);
  };

  const handleResolveCartConflict = () => {
    if (!cartConflict) return;
    const { pendingItem, pendingShop } = cartConflict;
    
    // Clear old cart and open smart modal for new shop's item
    setActiveCartShop({ id: pendingShop.id, name: pendingShop.shopName });
    setOrderList({});
    setCartConflict(null);
    openItemModal(pendingItem, pendingShop);
  };

  const handleUpdateItemQty = (item, delta) => {
    const current = orderList[item.id]?.qty || 0;
    const newQty = Math.max(0, current + delta);
    
    if (newQty === 0) {
      const copy = { ...orderList };
      delete copy[item.id];
      setOrderList(copy);
      if (Object.keys(copy).length === 0) {
        setActiveCartShop(null);
        setShowCartModal(false);
      }
    } else {
      setOrderList({
        ...orderList,
        [item.id]: {
          item,
          qty: newQty,
          rate: item.price,
          amount: newQty * item.price
        }
      });
    }
  };

  const handleSendOrder = async () => {
    if (!activeCartShop || Object.keys(orderList).length === 0) return;
    setOrderSubmitting(true);
    setOrderSuccessMsg('');
    setOrderErrorMsg('');
    try {
      const itemsPayload = Object.values(orderList).map(e => ({
        item: e.item,
        qty: e.qty,
        rate: e.rate,
        amount: e.amount
      }));
      const totalAmount = Object.values(orderList).reduce((sum, e) => sum + e.amount, 0);
      await placeOrder({
        shopId: activeCartShop.id,
        items: itemsPayload,
        estimatedTotal: totalAmount,
        deliveryAddress: currentUser?.address || 'Customer Profile Address'
      });
      setOrderSuccessMsg(`Order placed successfully with ${activeCartShop.name}! Track progress under 'All Orders'.`);
      setOrderList({});
      setActiveCartShop(null);
      setShowCartModal(false);
      loadOrders();
      setTimeout(() => setOrderSuccessMsg(''), 5000);
    } catch (e) {
      setOrderErrorMsg(e.message || 'Failed to submit order.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleInviteResponse = async (inviteId, action) => {
    try {
      await respondToInvite(inviteId, action);
      loadUserData();
    } catch (e) {
      notifyError(e, 'Store Invitation');
    }
  };

  const totalCartItemCount = Object.values(orderList || {}).reduce((sum, e) => sum + (e?.qty || 0), 0);
  const totalOrderAmount = Object.values(orderList || {}).reduce((sum, e) => sum + (e?.amount || 0), 0);

  const safeShops = Array.isArray(shops) ? shops : [];
  const filteredShops = safeShops.filter(s => 
    (s?.shopName || '').toLowerCase().includes((shopSearch || '').toLowerCase()) ||
    (s?.shortId || '').toLowerCase().includes((shopSearch || '').toLowerCase()) ||
    (s?.shopAddress || '').toLowerCase().includes((shopSearch || '').toLowerCase())
  );

  const filteredShopItems = activeShop ? (Array.isArray(activeShop.items) ? activeShop.items : []).filter(i => 
    (i?.name || '').toLowerCase().includes((itemSearch || '').toLowerCase())
  ) : [];

  // Group compare results by product name
  const groupedCompare = {};
  const safeCompareResults = Array.isArray(compareResults) ? compareResults : [];
  safeCompareResults.forEach(item => {
    if (!item?.name) return;
    const key = item.name.toLowerCase().trim();
    if (!groupedCompare[key]) groupedCompare[key] = { displayName: item.name, unit: item.unit, offers: [] };
    groupedCompare[key].offers.push(item);
  });

  // Spending Analytics
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const totalSpentAll = safePurchases.reduce((sum, p) => sum + (Number(p?.total) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Phone app bar */}
      <MobileTopBar
        title={{ explore: 'Explore', compare: 'Compare', khata: 'My Khata', orders: 'Orders', more: 'Account' }[activeTab] || 'GI SHOP'}
        right={currentUser?.shortId ? <span className="m-chip-id">{currentUser.shortId}</span> : null}
      />

      {/* Desktop Top Header */}
      <div className="nav-bar desktop-only-flex" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logoImg} alt="GI SHOP" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f7a43', letterSpacing: '-0.02em' }}>GI SHOP</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {totalCartItemCount > 0 && (
            <button 
              type="button" 
              className="btn" 
              style={{ background: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => setShowCartModal(true)}
            >
              <ShoppingCart size={16} /> Cart ({totalCartItemCount})
            </button>
          )}

          {staffRole && (
            <button 
              type="button" 
              className="btn" 
              style={{ background: '#4338ca', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => navigate('/shop')}
            >
              <ShieldCheck size={16} /> Open Cashier Mode
            </button>
          )}

          {currentUser?.shortId && (
            <span 
              className="badge" 
              style={{ 
                background: '#e9f6ee', 
                color: 'var(--primary)', 
                border: '1px solid #bfe3cb', 
                padding: '0.35rem 0.65rem', 
                fontSize: '0.82rem', 
                fontWeight: '800', 
                borderRadius: '8px' 
              }}
            >
              ID: {currentUser.shortId}
            </span>
          )}

          {/* Quick Language Toggle Button */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'var(--border)',
              background: '#f7f8fa'
            }}
            title={language === 'en' ? 'हिंदी में बदलें (Switch to Hindi)' : 'Switch to English'}
          >
            <Globe size={15} color="var(--primary)" />
            <span>{language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}</span>
          </button>

          <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> {t('common.logout', 'Logout')}
          </button>
        </div>
      </div>

      <div className="container" style={{ flex: 1, marginTop: '1rem' }}>
        
        {/* Pending Staff Invites Banner */}
        {invites.map(inv => (
          <div key={inv.id} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: '700', color: '#5b21b6' }}>
                🎉 Staff Invitation from {inv.shopName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6d28d9', marginTop: '2px' }}>
                You have been invited to join as a <strong>Cashier</strong> for {inv.shopName} ({inv.city}).
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: '#7c3aed' }} onClick={() => handleInviteResponse(inv.id, 'ACCEPT')}>
                Accept & Join
              </button>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={() => handleInviteResponse(inv.id, 'DECLINE')}>
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* TAB 1: EXPLORE SHOPS */}
        {activeTab === 'explore' && !activeShop && (
          <div>
            {/* Filter Row: City Selector & Search Bar in 1 Single Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#e9f6ee', border: '1px solid #bfe3cb', padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <MapPin size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>City:</span>
                <select 
                  className="select" 
                  style={{ width: 'auto', margin: 0, padding: '0.2rem 0.4rem', fontSize: '0.88rem', fontWeight: '700', border: 'none', background: 'transparent' }}
                  value={selectedCity}
                  onChange={e => { setSelectedCity(e.target.value); setActiveShop(null); }}
                >
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  style={{ margin: 0, paddingLeft: '2.5rem', background: '#fff' }}
                  placeholder={`Search shops in ${selectedCity}...`}
                  value={shopSearch}
                  onChange={e => setShopSearch(e.target.value)}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {shopsLoading ? (
              <ShopCardSkeleton count={6} />
            ) : (
              <div className="cx-list cx-grid">
                {filteredShops.map(shop => {
                  const k = `shop-${shop.id}`;
                  const open = !!openCards[k];
                  return (
                    <div key={shop.id} className={`cx-card ${open ? 'open' : ''}`}>
                      <button type="button" className="cx-card-head" onClick={() => toggleCard(k)}>
                        <span className="cx-avatar"><Store size={18} /></span>
                        <span className="cx-main">
                          <span className="cx-title">{shop.shopName}</span>
                          <span className="cx-sub">{shop.shopAddress || shop.city}</span>
                        </span>
                        <span className="cx-end">
                          <span className={`cx-pill ${shop.isOpen ? 'cx-green' : 'cx-red'}`}>{shop.isOpen ? 'Open' : 'Closed'}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="cx-body">
                          <div className="cx-meta"><Clock size={14} /> {shop.timings || '—'}</div>
                          {shop.shopPhone && <div className="cx-meta"><Phone size={14} /> {shop.shopPhone}</div>}
                          <div className="cx-meta"><MapPin size={14} /> {shop.city} · ID {shop.shortId}</div>
                          <div className="cx-actions">
                            <button type="button" className="btn btn-sm" onClick={() => handleOpenShop(shop)}>View catalog &amp; order <ArrowRight size={14} /></button>
                            {shop.shopPhone && <a href={`tel:${shop.shopPhone}`} className="btn btn-outline btn-sm"><Phone size={14} /> Call</a>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {filteredShops.length === 0 && (
                <div className="cx-empty" style={{ gridColumn: '1 / -1' }}>
                  <span className="cx-empty-title">No shops found in {selectedCity}</span>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* TAB 2: PRICE COMPARISON & SEARCH ITEMS */}
        {activeTab === 'compare' && (
          <div className="cx-stack">
            <div className="cmp-search">
              <Search size={18} />
              <input
                type="text"
                placeholder={`Search items in ${selectedCity}`}
                value={compareQuery}
                onChange={e => { setCompareQuery(e.target.value); loadCompareData(selectedCity, e.target.value); }}
              />
            </div>

            {compareLoading ? (
              <ProductGridSkeleton count={6} />
            ) : (
              <div className="cx-list">
                {Object.keys(groupedCompare).map(key => {
                  const group = groupedCompare[key];
                  const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price);
                  const lowestPrice = sortedOffers[0]?.price;

                  return (
                    <div key={key} className="cx-card cmp-card">
                      <div className="cmp-head">
                        <div className="cx-main">
                          <span className="cx-title">{group.displayName}</span>
                          <span className="cx-sub">per {group.unit}</span>
                        </div>
                        <div className="cmp-best">
                          <span>Best price</span>
                          <strong>₹{(Number(lowestPrice) || 0).toFixed(2)}</strong>
                        </div>
                      </div>

                      <div className="cmp-offers">
                        {sortedOffers.map(offer => {
                          const isBestPrice = offer.price === lowestPrice && sortedOffers.length > 1;
                          const inCartQty = orderList[offer.id]?.qty || 0;

                          return (
                            <div key={offer.id} className={`cmp-offer ${isBestPrice ? 'best' : ''}`}>
                              <div className="cmp-offer-top">
                                <div className="cx-main">
                                  <span className="cmp-shop">
                                    <span className="cx-title">{offer.shopName}</span>
                                    <span className={`cx-pill ${offer.isOpen ? 'cx-green' : 'cx-red'}`}>{offer.isOpen ? 'Open' : 'Closed'}</span>
                                    {isBestPrice && <span className="cx-pill cx-amber">Lowest</span>}
                                  </span>
                                  <span className="cx-sub">{[offer.shopAddress, offer.timings].filter(Boolean).join(' • ')}</span>
                                </div>
                                <div className="cmp-price">
                                  <strong>₹{(Number(offer?.price) || 0).toFixed(2)}</strong>
                                  <span>/{offer.unit}</span>
                                </div>
                              </div>

                              <div className="cmp-actions">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleOpenShop({ id: offer.shopId, shopName: offer.shopName })}
                                >
                                  View shop
                                </button>

                                {inCartQty > 0 ? (
                                  <button type="button" className="btn btn-sm" onClick={() => setShowCartModal(true)}>
                                    <ShoppingCart size={14} /> In cart ({inCartQty})
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    disabled={!offer.isOpen}
                                    onClick={() => handleAddItemToCart({ id: offer.id, name: offer.name, price: offer.price, unit: offer.unit }, { id: offer.shopId, shopName: offer.shopName })}
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(groupedCompare).length === 0 && (
                  <div className="cx-empty">
                    <span className="cx-empty-title">No products found</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SHOP SHOWCASE & "MAKE A LIST" ORDER CREATOR */}
        {activeTab === 'explore' && activeShop && (
          <div>
            {/* Shop header */}
            <div className="shop-head">
              <button type="button" className="m-back-btn" onClick={() => setActiveShop(null)}>← Shops</button>
              <div className="shop-head-card">
                <div className="shop-head-top">
                  <div className="cx-main">
                    <span className="shop-name">{activeShop.shopName}</span>
                    <span className="cx-sub">{[activeShop.shopAddress, activeShop.timings].filter(Boolean).join(' • ')}</span>
                  </div>
                  <span className={`cx-pill ${activeShop.isOpen ? 'cx-green' : 'cx-red'}`}>{activeShop.isOpen ? 'Open' : 'Closed'}</span>
                </div>
                {activeShop.shopPhone && (
                  <div className="shop-head-actions">
                    <a href={`tel:${activeShop.shopPhone}`} className="btn btn-sm"><Phone size={15} /> Call</a>
                    <a
                      href={`https://wa.me/91${activeShop.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${activeShop.shopName}, I found your shop on GI Shop and would like to ask about grocery items.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {orderErrorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> {orderErrorMsg}
              </div>
            )}

            {orderSuccessMsg && (
              <div style={{ background: '#dff3e6', border: '1px solid #c4e8d1', color: '#0f7a43', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> {orderSuccessMsg}
              </div>
            )}

            {/* Catalog & List Split View */}
            <div className="grid shop-showcase-grid">
              
              {/* Product Catalog */}
              <div className="shop-catalog">
                <div className="cmp-search" style={{ marginBottom: '0.75rem' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search items"
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>

                <div className="item-list">
                  {filteredShopItems.map(item => {
                    const currentEntry = orderList[item.id];
                    const currentQty = currentEntry?.qty || 0;
                    const isAdded = currentQty > 0;

                    return (
                      <div
                        key={item.id}
                        className={`item-row ${isAdded ? 'added' : ''}`}
                        onClick={() => openItemModal(item, activeShop)}
                      >
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                          <div className="item-price"><strong>₹{(Number(item?.price) || 0).toFixed(2)}</strong> / {item.unit}</div>
                        </div>

                        {isAdded ? (
                          <span className="item-qty">{currentQty} {item.unit}</span>
                        ) : (
                          <button
                            type="button"
                            className="item-add"
                            aria-label={`Add ${item.name}`}
                            disabled={!activeShop.isOpen}
                            onClick={(e) => { e.stopPropagation(); openItemModal(item, activeShop); }}
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {filteredShopItems.length === 0 && (
                    <div className="cx-empty"><span className="cx-empty-title">No items found</span></div>
                  )}
                </div>
              </div>

              {/* Shopping List / Send Order Box */}
              <div className="panel desktop-only-block" style={{ position: 'sticky', top: '1rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h3 className="title" style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShoppingCart size={18} /> Cart / Order List
                  </h3>
                  {activeCartShop && (
                    <span className="badge" style={{ background: '#e9f6ee', color: 'var(--primary)' }}>
                      {activeCartShop.name}
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {Object.values(orderList).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0', fontSize: '0.9rem' }}>
                      Your cart is empty.<br/>Tap "+ Add to List" on products.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.values(orderList).map(entry => (
                        <div key={entry.item.id} className="flex-between" style={{ fontSize: '0.85rem', paddingBottom: '0.35rem', borderBottom: '1px solid #eff1f4' }}>
                          <div>
                            <div>{entry.item.name}</div>
                            <small style={{ color: 'var(--text-muted)' }}>{entry.qty} x ₹{entry.rate}</small>
                          </div>
                          <strong>₹{(Number(entry?.amount) || 0).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                  <div className="flex-between" style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    <span>Estimated Total:</span>
                    <span style={{ color: 'var(--success)' }}>₹{(Number(totalOrderAmount) || 0).toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn" 
                  style={{ width: '100%', padding: '0.85rem' }}
                  disabled={!activeShop.isOpen || Object.keys(orderList).length === 0 || orderSubmitting}
                  onClick={handleSendOrder}
                >
                  {orderSubmitting ? 'Sending...' : (!activeShop.isOpen ? 'Shop is Closed' : `Send Order to ${activeCartShop?.name || 'Shop'}`)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2.5: MY KHATA (STORE CREDIT, DUES & TRANSACTION STATEMENTS) */}
        {activeTab === 'khata' && (
          <div>
            {!selectedKhataStore ? (
              // 1. ALL STORES KHATA OVERVIEW
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Overall Outstanding Due Banner */}
                <div className={`cx-hero ${num(khataOverview?.overallDue) > 0 ? 'cx-hero-red' : 'cx-hero-green'}`}>
                  <span className="cx-hero-label">Total due to pay</span>
                  <strong className="cx-hero-value">{money(khataOverview?.overallDue)}</strong>
                  <span className="cx-hero-meta">
                    {khataOverview.stores.length} stores · {khataOverview.stores.filter(x => num(x.totalDue) > 0).length} with due
                  </span>
                </div>

                {/* Stores List */}
                {khataLoading ? (
                  <KhataOverviewSkeleton />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {khataOverview.stores.map((st) => {
                      const k = `khata-${st.shopId}`;
                      const open = !!openCards[k];
                      const due = num(st.totalDue);
                      return (
                        <div key={k} className={`cx-card ${due > 0 ? 'cx-due' : 'cx-clear'} ${open ? 'open' : ''}`}>
                          <button type="button" className="cx-card-head" onClick={() => toggleCard(k)}>
                            <span className="cx-avatar"><BookOpen size={18} /></span>
                            <span className="cx-main">
                              <span className="cx-title">{st.shopName}</span>
                              <span className="cx-sub">{st.isOpen ? 'Open' : 'Closed'} · {st.city}</span>
                            </span>
                            <span className="cx-end">
                              <span className={`cx-amount ${due > 0 ? 'cx-text-red' : 'cx-text-green'}`}>{money(due)}</span>
                              <span className={`cx-pill ${due > 0 ? 'cx-red' : 'cx-green'}`}>{due > 0 ? 'Due' : 'Clear'}</span>
                            </span>
                          </button>
                          {open && (
                            <div className="cx-body">
                              <div className="cx-lines">
                                <div className="cx-line"><span>Khata credit</span><span>{money(st.totalBook)}</span></div>
                                <div className="cx-line"><span>Paid</span><span>{money(st.totalPaid)}</span></div>
                                {(st.shopAddress || st.timings) && <div className="cx-line"><span>{st.shopAddress || ''}</span><span>{st.timings || ''}</span></div>}
                              </div>
                              <div className="cx-actions">
                                <button type="button" className="btn btn-sm" onClick={() => loadStoreKhataDetails(st)}><BookOpen size={14} /> History</button>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => handleStartNewOrderFromStore(st)}><Plus size={14} /> New order</button>
                                {st.shopPhone && <a href={`tel:${st.shopPhone}`} className="btn btn-outline btn-sm"><Phone size={14} /></a>}
                                {st.shopPhone && (
                                  <a href={`https://wa.me/91${String(st.shopPhone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${st.shopName}, I would like to check my khata and place an order.`)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle size={14} /></a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {khataOverview.stores.length === 0 && !khataLoading && (
                    <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f7f8fa', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                      <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>No Khata Records Found</h3>
                      <button 
                        type="button" 
                        className="btn"
                        onClick={() => setActiveTab('explore')}
                      >
                        <Store size={16} /> Explore Local Shops
                      </button>
                    </div>
                  )}
                </div>
                )}

              </div>
            ) : (
              // 2. SPECIFIC STORE KHATA & TRANSACTION STATEMENT
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Back Button and Store Header Banner */}
                <div className="panel" style={{ padding: '1.25rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ marginBottom: '1rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedKhataStore(null)}
                  >
                    ← Back to All Stores Khata
                  </button>

                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedKhataStore.shopName}</h2>
                        <span className="badge" style={{ background: '#e9f6ee', color: 'var(--primary)', fontWeight: '700' }}>
                          ID: {selectedKhataStore.shortId || `shp${selectedKhataStore.shopId || selectedKhataStore.id}`}
                        </span>
                        <span className="badge" style={{ background: selectedKhataStore.isOpen ? '#dff3e6' : '#fee2e2', color: selectedKhataStore.isOpen ? '#0f7a43' : '#b91c1c' }}>
                          {selectedKhataStore.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {selectedKhataStore.shopAddress ? `${selectedKhataStore.shopAddress}, ${selectedKhataStore.city}` : selectedKhataStore.city}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: 'var(--primary)' }}
                          onClick={() => handleStartNewOrderFromStore(selectedKhataStore)}
                        >
                          <Plus size={15} /> New Order +
                        </button>
                        {selectedKhataStore.shopPhone && (
                          <a 
                            href={`tel:${selectedKhataStore.shopPhone}`}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Phone size={15} /> Call Now
                          </a>
                        )}
                        {selectedKhataStore.shopPhone && (
                          <a 
                            href={`https://wa.me/91${selectedKhataStore.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedKhataStore.shopName}, I am reviewing my khata ledger.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', textDecoration: 'none', color: '#1f9d5a', borderColor: '#c4e8d1', background: '#eef8f1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <MessageCircle size={15} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Due metric */}
                    <div style={{ background: '#f7f8fa', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Amount Due to Pay</div>
                      <h2 style={{ margin: '0.25rem 0', fontSize: '1.75rem', color: (storeKhataDetails?.totalDue ?? selectedKhataStore?.totalDue ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '900' }}>
                        ₹{(Number(storeKhataDetails?.totalDue ?? selectedKhataStore?.totalDue) || 0).toFixed(2)}
                      </h2>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Credit Taken: ₹{(Number(storeKhataDetails?.totalBook ?? selectedKhataStore?.totalBook) || 0).toFixed(2)} • Paid: ₹{(Number(storeKhataDetails?.totalPaid ?? selectedKhataStore?.totalPaid) || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#eff1f4', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '1rem', fontSize: '0.8rem', color: '#475467', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} color="var(--primary)" />
                    <span><strong>Synchronized Store Khata:</strong> All entries are certified by the store. Customer cannot edit ledger records.</span>
                  </div>
                </div>

                {/* Filters for Store Transaction History */}
                <div className="panel">
                  <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={20} color="var(--primary)" /> Order &amp; Transaction History
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="filter-pills-scroll" style={{ marginBottom: '1rem' }}>
                    {['All', 'Today', 'Yesterday', 'Month', 'Custom'].map(f => (
                      <button
                        key={f}
                        type="button"
                        className={`btn ${storeKhataFilter === f ? '' : 'btn-outline'}`}
                        style={{ 
                          padding: '0.35rem 0.75rem', 
                          fontSize: '0.8rem', 
                          borderRadius: '6px',
                          fontWeight: storeKhataFilter === f ? '700' : '500',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => setStoreKhataFilter(f)}
                      >
                        {f === 'Month' ? 'This Month' : f}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Range Picker */}
                  {storeKhataFilter === 'Custom' && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', background: '#f7f8fa', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>From:</span>
                        <input 
                          type="date" 
                          className="input" 
                          style={{ width: '150px', margin: 0, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} 
                          value={storeKhataCustomStart} 
                          onChange={e => setStoreKhataCustomStart(e.target.value)} 
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>To:</span>
                        <input 
                          type="date" 
                          className="input" 
                          style={{ width: '150px', margin: 0, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} 
                          value={storeKhataCustomEnd} 
                          onChange={e => setStoreKhataCustomEnd(e.target.value)} 
                        />
                      </div>
                      {(storeKhataCustomStart || storeKhataCustomEnd) && (
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => { setStoreKhataCustomStart(''); setStoreKhataCustomEnd(''); }}
                        >
                          Reset Dates
                        </button>
                      )}
                    </div>
                  )}

                  {/* Timeline Entries List */}
                  {(() => {
                    const isKhataDateMatching = (dateStr) => {
                      if (!dateStr || storeKhataFilter === 'All') return true;
                      const itemDate = new Date(dateStr);
                      const now = new Date();
                      
                      if (storeKhataFilter === 'Today') {
                        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                        return itemDate >= startToday && itemDate <= endToday;
                      }

                      if (storeKhataFilter === 'Yesterday') {
                        const startYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                        const endYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                        return itemDate >= startYest && itemDate <= endYest;
                      }

                      if (storeKhataFilter === 'Month') {
                        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return itemDate >= startMonth && itemDate <= endMonth;
                      }

                      if (storeKhataFilter === 'Custom') {
                        if (!storeKhataCustomStart && !storeKhataCustomEnd) return true;
                        const start = storeKhataCustomStart ? new Date(storeKhataCustomStart + 'T00:00:00') : new Date(0);
                        const end = storeKhataCustomEnd ? new Date(storeKhataCustomEnd + 'T23:59:59.999') : new Date(8640000000000000);
                        return itemDate >= start && itemDate <= end;
                      }

                      return true;
                    };

                    const timeline = (storeKhataDetails?.timeline || []).filter(t => isKhataDateMatching(t.date));

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {timeline.map((entry, idx) => {
                          if (entry.type === 'PURCHASE') {
                            const items = safeItems(entry.itemsJSON);
                            const isKhataMethod = entry.paymentMethod === 'Add to Book';
                            return (
                              <div key={`timeline-purch-${entry.id}-${idx}`} style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <strong style={{ fontSize: '0.95rem' }}>In-Store Purchase #{entry.id}</strong>
                                      <span className="badge" style={{ fontSize: '0.75rem', background: isKhataMethod ? '#fee2e2' : '#dff3e6', color: isKhataMethod ? '#b91c1c' : '#0f7a43', fontWeight: '700' }}>
                                        {isKhataMethod ? 'Added to Khata (Due)' : `Paid (${entry.paymentMethod})`}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()} {entry.billedBy ? `• Billed by: ${entry.billedBy}` : ''}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: isKhataMethod ? 'var(--danger)' : 'var(--success)' }}>
                                      {isKhataMethod ? `+₹${(Number(entry?.total) || 0).toFixed(2)} Due` : `₹${(Number(entry?.total) || 0).toFixed(2)}`}
                                    </h3>
                                  </div>
                                </div>

                                <div style={{ background: '#fff', borderRadius: '6px', padding: '0.65rem', margin: '0.5rem 0', border: '1px solid #eff1f4' }}>
                                  {items.map((c, i) => (
                                    <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                      <span>{c.item?.name || c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>x {c.qty} {c.item?.unit}</span></span>
                                      <span>₹{(Number((c.rate || c.item?.price || 0) * c.qty) || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>

                                {entry.note && (
                                  <div style={{ fontSize: '0.8rem', color: '#6366f1', background: '#eef2ff', padding: '0.25rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                                    📝 Note: "{entry.note}"
                                  </div>
                                )}

                                <div className="flex-between" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.4rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Store Verified Bill</span>
                                  <button 
                                    type="button" 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                    onClick={() => setSelectedReceipt({ ...entry, shopName: selectedKhataStore.shopName })}
                                  >
                                    View Digital Receipt
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (entry.type === 'SETTLEMENT') {
                            return (
                              <div key={`timeline-settle-${entry.id}-${idx}`} style={{ background: '#eef8f1', border: '1px solid #c4e8d1', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <CheckCircle size={16} color="#1f9d5a" />
                                      <strong style={{ fontSize: '0.95rem', color: '#0f7a43' }}>Payment Settlement Received</strong>
                                      <span className="badge" style={{ fontSize: '0.75rem', background: '#dff3e6', color: '#0f7a43', fontWeight: '700' }}>
                                        {entry.method}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#0b5e33' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: '#0f7a43', fontWeight: '800' }}>-₹{(Number(entry?.amount) || 0).toFixed(2)}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#0b5e33' }}>Paid / Cleared</span>
                                  </div>
                                </div>

                                {entry.note && (
                                  <div style={{ fontSize: '0.8rem', color: '#0f7a43', marginTop: '0.4rem' }}>
                                    📝 Note: "{entry.note}"
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (entry.type === 'ORDER') {
                            const items = safeItems(entry.itemsJSON);
                            return (
                              <div key={`timeline-order-${entry.id}-${idx}`} style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.95rem' }}>Online Order #{entry.orderNumber}</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                                      ₹{(Number(
                                        (entry.estimatedTotal && entry.estimatedTotal > 0)
                                          ? entry.estimatedTotal
                                          : items.reduce((s, it) => s + (it.amount || (it.rate * it.qty) || 0), 0)
                                      ) || 0).toFixed(2)}
                                    </h3>
                                    <span className="badge" style={{ fontSize: '0.75rem', background: '#e9f6ee', color: 'var(--primary)' }}>
                                      {entry.status}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ background: '#fff', borderRadius: '6px', padding: '0.65rem', margin: '0.5rem 0', border: '1px solid #eff1f4' }}>
                                  {items.map((it, i) => (
                                    <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                      <span>{it.item?.name || it.name} x {it.qty}</span>
                                      <span>₹{(Number(it.amount || ((it.rate || it.price) * it.qty)) || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex-between" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.4rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Grocery Request</span>
                                  <button 
                                    type="button" 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                    onClick={() => setSelectedOrderForDetails({ ...entry, shopName: selectedKhataStore.shopName })}
                                  >
                                    View Order Slip
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}

                        {timeline.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '2rem', background: '#f7f8fa', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                            <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                            <p className="subtitle" style={{ margin: 0 }}>
                              {storeKhataFilter === 'All' 
                                ? 'No order or transaction records recorded for this shop yet.' 
                                : `No transaction records found for ${storeKhataFilter === 'Month' ? 'This Month' : storeKhataFilter}.`}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL ORDERS (ACTIVE REQUESTS < 24H & ALL ORDERS / RECEIPTS) */}
        {activeTab === 'orders' && (
          <ErrorBoundary resetKey={activeTab} onRetry={loadOrders}>
          {(() => {
          const now = new Date();
          const nowMs = now.getTime();
          const dayMs = 24 * 60 * 60 * 1000;
          const safeOrd = Array.isArray(orders) ? orders.filter(Boolean) : [];
          const safePurch = Array.isArray(purchases) ? purchases.filter(Boolean) : [];
          const isRecent = (o) => { const d = new Date(o.createdAt || o.date); return !isNaN(d.getTime()) && (nowMs - d.getTime()) < dayMs; };
          const recentOrders = safeOrd.filter(isRecent);
          const pastOrders = safeOrd.filter(o => !isRecent(o));
          const grandTotal = safePurch.reduce((s, p) => s + num(p.total), 0) + safeOrd.reduce((s, o) => s + num(o.estimatedTotal), 0);

          const matches = (dateStr) => {
            if (!dateStr || ordersDateFilter === 'All') return true;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return true;
            const y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
            if (ordersDateFilter === 'Today') return d >= new Date(y, m, day) && d <= new Date(y, m, day, 23, 59, 59, 999);
            if (ordersDateFilter === 'Yesterday') return d >= new Date(y, m, day - 1) && d <= new Date(y, m, day - 1, 23, 59, 59, 999);
            if (ordersDateFilter === 'Month') return d >= new Date(y, m, 1) && d <= new Date(y, m + 1, 0, 23, 59, 59, 999);
            if (ordersDateFilter === 'Custom') {
              const a = ordersCustomStart ? new Date(ordersCustomStart + 'T00:00:00') : new Date(0);
              const b = ordersCustomEnd ? new Date(ordersCustomEnd + 'T23:59:59.999') : new Date(8640000000000000);
              return d >= a && d <= b;
            }
            return true;
          };
          const filteredPastOrders = pastOrders.filter(o => matches(o.createdAt || o.date));
          const filteredPurchases = safePurch.filter(p => matches(p.date || p.createdAt));
          const totalCount = filteredPastOrders.length + filteredPurchases.length;
          const fmtDate = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

          const renderOrder = (order, key) => {
            const items = safeItems(order.itemsJSON);
            const meta = statusMeta(order.status);
            const open = !!openCards[key];
            const canCancel = order.status === 'PENDING' || order.status === 'PACKING';
            return (
              <div key={key} className={`cx-card ${open ? 'open' : ''}`}>
                <button type="button" className="cx-card-head" onClick={() => toggleCard(key)}>
                  <span className="cx-avatar"><Receipt size={18} /></span>
                  <span className="cx-main">
                    <span className="cx-title">{order.shopName || 'Shop'}</span>
                    <span className="cx-sub">#{order.orderNumber} · {fmtDate(order.createdAt)}</span>
                  </span>
                  <span className="cx-end">
                    <span className="cx-amount">{money(orderTotal(order, items))}</span>
                    <span className={`cx-pill cx-${meta.tone}`}>{meta.label}</span>
                  </span>
                </button>

                {order.status === 'READY' && (
                  <div className="cx-otp">
                    <div>
                      <div className="cx-otp-label">Pickup OTP</div>
                      <div className="cx-otp-code">{order.otpCode || '----'}</div>
                    </div>
                    <span className="cx-otp-hint">Show this code to the shopkeeper</span>
                  </div>
                )}

                {open && (
                  <div className="cx-body">
                    {order.status === 'PENDING' && <div className="cx-note cx-note-amber">Shopkeeper must accept within 45 minutes or the order is cancelled.</div>}
                    {order.status === 'PACKING' && <div className="cx-note cx-note-amber">Packing · ETA about {num(order.packingMinutes)} min</div>}
                    {order.status === 'AUTO_CANCELLED_EXPIRED' && <div className="cx-note cx-note-red">Auto-cancelled: not accepted within 45 minutes.</div>}
                    {order.status === 'DECLINED' && <div className="cx-note cx-note-red">Declined: {order.declineReason || 'Unavailable'}</div>}
                    <div className="cx-lines">
                      {items.map((e, i) => (
                        <div key={i} className={`cx-line ${e.isUnavailable ? 'off' : ''}`}>
                          <span>{e.item?.name || e.name || 'Item'} × {e.qty}</span>
                          <span>{money(lineAmount(e))}</span>
                        </div>
                      ))}
                      {items.length === 0 && <div className="cx-line"><span>No item details</span></div>}
                      <div className="cx-line cx-total"><span>Total</span><span>{money(orderTotal(order, items))}</span></div>
                    </div>
                    <div className="cx-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setSelectedOrderForDetails(order)}>Order slip</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedTimelineOrder(order)}>Timeline</button>
                      {canCancel && (
                        <button type="button" className="btn btn-outline btn-sm cx-danger" onClick={() => handleCancelCustomerOrder(order.id)}>Cancel</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          };

          return ordersLoading ? (
            <OrderCardSkeleton count={3} />
          ) : (
            <div className="cx-stack">
              <div className="cx-stats">
                <div className="cx-stat cx-stat-main"><span>Total spent</span><strong>{money(grandTotal)}</strong></div>
                <div className="cx-stat"><span>Active</span><strong>{recentOrders.length}</strong></div>
                <div className="cx-stat"><span>All</span><strong>{pastOrders.length + safePurch.length}</strong></div>
              </div>

              <div>
                <div className="cx-section">Active orders <em>{recentOrders.length}</em></div>
                {recentOrders.length > 0 ? (
                  <div className="cx-list">{recentOrders.map(o => renderOrder(o, `ord-${o.id}`))}</div>
                ) : (
                  <div className="cx-empty"><p className="cx-empty-sub">No active orders in the last 24 hours.</p></div>
                )}
              </div>

              <div>
                <div className="cx-section">History <em>{totalCount}</em></div>
                <div className="cx-chips">
                  {['All', 'Today', 'Yesterday', 'Month', 'Custom'].map(f => (
                    <button key={f} type="button" className={`cx-chip ${ordersDateFilter === f ? 'on' : ''}`} onClick={() => setOrdersDateFilter(f)}>
                      {f === 'Month' ? 'This month' : f}
                    </button>
                  ))}
                </div>
                {ordersDateFilter === 'Custom' && (
                  <div className="cx-dates">
                    <input type="date" className="input" value={ordersCustomStart} onChange={e => setOrdersCustomStart(e.target.value)} />
                    <input type="date" className="input" value={ordersCustomEnd} onChange={e => setOrdersCustomEnd(e.target.value)} />
                  </div>
                )}
                <div className="cx-list">
                  {filteredPastOrders.map(o => renderOrder(o, `past-${o.id}`))}
                  {filteredPurchases.map(p => {
                    const key = `purch-${p.id}`;
                    const items = safeItems(p.itemsJSON);
                    const open = !!openCards[key];
                    return (
                      <div key={key} className={`cx-card ${open ? 'open' : ''}`}>
                        <button type="button" className="cx-card-head" onClick={() => toggleCard(key)}>
                          <span className="cx-avatar cx-avatar-blue"><Store size={18} /></span>
                          <span className="cx-main">
                            <span className="cx-title">{p.shopName || 'Shop'}</span>
                            <span className="cx-sub">In-store bill · {fmtDate(p.date || p.createdAt)}</span>
                          </span>
                          <span className="cx-end">
                            <span className="cx-amount">{money(p.total)}</span>
                            {p.paymentMethod && <span className="cx-pill cx-grey">{p.paymentMethod}</span>}
                          </span>
                        </button>
                        {open && (
                          <div className="cx-body">
                            <div className="cx-lines">
                              {items.map((c, i) => (
                                <div key={i} className="cx-line">
                                  <span>{c.item?.name || c.name || 'Item'} × {c.qty} {c.item?.unit || ''}</span>
                                  <span>{money(num(c.rate || c.item?.price) * num(c.qty))}</span>
                                </div>
                              ))}
                            </div>
                            {p.note && <div className="cx-note cx-note-blue">📝 {p.note}</div>}
                            <div className="cx-actions">
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedReceipt(p)}>Digital receipt</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {totalCount === 0 && (
                    <div className="cx-empty">
                      <Receipt size={30} color="var(--text-muted)" />
                      <p className="cx-empty-sub">{ordersDateFilter === 'All' ? 'No past orders or receipts yet.' : 'Nothing found for this period.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })()}
          </ErrorBoundary>
        )}

        {/* ORDER DETAILS & DOWNLOAD RECEIPT MODAL */}
        {selectedOrderForDetails && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '460px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.25rem' }}>
              
              <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.2rem' }}>Order Details & Slip</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Order <strong>#{selectedOrderForDetails.orderNumber}</strong>
                  </div>
                </div>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrderForDetails(null)} />
              </div>

              {/* Shop Details Block */}
              <div style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                    {selectedOrderForDetails.shopName}
                  </strong>
                  <span className="badge" style={{ fontSize: '0.7rem' }}>
                    Shop ID: {selectedOrderForDetails.shopShortId || 'shp'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div><MapPin size={13} style={{ verticalAlign: 'middle' }} /> {selectedOrderForDetails.shopAddress || 'Local Market'}</div>
                  {selectedOrderForDetails.shopPhone && <div><Phone size={13} style={{ verticalAlign: 'middle' }} /> {selectedOrderForDetails.shopPhone}</div>}
                  {selectedOrderForDetails.shopTimings && <div><Clock size={13} style={{ verticalAlign: 'middle' }} /> {selectedOrderForDetails.shopTimings}</div>}
                </div>

                {selectedOrderForDetails.shopPhone && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                    <a 
                      href={`tel:${selectedOrderForDetails.shopPhone}`}
                      className="btn"
                      style={{ 
                        background: '#0f7a43', 
                        color: '#fff', 
                        padding: '0.35rem 0.75rem', 
                        fontSize: '0.75rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem', 
                        textDecoration: 'none', 
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}
                    >
                      <Phone size={13} /> Call Shop
                    </a>

                    <a 
                      href={`https://wa.me/91${selectedOrderForDetails.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedOrderForDetails.shopName}, I have a query regarding my order #${selectedOrderForDetails.orderNumber} placed on GI Shop.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ 
                        background: '#1f9d5a', 
                        color: '#fff', 
                        padding: '0.35rem 0.75rem', 
                        fontSize: '0.75rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem', 
                        textDecoration: 'none', 
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Status Box */}
              <div style={{ background: '#eff1f4', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Placed on</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{new Date(selectedOrderForDetails.createdAt).toLocaleString()}</div>
                </div>
                <span className="badge" style={{
                  background: selectedOrderForDetails.status === 'PACKING' ? '#fdf0cf' 
                    : ((selectedOrderForDetails.status === 'COMPLETED' || selectedOrderForDetails.status === 'READY') ? '#e0f2fe' 
                    : (selectedOrderForDetails.status === 'COLLECTED' ? '#dff3e6' 
                    : ((selectedOrderForDetails.status === 'NOT_COLLECTED' || selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' || selectedOrderForDetails.status === 'DECLINED') ? '#fee2e2' : '#e9f6ee'))),
                  color: selectedOrderForDetails.status === 'PACKING' ? '#a8620a' 
                    : ((selectedOrderForDetails.status === 'COMPLETED' || selectedOrderForDetails.status === 'READY') ? '#0369a1' 
                    : (selectedOrderForDetails.status === 'COLLECTED' ? '#0f7a43' 
                    : ((selectedOrderForDetails.status === 'NOT_COLLECTED' || selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' || selectedOrderForDetails.status === 'DECLINED') ? '#b91c1c' : '#0b5e33'))),
                  padding: '0.35rem 0.65rem',
                  fontWeight: '700'
                }}>
                  {selectedOrderForDetails.status === 'PACKING' && `PACKING (ETA: ~${selectedOrderForDetails.packingMinutes} mins)`}
                  {selectedOrderForDetails.status === 'PENDING' && 'PENDING CONFIRMATION'}
                  {selectedOrderForDetails.status === 'READY' && 'PACKED & READY FOR PICKUP'}
                  {selectedOrderForDetails.status === 'COMPLETED' && 'COMPLETED & HANDED OVER'}
                  {selectedOrderForDetails.status === 'COLLECTED' && 'COLLECTED BY YOU (LOCKED)'}
                  {selectedOrderForDetails.status === 'NOT_COLLECTED' && 'MARKED NOT COLLECTED (LOCKED)'}
                  {selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' && 'CANCELLED / TAKEN BACK (LOCKED)'}
                  {selectedOrderForDetails.status === 'DECLINED' && `DECLINED`}
                </span>
              </div>

              {/* Ready Confirmation Banner inside Details Modal */}
              {selectedOrderForDetails.status === 'READY' && (
                <div style={{ background: '#eef8f1', border: '1px solid #c4e8d1', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '700', color: '#0b5e33', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle size={15} /> Shopkeeper marked this order ready! Did you collect it?
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: '700' }}
                      onClick={() => handleUpdateCustomerCollection(selectedOrderForDetails.id, 'COLLECTED')}
                    >
                      ✓ Mark Collected
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                      onClick={() => handleUpdateCustomerCollection(selectedOrderForDetails.id, 'NOT_COLLECTED')}
                    >
                      ✗ Not Collected
                    </button>
                  </div>
                </div>
              )}

              {selectedOrderForDetails.status === 'COMPLETED' && (
                <div style={{ background: '#eef8f1', border: '1px solid #c4e8d1', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0b5e33', fontWeight: '700', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} /> Order Picked Up &amp; Completed
                </div>
              )}

              {/* Itemized Order Table */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Ordered Items
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f7f8fa', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeItems(selectedOrderForDetails.itemsJSON).map((entry, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eff1f4' }}>
                          <td style={{ padding: '0.5rem' }}>{entry.item?.name || entry.name}</td>
                          <td style={{ textAlign: 'center', padding: '0.5rem' }}>{entry.qty} {entry.item?.unit || ''}</td>
                          <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{entry.rate || entry.item?.price || 0}</td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: '600' }}>{money(lineAmount(entry))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Payable */}
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="flex-between" style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                  <span>Total Payable:</span>
                  <span style={{ color: 'var(--success)' }}>
                    {money(orderTotal(selectedOrderForDetails, safeItems(selectedOrderForDetails.itemsJSON)))}
                  </span>
                </div>
              </div>

              {/* Customer Delivery Info */}
              <div style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>Customer: <strong>{selectedOrderForDetails.customerName || currentUser?.name}</strong> ({selectedOrderForDetails.customerShortId || currentUser?.shortId})</div>
                <div>Contact: {selectedOrderForDetails.customerPhone || currentUser?.phone}</div>
                {selectedOrderForDetails.customerAddress && <div>Address: {selectedOrderForDetails.customerAddress}</div>}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(selectedOrderForDetails.status === 'PENDING' || selectedOrderForDetails.status === 'PACKING') && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '0.75rem 1rem' }}
                    onClick={() => handleCancelCustomerOrder(selectedOrderForDetails.id)}
                  >
                    🚫 Cancel / Take Back
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn" 
                  style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Download / Print Slip
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.75rem 1rem' }} onClick={() => setSelectedOrderForDetails(null)}>
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CART / ORDER LIST MODAL (OPENS ON CLICKING "IN CART" OR FLOATING BAR) */}
        {showCartModal && activeCartShop && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '420px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>Your Order List</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                    Shop: {activeCartShop.name}
                  </div>
                </div>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowCartModal(false)} />
              </div>

              {orderErrorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  {orderErrorMsg}
                </div>
              )}

              {orderSuccessMsg && (
                <div style={{ background: '#dff3e6', border: '1px solid #c4e8d1', color: '#0f7a43', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  {orderSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {Object.values(orderList).map(entry => (
                  <div key={entry.item.id} style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{entry.item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{entry.rate} / {entry.item.unit}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.15rem 0.4rem' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', border: 'none' }} onClick={() => handleUpdateItemQty(entry.item, -1)}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', minWidth: '20px', textAlign: 'center' }}>{entry.qty}</span>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', border: 'none' }} onClick={() => handleUpdateItemQty(entry.item, 1)}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <strong style={{ fontSize: '0.95rem', minWidth: '55px', textAlign: 'right' }}>₹{(Number(entry?.amount) || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="flex-between" style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: 'var(--success)' }}>₹{(Number(totalOrderAmount) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
                  disabled={orderSubmitting || Object.keys(orderList).length === 0}
                  onClick={async () => {
                    await handleSendOrder();
                  }}
                >
                  {orderSubmitting ? 'Sending Order...' : `Send Order to ${activeCartShop.name}`}
                </button>

                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ width: '100%', padding: '0.5rem', color: 'var(--danger)', borderColor: 'var(--border)' }}
                  onClick={() => {
                    setOrderList({});
                    setActiveCartShop(null);
                    setShowCartModal(false);
                  }}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CART CONFLICT CONFIRMATION MODAL (SINGLE-SHOP RULE) */}
        {cartConflict && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '400px', maxWidth: '100%', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>
                <AlertTriangle size={24} />
                <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>Clear Current Cart?</h3>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                Your cart currently contains items from <strong>{activeCartShop?.name}</strong>. 
                An order can only contain items from <strong>one shop at a time</strong>.
                <br/><br/>
                Would you like to clear your current cart and start a new order with <strong>{cartConflict.pendingShop.shopName}</strong>?
              </p>

              <div className="flex-between">
                <button type="button" className="btn btn-outline" onClick={() => setCartConflict(null)}>
                  Keep Existing Cart
                </button>
                <button type="button" className="btn btn-danger" onClick={handleResolveCartConflict}>
                  Clear Cart & Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRINTABLE COMPLETED SALE RECEIPT MODAL */}
        {selectedReceipt && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '420px', maxWidth: '100%', padding: '1.25rem', background: '#fff' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h3 className="title" style={{ margin: 0 }}>Digital Receipt</h3>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedReceipt(null)} />
              </div>

              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedReceipt.shopName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedReceipt.shopAddress}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bill #{selectedReceipt.id} • {new Date(selectedReceipt.date).toLocaleString()}</div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                {safeItems(selectedReceipt.itemsJSON).map((c, i) => (
                  <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span>{c.item?.name || c.name} ({c.qty} {c.item?.unit})</span>
                    <span>₹{(Number((c.rate || c.item?.price || 0) * c.qty) || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
                <div className="flex-between"><span>Subtotal:</span><span>₹{(Number(selectedReceipt.subtotal || selectedReceipt.total) || 0).toFixed(2)}</span></div>
                {selectedReceipt.discount > 0 && <div className="flex-between"><span>Discount:</span><span>-₹{(Number(selectedReceipt.discount) || 0).toFixed(2)}</span></div>}
                <div className="flex-between" style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  <span>Total:</span><span style={{ color: 'var(--success)' }}>₹{(Number(selectedReceipt.total) || 0).toFixed(2)}</span>
                </div>
                <div className="flex-between" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Payment Method:</span><span>{selectedReceipt.paymentMethod}</span>
                </div>
              </div>

              <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '1.25rem' }} onClick={() => window.print()}>
                Print / Save Receipt
              </button>
            </div>
          </div>
        )}

        {/* CUSTOMER ACCOUNT, SECURITY & DATA EXPORT MODAL */}
        {showProfileModal && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '860px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.75rem', borderRadius: '22px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              
              {/* Modal Header */}
              <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e9f6ee', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="title" style={{ margin: 0, fontSize: '1.3rem' }}>Customer Account & Settings</h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Customer ID: <strong style={{ color: 'var(--primary)' }}>{currentUser?.shortId}</strong> • Name: <strong>{currentUser?.name}</strong>
                    </div>
                  </div>
                </div>
                <X size={22} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowProfileModal(false)} />
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.4rem', background: '#eff1f4', padding: '0.35rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCustomerSettingsTab('profile')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    background: customerSettingsTab === 'profile' ? '#ffffff' : 'transparent',
                    color: customerSettingsTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: customerSettingsTab === 'profile' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <User size={16} /> Profile Details
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerSettingsTab('security')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    background: customerSettingsTab === 'security' ? '#ffffff' : 'transparent',
                    color: customerSettingsTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: customerSettingsTab === 'security' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Shield size={16} /> PIN & Security
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerSettingsTab('export')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    background: customerSettingsTab === 'export' ? '#ffffff' : 'transparent',
                    color: customerSettingsTab === 'export' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: customerSettingsTab === 'export' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Download size={16} /> Export & Backup
                </button>
              </div>

              {/* TAB 1: PROFILE DETAILS */}
              {customerSettingsTab === 'profile' && (
                <div>
                  <div style={{ background: '#f7f8fa', border: '1.5px solid #e4e7ec', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e4e7ec' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e9f6ee', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.3rem' }}>
                        {(currentUser?.name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#101828' }}>{currentUser?.name}</h4>
                        <span style={{ fontSize: '0.76rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '5px', fontWeight: '700' }}>
                          Verified Customer Account
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.86rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '600', marginBottom: '2px' }}>GOOGLE EMAIL</div>
                        <div style={{ fontWeight: '700', color: '#101828', wordBreak: 'break-all' }}>{currentUser?.email}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '600', marginBottom: '2px' }}>CUSTOMER SHORT ID</div>
                        <div style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{currentUser?.shortId}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '600', marginBottom: '2px' }}>CONTACT PHONE</div>
                        <div style={{ fontWeight: '700', color: '#101828' }}>{currentUser?.phone || 'Not set'}</div>
                      </div>
                    </div>
                  </div>

                  {profileNotice && (
                    <div style={{ background: '#dff3e6', border: '1px solid #c4e8d1', color: '#0f7a43', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={18} />
                      <div>{profileNotice}</div>
                    </div>
                  )}
                  {profileError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} />
                      <div>{profileError}</div>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Full Name</label>
                        <input 
                          type="text" 
                          className="input" 
                          value={profileForm.name} 
                          onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Phone</label>
                        <input 
                          type="tel" 
                          className="input" 
                          placeholder="10-digit mobile number"
                          value={profileForm.phone} 
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current City</label>
                        <select 
                          className="input" 
                          value={profileForm.city} 
                          onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                          style={{ background: '#fff', width: '100%', marginBottom: 0 }}
                        >
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Default Delivery Address</label>
                      <textarea 
                        className="input" 
                        rows={2} 
                        style={{ resize: 'vertical' }} 
                        placeholder="e.g. Flat #302, Sunrise Heights, Near City Mall" 
                        value={profileForm.address} 
                        onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} 
                      />
                    </div>

                    <div className="flex-between" style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <a 
                        href="tel:7323809242" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0f7a43', background: '#dff3e6', border: '1px solid #c4e8d1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                      >
                        <Phone size={15} /> Contact Customer Care (7323809242)
                      </a>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setShowProfileModal(false)}>
                          Close
                        </button>
                        <button type="submit" className="btn" disabled={profileSaving}>
                          {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: PIN & SECURITY */}
              {customerSettingsTab === 'security' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* 1. Change 4-Digit Security PIN */}
                    <form onSubmit={handleChangePin} style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Lock size={17} /> 4-Digit Security PIN
                          </h4>
                          <span style={{ fontSize: '0.74rem', background: '#ffedd5', color: '#c2410c', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                            Register Lock
                          </span>
                        </div>

                        {pinNotice && (
                          <div style={{ background: '#dff3e6', color: '#0f7a43', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle size={15} /> {pinNotice}
                          </div>
                        )}
                        {pinError && (
                          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertCircle size={15} /> {pinError}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.74rem', color: '#7c2d12', fontWeight: '700' }}>Current PIN</label>
                              <button type="button" onClick={() => setShowCurrentPin(!showCurrentPin)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', padding: 0 }}>
                                {showCurrentPin ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showCurrentPin ? 'text' : 'password'} 
                              maxLength="4" 
                              className="input" 
                              placeholder="••••" 
                              value={pinForm.currentPin} 
                              onChange={e => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', textAlign: 'center', letterSpacing: '2px', background: '#fff' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.74rem', color: '#7c2d12', fontWeight: '700' }}>New PIN</label>
                              <button type="button" onClick={() => setShowNewPin(!showNewPin)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', padding: 0 }}>
                                {showNewPin ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showNewPin ? 'text' : 'password'} 
                              maxLength="4" 
                              className="input" 
                              placeholder="••••" 
                              value={pinForm.newPin} 
                              onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', textAlign: 'center', letterSpacing: '2px', background: '#fff' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.74rem', color: '#7c2d12', fontWeight: '700' }}>Confirm PIN</label>
                              <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', padding: 0 }}>
                                {showConfirmPin ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showConfirmPin ? 'text' : 'password'} 
                              maxLength="4" 
                              className="input" 
                              placeholder="••••" 
                              value={pinForm.confirmPin} 
                              onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', textAlign: 'center', letterSpacing: '2px', background: '#fff' }}
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-outline" 
                        disabled={pinSaving} 
                        style={{ width: '100%', padding: '0.65rem', fontSize: '0.86rem', borderColor: '#ea580c', color: '#c2410c', fontWeight: '700', background: '#fff', borderRadius: '9px' }}
                      >
                        {pinSaving ? 'Updating PIN...' : 'Update 4-Digit Security PIN'}
                      </button>
                    </form>

                    {/* 2. Set / Change Password */}
                    <form onSubmit={handleChangePassword} style={{ background: '#f7f8fa', border: '1.5px solid #e4e7ec', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#101828', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Key size={17} /> Account Password
                          </h4>
                          {currentUser?.hasPasswordSet === 1 ? (
                            <span style={{ fontSize: '0.74rem', background: '#dff3e6', color: '#0f7a43', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                              Password Active
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', background: '#fdf0cf', color: '#a8620a', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                              Not Set Yet
                            </span>
                          )}
                        </div>

                        {passwordNotice && (
                          <div style={{ background: '#dff3e6', color: '#0f7a43', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle size={15} /> {passwordNotice}
                          </div>
                        )}
                        {passwordError && (
                          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertCircle size={15} /> {passwordError}
                          </div>
                        )}

                        {currentUser?.hasPasswordSet === 1 && (
                          <div style={{ marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current Password *</label>
                              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                {showCurrentPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showCurrentPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Enter current password" 
                              value={passwordForm.currentPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>Password *</label>
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showNewPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Enter password" 
                              value={passwordForm.newPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm Password *</label>
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <input 
                              type={showConfirmPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Re-type password" 
                              value={passwordForm.confirmPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                              required 
                              style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-outline" 
                        disabled={passwordSaving} 
                        style={{ width: '100%', padding: '0.65rem', fontSize: '0.86rem', fontWeight: '700', background: '#fff', borderRadius: '9px' }}
                      >
                        {passwordSaving ? 'Saving Password...' : (currentUser?.hasPasswordSet === 1 ? 'Update Password' : 'Save Password')}
                      </button>
                    </form>
                  </div>

                  {/* 3. Passkey Biometric Login */}
                  <div style={{ background: '#eef8f1', border: '1.5px solid #c4e8d1', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#0f7a43', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                          <Fingerprint size={18} /> Passkey Biometric Login
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRegisterPasskey}
                        disabled={passkeyRegistering}
                        className="btn btn-outline"
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.86rem', borderColor: '#1f9d5a', color: '#0f7a43', background: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9px' }}
                      >
                        <Fingerprint size={16} />
                        {passkeyRegistering ? 'Registering Device Passkey...' : 'Set Up Passkey on this Device'}
                      </button>
                    </div>

                    {passkeyNotice && (
                      <div style={{ background: '#dff3e6', color: '#0f7a43', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={15} /> {passkeyNotice}
                      </div>
                    )}
                    {passkeyError && (
                      <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> {passkeyError}
                      </div>
                    )}
                  </div>

                  {/* Footer with Contact Admin & Close */}
                  <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <a 
                      href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20-%20Customer%20PIN%20%2F%20Security%20Help" 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                    >
                      <Mail size={15} /> Contact Admin (pay.laxmikant@gmail.com)
                    </a>

                    <button type="button" className="btn btn-outline" onClick={() => setShowProfileModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: EXPORT & DATA BACKUP */}
              {customerSettingsTab === 'export' && (
                <div>
                  {/* Summary Banner */}
                  <div style={{ background: '#f7f8fa', border: '1.5px solid #e4e7ec', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e4e7ec' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e9f6ee', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Download size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#101828' }}>Export Your Orders & Khata Data</h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePrintSummary}
                        className="btn btn-outline"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#d0d5dd', background: '#fff' }}
                      >
                        <Printer size={15} /> Print Statement
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Orders Placed</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>{orders.length}</div>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Active Dues</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: (khataOverview.overallDue || 0) > 0 ? '#c2410c' : '#1f9d5a' }}>
                          ₹{(khataOverview.overallDue || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Linked Stores</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#7c3aed' }}>{(khataOverview.stores || []).length}</div>
                      </div>
                    </div>
                  </div>

                  {exportNotice && (
                    <div style={{ background: '#dff3e6', border: '1px solid #c4e8d1', color: '#0f7a43', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={18} />
                      <div>{exportNotice}</div>
                    </div>
                  )}
                  {exportError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} />
                      <div>{exportError}</div>
                    </div>
                  )}

                  {/* STEP 1: DATE RANGE */}
                  <div style={{ background: '#ffffff', border: '1.5px solid #e4e7ec', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#101828', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <CalendarRange size={18} color="var(--primary)" />
                        <span>Step 1: Choose Date Range & Time Period</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#e9f6ee', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '700' }}>
                        Selection: {exportDateRange === 'CUSTOM' ? `${exportStartDate} to ${exportEndDate}` : exportDateRange}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: exportDateRange === 'CUSTOM' ? '1rem' : '0' }}>
                      {[
                        { id: 'ALL', label: 'All Time (Full History)' },
                        { id: 'TODAY', label: 'Today' },
                        { id: '7DAYS', label: 'Last 7 Days' },
                        { id: 'THIS_MONTH', label: 'This Month' },
                        { id: 'LAST_MONTH', label: 'Last Month' },
                        { id: 'CUSTOM', label: 'Custom Range' }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setExportDateRange(preset.id)}
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            borderRadius: '8px',
                            border: exportDateRange === preset.id ? '1.5px solid var(--primary)' : '1px solid #d0d5dd',
                            background: exportDateRange === preset.id ? '#e9f6ee' : '#ffffff',
                            color: exportDateRange === preset.id ? 'var(--primary)' : '#475467',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {exportDateRange === 'CUSTOM' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f7f8fa', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e4e7ec' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                            Start Date (From)
                          </label>
                          <input
                            type="date"
                            className="input"
                            value={exportStartDate}
                            onChange={e => setExportStartDate(e.target.value)}
                            style={{ margin: 0, background: '#fff' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                            End Date (To)
                          </label>
                          <input
                            type="date"
                            className="input"
                            value={exportEndDate}
                            onChange={e => setExportEndDate(e.target.value)}
                            style={{ margin: 0, background: '#fff' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: WHAT TO EXPORT */}
                  <div style={{ background: '#ffffff', border: '1.5px solid #e4e7ec', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#101828', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <FileSpreadsheet size={18} color="#1f9d5a" />
                        <span>Step 2: Select What to Export</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setExportCategories({ orders: true, khata: true, profile: true, summary: true })}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Select All
                        </button>
                        <span style={{ color: '#d0d5dd' }}>•</span>
                        <button
                          type="button"
                          onClick={() => setExportCategories({ orders: false, khata: false, profile: false, summary: false })}
                          style={{ background: 'none', border: 'none', color: '#667085', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {[
                        {
                          key: 'orders',
                          title: 'Orders & Receipts History',
                          desc: 'Full list of orders placed, items purchased, totals and status',
                          count: `${filterCustomerRecordsByDate(orders, 'createdAt').length} orders`,
                          badgeColor: '#0284c7',
                          badgeBg: '#e0f2fe'
                        },
                        {
                          key: 'khata',
                          title: 'Khata & Udhar Ledger',
                          desc: 'Linked shop accounts, credit dues, and payment records',
                          count: `${(khataOverview.stores || []).length} stores`,
                          badgeColor: '#c2410c',
                          badgeBg: '#ffedd5'
                        },
                        {
                          key: 'profile',
                          title: 'Profile & Delivery Details',
                          desc: 'Customer identifier, phone, registered city, and addresses',
                          count: 'Account Info',
                          badgeColor: '#7c3aed',
                          badgeBg: '#f5f3ff'
                        },
                        {
                          key: 'summary',
                          title: 'Expense & Account Statement',
                          desc: 'Summary statement of total orders and outstanding dues',
                          count: 'Statement',
                          badgeColor: '#1f9d5a',
                          badgeBg: '#dff3e6'
                        }
                      ].map(cat => {
                        const isChecked = exportCategories[cat.key];
                        return (
                          <div
                            key={cat.key}
                            onClick={() => setExportCategories(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              padding: '0.85rem',
                              borderRadius: '10px',
                              border: isChecked ? '1.5px solid #1f9d5a' : '1px solid #e4e7ec',
                              background: isChecked ? '#eef8f1' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ marginTop: '2px', color: isChecked ? '#1f9d5a' : '#98a2b3' }}>
                              {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                <strong style={{ fontSize: '0.86rem', color: isChecked ? '#101828' : '#667085' }}>{cat.title}</strong>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: cat.badgeColor, background: cat.badgeBg, padding: '0.15rem 0.45rem', borderRadius: '5px' }}>
                                  {cat.count}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                                {cat.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* STEP 3: EXPORT ACTION BUTTONS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={exportLoading || !Object.values(exportCategories).some(Boolean)}
                      className="btn"
                      style={{
                        padding: '0.85rem 1.25rem',
                        background: '#1f9d5a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '0.92rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(31, 157, 90, 0.25)',
                        cursor: exportLoading || !Object.values(exportCategories).some(Boolean) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <FileSpreadsheet size={18} />
                      {exportLoading ? 'Generating Files...' : 'Export as Excel / CSV (Spreadsheets)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJSON}
                      disabled={exportLoading || !Object.values(exportCategories).some(Boolean)}
                      className="btn btn-outline"
                      style={{
                        padding: '0.85rem 1.25rem',
                        background: '#ffffff',
                        color: '#101828',
                        borderColor: '#101828',
                        borderRadius: '12px',
                        fontSize: '0.92rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: exportLoading || !Object.values(exportCategories).some(Boolean) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Database size={18} color="var(--primary)" />
                      {exportLoading ? 'Preparing Archive...' : 'Full Account Backup (.JSON)'}
                    </button>
                  </div>

                  {/* Footer with Contact Admin & Close */}
                  <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <a 
                      href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20-%20Customer%20Data%20Export%20Help" 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                    >
                      <Mail size={15} /> Contact Admin (pay.laxmikant@gmail.com)
                    </a>

                    <button type="button" className="btn btn-outline" onClick={() => setShowProfileModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MORE (Profile, Security, Export & Session) */}
        {activeTab === 'more' && (
          <>
          <div className="m-only">
            <MGroup>
              <div className="m-profile">
                <div className="m-profile-avatar"><User size={26} /></div>
                <div className="m-profile-info">
                  <div className="m-profile-name">{currentUser?.name || 'My Account'}</div>
                  <div className="m-profile-sub">{currentUser?.shortId}{currentUser?.phone ? ` • ${currentUser.phone}` : ''}</div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleOpenProfileModal}>Edit</button>
              </div>
            </MGroup>

            <MGroup label="Language">
              <div className="m-row m-row-seg">
                <MSegment
                  value={language}
                  onChange={setLanguage}
                  options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }]}
                />
              </div>
            </MGroup>

            <MGroup label="Security & legal">
              <MRow icon={<UserCheck size={18} />} tint="green" title="Profile & password" onClick={handleOpenProfileModal} />
              <MRow icon={<ShieldCheck size={18} />} tint="green" title="Privacy policy" onClick={() => navigate('/privacy')} />
              <MRow icon={<FileText size={18} />} tint="blue" title="Terms & conditions" onClick={() => navigate('/terms')} />
            </MGroup>

            <MGroup>
              <MRow icon={<Trash2 size={18} />} tint="red" title="Account deletion request" onClick={() => navigate('/delete')} danger />
              <MRow icon={<LogOut size={18} />} tint="red" title="Log out" onClick={handleLogout} danger chevron={false} />
            </MGroup>
          </div>

          <div className="panel desktop-only-block" style={{ background: '#fff', borderRadius: '16px', padding: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>Account &amp; Settings</h2>
              </div>
              <button type="button" className="btn btn-outline" onClick={handleOpenProfileModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}>
                <UserCheck size={15} color="var(--primary)" /> Edit Profile
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Language Selection Card */}
              <div style={{ background: '#f7f8fa', border: '1.5px solid #e4e7ec', borderRadius: '12px', padding: '1rem', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e9f6ee', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                        {t('more.langCardTitle', 'Choose Language / भाषा चुनें')}
                      </div>
                    </div>
                  </div>

                  {/* Language Selection Buttons */}
                  <div style={{ display: 'inline-flex', background: '#e4e7ec', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      style={{
                        border: 'none',
                        background: language === 'en' ? '#ffffff' : 'transparent',
                        color: language === 'en' ? 'var(--primary)' : '#475467',
                        fontWeight: language === 'en' ? 800 : 600,
                        padding: '0.45rem 1rem',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: language === 'en' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('hi')}
                      style={{
                        border: 'none',
                        background: language === 'hi' ? 'var(--primary)' : 'transparent',
                        color: language === 'hi' ? '#ffffff' : '#475467',
                        fontWeight: language === 'hi' ? 800 : 600,
                        padding: '0.45rem 1rem',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: language === 'hi' ? '0 2px 4px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      🇮🇳 हिंदी (Hindi)
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Overview Card */}
              <div style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e9f6ee', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{currentUser?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Short ID: <strong style={{ color: 'var(--primary)' }}>{currentUser?.shortId}</strong></div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={handleOpenProfileModal}
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: 'var(--primary)' }}
                  >
                    Edit
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475467', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>📞 Phone: <strong>{currentUser?.phone || 'N/A'}</strong></div>
                  <div>📍 City: <strong>{currentUser?.city || 'Delhi'}</strong></div>
                  <div>🏠 Address: <span>{currentUser?.address || 'Not specified'}</span></div>
                </div>
              </div>

              {/* Security & PIN Card */}
              <div style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eef8f1', color: '#1f9d5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>Security &amp; Lock</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475467', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={handleOpenProfileModal} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.45rem', fontSize: '0.82rem', background: '#fff' }}>
                    <Key size={15} color="#1f9d5a" /> Change Account Password
                  </button>
                </div>
              </div>

              {/* Legal & Privacy Card */}
              <div style={{ background: '#f7f8fa', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e9f6ee', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>Legal &amp; Privacy</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475467', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/privacy')} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.45rem', fontSize: '0.82rem', background: '#fff' }}>
                    <ShieldCheck size={15} color="#1f9d5a" /> Privacy Policy
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/terms')} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.45rem', fontSize: '0.82rem', background: '#fff' }}>
                    <FileText size={15} color="#0284c7" /> Terms &amp; Conditions
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/delete')} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.45rem', fontSize: '0.82rem', color: '#dc2626', background: '#fff' }}>
                    <Trash2 size={15} color="#dc2626" /> Account Deletion Request
                  </button>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ fontWeight: 700, gap: '0.5rem', width: '100%', maxWidth: '280px', justifyContent: 'center' }}>
                <LogOut size={16} /> Log Out Account
              </button>
            </div>
          </div>
          </>
        )}

        {/* SMART QUANTITY & UNIT SELECTOR MODAL (Shopkeeper POS Experience for Customer) */}
        {selectedModalProduct && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '400px', maxWidth: '100%', background: '#fff', padding: '1.25rem', borderRadius: '12px' }}>
              
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <h3 className="title" style={{ margin: 0, fontSize: '1.25rem' }}>{selectedModalProduct.name}</h3>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedModalProduct(null)} />
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Shop Rate: <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>₹{(Number(selectedModalProduct?.price) || 0).toFixed(2)}</strong> / {selectedModalProduct.unit}
              </div>

              {/* 1. PIECE MODE */}
              {selectedModalProduct.unit === 'Piece' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', margin: '1.25rem 0' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ fontSize: '1.5rem', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }} 
                      onClick={() => handleSetModalPresetQty(Math.max(1, modalQtyInput - 1))}
                    >
                      -
                    </button>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{modalQtyInput}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pieces</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ fontSize: '1.5rem', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }} 
                      onClick={() => handleSetModalPresetQty(modalQtyInput + 1)}
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Piece Presets */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(num => (
                      <button 
                        key={num} 
                        type="button" 
                        className={`btn ${modalQtyInput === num ? '' : 'btn-outline'}`}
                        style={{ flex: 1, minWidth: '38px', padding: '0.35rem 0.2rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        onClick={() => handleSetModalPresetQty(num)}
                      >
                        {num === 6 ? '6 (Half)' : (num === 12 ? '12 (Doz)' : num)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Quantity (Pieces)</label>
                      <input 
                        type="number" 
                        min="1" 
                        step="1"
                        className="input" 
                        style={{ margin: 0, marginTop: '4px' }} 
                        value={modalDisplayQty} 
                        onChange={e => handleModalDisplayQtyChange(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Amount (₹)</label>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ margin: 0, marginTop: '4px' }} 
                        value={modalPriceInput} 
                        onChange={e => handleModalPriceChange(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. KILO & LITRE MODE */}
              {(selectedModalProduct.unit === 'Kilo' || selectedModalProduct.unit === 'Litre') && (
                <div>
                  {/* Quick Presets */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {selectedModalProduct.unit === 'Kilo' ? (
                      <>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.05)}>50g</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.1)}>100g</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.25)}>250g</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.5)}>500g</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(1)}>1 kg</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(2)}>2 kg</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(5)}>5 kg</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.2)}>200ml</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.25)}>250ml</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(0.5)}>500ml</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(1)}>1 L</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(2)}>2 L</button>
                        <button type="button" className="btn btn-outline" style={{ flex: 1, minWidth: '45px', padding: '0.35rem 0.2rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleSetModalPresetQty(5)}>5 L</button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-2" style={{ gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                    <div>
                      {/* Quantity Header Row with Small Unit Switcher */}
                      <div className="flex-between" style={{ marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                          Quantity
                        </label>
                        {/* Compact Unit Toggle Buttons (No Emoji) */}
                        <div style={{ display: 'inline-flex', background: '#e4e7ec', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                          <button
                            type="button"
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              fontWeight: (modalSubUnitMode === 'Kilo' || modalSubUnitMode === 'Litre') ? '700' : '500',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: (modalSubUnitMode === 'Kilo' || modalSubUnitMode === 'Litre') ? 'var(--primary)' : 'transparent',
                              color: (modalSubUnitMode === 'Kilo' || modalSubUnitMode === 'Litre') ? '#fff' : '#475467',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => handleToggleModalSubUnitMode(selectedModalProduct.unit === 'Litre' ? 'Litre' : 'Kilo')}
                          >
                            {selectedModalProduct.unit === 'Litre' ? 'Litre' : 'Kilo'}
                          </button>
                          <button
                            type="button"
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              fontWeight: (modalSubUnitMode === 'Gram' || modalSubUnitMode === 'ML') ? '700' : '500',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: (modalSubUnitMode === 'Gram' || modalSubUnitMode === 'ML') ? 'var(--primary)' : 'transparent',
                              color: (modalSubUnitMode === 'Gram' || modalSubUnitMode === 'ML') ? '#fff' : '#475467',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => handleToggleModalSubUnitMode(selectedModalProduct.unit === 'Litre' ? 'ML' : 'Gram')}
                          >
                            {selectedModalProduct.unit === 'Litre' ? 'ML' : 'Gram'}
                          </button>
                        </div>
                      </div>

                      <input 
                        type="number" 
                        step="any" 
                        className="input" 
                        style={{ margin: 0 }} 
                        value={modalDisplayQty} 
                        onChange={e => handleModalDisplayQtyChange(e.target.value)} 
                        placeholder={modalSubUnitMode === 'Gram' ? 'e.g. 250' : (modalSubUnitMode === 'ML' ? 'e.g. 500' : 'e.g. 1.5')}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px', height: '20px', lineHeight: '20px' }}>
                        Amount (₹)
                      </label>
                      <input 
                        type="number" 
                        step="any" 
                        className="input" 
                        style={{ margin: 0 }} 
                        value={modalPriceInput} 
                        onChange={e => handleModalPriceChange(e.target.value)} 
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Add to List Button */}
              <button 
                type="button" 
                className="btn" 
                style={{ width: '100%', fontSize: '1rem', padding: '0.8rem', borderRadius: '8px', fontWeight: '700' }} 
                onClick={handleConfirmAddModalItem}
              >
                Add {modalQtyInput} {selectedModalProduct.unit} (₹{parseFloat(modalPriceInput || 0).toFixed(2)}) to List
              </button>
            </div>
          </div>
        )}

      </div>

      {/* App-Like Bottom Footer Navigation Bar */}
      <div className="mobile-footer-nav">
        <button type="button" className={`footer-nav-item ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => { setActiveTab('explore'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Store size={18} />
          <span>{t('nav.shops', 'Explore')}</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => { setActiveTab('compare'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Tag size={18} />
          <span>{t('nav.compare', 'Compare')}</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'khata' ? 'active' : ''}`} onClick={() => { setActiveTab('khata'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <BookOpen size={18} />
          <span>{t('nav.khata', 'My Khata')}</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Clock size={18} />
          <span>{t('nav.orders', 'All Orders')}</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'more' ? 'active' : ''}`} onClick={() => { setActiveTab('more'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Menu size={18} />
          <span>{t('nav.more', 'More')}</span>
        </button>
      </div>

      {/* FLOATING MOBILE CART BAR */}
      {Object.keys(orderList).length > 0 && activeCartShop && (
        <div 
          className="mobile-only"
          style={{
            position: 'fixed',
            bottom: 'calc(4.2rem + max(env(safe-area-inset-bottom, 0px), constant(safe-area-inset-bottom, 0px)))',
            left: '0.75rem',
            right: '0.75rem',
            zIndex: 900
          }}
        >
          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              background: '#1f9d5a',
              color: '#fff',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 20px -4px rgba(31, 157, 90, 0.45)',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
            onClick={() => setShowCartModal(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} />
              <span>{Object.keys(orderList).length} {Object.keys(orderList).length === 1 ? 'item' : 'items'} in Cart</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>₹{(Number(totalOrderAmount) || 0).toFixed(2)}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>• View Cart →</span>
            </div>
          </button>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, background: 'rgba(16, 24, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="panel modal-dialog" style={{ width: '380px', maxWidth: '100%', background: '#fff', borderRadius: '18px', padding: '1.75rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.15rem auto' }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', fontWeight: '800', color: '#101828' }}>
              Log Out?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#667085', lineHeight: '1.45' }}>
              Are you sure you want to log out of your GI SHOP account?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ padding: '0.75rem', fontWeight: '700', borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmLogout} 
                style={{ padding: '0.75rem', fontWeight: '700', borderRadius: '10px' }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN CUSTOMER ACCOUNT / SCREEN LOCK OVERLAY */}
      {isScreenLocked && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 99999, 
            background: 'linear-gradient(135deg, #101828 0%, #1d2939 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1.5rem',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ width: '380px', maxWidth: '100%', textAlign: 'center', color: '#fff' }}>
            {/* Header Icon & User Name */}
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.3)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Lock size={32} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.3rem 0', letterSpacing: '-0.02em', color: '#f7f8fa' }}>
              {currentUser?.name || 'Account Locked'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#98a2b3', marginBottom: '1.25rem' }}>
              {unlockMode === 'PIN' ? 'Enter 4-digit PIN to unlock account' : 'Enter account password to unlock'}
            </div>

            {/* Unlock Mode Selector (PIN vs Password) */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '3px', maxWidth: '280px', margin: '0 auto 1.25rem auto' }}>
              <button
                type="button"
                onClick={() => { setUnlockMode('PIN'); setUnlockError(''); }}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: unlockMode === 'PIN' ? '#10b981' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                4-Digit PIN
              </button>
              <button
                type="button"
                onClick={() => { setUnlockMode('PASSWORD'); setUnlockError(''); }}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: unlockMode === 'PASSWORD' ? '#10b981' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Password
              </button>
            </div>

            {/* Error message */}
            {unlockError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} /> {unlockError}
              </div>
            )}

            {unlockMode === 'PIN' ? (
              <div>
                {/* Visual PIN Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[0, 1, 2, 3].map(idx => (
                    <div 
                      key={idx} 
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '50%', 
                        border: '2px solid rgba(255,255,255,0.4)', 
                        background: unlockPin.length > idx ? '#10b981' : 'transparent',
                        boxShadow: unlockPin.length > idx ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                        transition: 'all 0.15s ease'
                      }} 
                    />
                  ))}
                </div>

                {/* Touch Keypad (1 - 9, Clear, 0, Unlock) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '280px', margin: '0 auto 1.5rem auto' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(String(num))}
                      disabled={unlockLoading}
                      style={{
                        height: '54px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#fff',
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                        backdropFilter: 'blur(10px)'
                      }}
                      onMouseDown={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                      onMouseUp={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    disabled={unlockLoading}
                    style={{
                      height: '54px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#98a2b3',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    disabled={unlockLoading}
                    style={{
                      height: '54px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#fff',
                      fontSize: '1.4rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnlockWithPin()}
                    disabled={unlockLoading || unlockPin.length !== 4}
                    style={{
                      height: '54px',
                      borderRadius: '14px',
                      border: 'none',
                      background: unlockPin.length === 4 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '0.92rem',
                      fontWeight: '800',
                      cursor: unlockPin.length === 4 ? 'pointer' : 'not-allowed',
                      boxShadow: unlockPin.length === 4 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                  >
                    {unlockLoading ? '...' : 'Unlock'}
                  </button>
                </div>
              </div>
            ) : (
              /* Password Unlock Form */
              <form onSubmit={handleUnlockWithPassword} style={{ maxWidth: '280px', margin: '0 auto 1.5rem auto' }}>
                <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                  <input
                    type={showUnlockPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={unlockPassword}
                    onChange={e => setUnlockPassword(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.85rem 2.5rem 0.85rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#98a2b3', padding: 0 }}
                  >
                    {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={unlockLoading || !unlockPassword}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    cursor: unlockPassword ? 'pointer' : 'not-allowed',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {unlockLoading ? 'Unlocking...' : 'Unlock with Password'}
                </button>
              </form>
            )}

            {/* Passkey / Face ID Unlock Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleUnlockWithPasskey}
                disabled={unlockLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#f7f8fa',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <Fingerprint size={18} color="#34d399" /> Unlock with Biometrics / Passkey
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#98a2b3',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  textDecoration: 'underline'
                }}
              >
                Switch Account / Log Out
              </button>

              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#667085' }}>
                Forgot PIN or Password?{' '}
                <a 
                  href="tel:7323809242" 
                  style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}
                >
                  Contact Customer Care (7323809242)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details & Timestamped Journey Modal */}
      <OrderTimelineModal 
        visible={!!selectedTimelineOrder} 
        order={selectedTimelineOrder} 
        onClose={() => setSelectedTimelineOrder(null)} 
      />
    </div>
  );
}
