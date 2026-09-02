import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMe, getItems, saveItem, deleteItem, editItem, toggleShopStatus, 
  getShopOrders, acceptShopOrder, declineShopOrder, completeShopOrder,
  getSales, updateSaleNote, inviteStaff, getStaff, deleteStaff,
  getMyDetailedShop, updateMyDetailedShop, getCities, changePin, changePassword,
  parseTimings, formatTimings, verifyPin
} from '../lib/api';
import { registerPasskey, loginWithPasskey } from '../lib/passkey';
import { MASTER_GROCERY_CATALOG, GROCERY_CATEGORIES } from '../lib/masterGroceryCatalog';
import { 
  Store, ShoppingCart, Users, Plus, Edit2, Trash2, LogOut, Clock, 
  BarChart2, ShieldCheck, UserPlus, CheckCircle, XCircle, FileText, 
  Search, X, Calendar, AlertCircle, ArrowRight, Sparkles, Check, Info, Lock, MapPin, Phone, AlertTriangle, Fingerprint, Settings, Key, User, Mail, Shield, Eye, EyeOff
} from 'lucide-react';
import POSBilling from '../components/POSBilling';
import CustomerLedger from '../components/CustomerLedger';
import logoImg from '../assets/logo.png';

export default function Shopkeeper() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentShop, setCurrentShop] = useState(null);
  const [isOwner, setIsOwner] = useState(true);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'orders' | 'khata' | 'transactions' | 'items' | 'staff'

  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Convert Order to POS prefill
  const [prefilledOrder, setPrefilledOrder] = useState(null);

  // Orders Accept/Decline Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [packingMinutes, setPackingMinutes] = useState(15);
  const [declineReason, setDeclineReason] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalMode, setOrderModalMode] = useState('ACCEPT'); // 'ACCEPT' | 'DECLINE'

  // Transactions & Analytics State
  const [sales, setSales] = useState([]);
  const [analytics, setAnalytics] = useState({ totalSales: 0, cashSales: 0, onlineSales: 0, khataSales: 0 });
  const [dateRange, setDateRange] = useState('Today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Note Modal State (Max 20 chars)
  const [selectedSaleForNote, setSelectedSaleForNote] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  // Item Form & Edit State (Owner only)
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Piece');
  const [editingItem, setEditingItem] = useState(null);

  // Master Catalog Auto-Complete & Quick Browse State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [masterCatalogSearch, setMasterCatalogSearch] = useState('');
  const [showMasterBrowser, setShowMasterBrowser] = useState(false);
  const [addedItemNotice, setAddedItemNotice] = useState('');

  // Staff State (Owner only)
  const [staffList, setStaffList] = useState([]);
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffMsg, setStaffMsg] = useState('');

  // Shop Details & Settings Modal State
  const [showShopDetailsModal, setShowShopDetailsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Lucknow', 'Pune']);
  const [detailedShop, setDetailedShop] = useState(null);
  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopPhone: '',
    city: 'Delhi',
    shopAddress: '',
    timings: '08:00 AM - 10:00 PM'
  });
  const [timeOpen, setTimeOpen] = useState('08:00');
  const [timeClose, setTimeClose] = useState('22:00');
  const [shopSaving, setShopSaving] = useState(false);
  const [shopSaveNotice, setShopSaveNotice] = useState('');

  const handleOpenShopDetails = async () => {
    try {
      const data = await getMyDetailedShop();
      setDetailedShop(data);
      const parsed = parseTimings(data.timings);
      setTimeOpen(parsed.open);
      setTimeClose(parsed.close);
      setShopForm({
        shopName: data.shopName || '',
        shopPhone: data.shopPhone || '',
        city: data.city || 'Delhi',
        shopAddress: data.shopAddress || '',
        timings: data.timings || formatTimings(parsed.open, parsed.close)
      });
      setShopSaveNotice('');
      setShowShopDetailsModal(true);
    } catch (e) {
      alert('Error fetching shop details');
    }
  };

  const handleSaveShopDetails = async (e) => {
    e.preventDefault();
    if (!isOwner) return alert('Only the shop owner can edit shop details.');
    setShopSaving(true);
    setShopSaveNotice('');
    try {
      const res = await updateMyDetailedShop(shopForm);
      setShopSaveNotice(res.message || 'Shop details updated successfully!');
      setTimeout(() => setShopSaveNotice(''), 3000);
      loadInitialData();
    } catch (e) {
      alert(e.message || 'Error updating shop details');
    } finally {
      setShopSaving(false);
    }
  };

  const [settingsTab, setSettingsTab] = useState('store'); // 'store' | 'owner' | 'security'

  // PIN Form State
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

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
      setCurrentUser(prev => prev ? ({ ...prev, pin: pinForm.newPin, hasPinSet: 1 }) : prev);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setTimeout(() => setPinNotice(''), 4000);
    } catch (err) {
      setPinError(err.message || 'Failed to update PIN');
    } finally {
      setPinSaving(false);
    }
  };

  // PIN Visibility States
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Password Form State & Visibility
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  const handleRegisterPasskey = async () => {
    setPasskeyRegistering(true);
    setPasskeyNotice('');
    setPasskeyError('');
    try {
      await registerPasskey(`${currentUser?.name || 'Shopkeeper'}'s Device`);
      setPasskeyNotice('Passkey registered successfully on this device! You can now log in with Face ID / Fingerprint.');
      setTimeout(() => setPasskeyNotice(''), 5000);
    } catch (err) {
      console.error('[Passkey Registration Error]', err);
      setPasskeyError(err.message || 'Passkey setup was cancelled or failed.');
    } finally {
      setPasskeyRegistering(false);
    }
  };

  // Screen Lock / POS Register Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [unlockMode, setUnlockMode] = useState('PIN'); // 'PIN' | 'PASSWORD'
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

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
      setUnlockPin('');
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
      setUnlockError(err.message || 'Passkey unlock failed or cancelled.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleKeypadPress = (num) => {
    if (unlockPin.length < 4) {
      const nextPin = unlockPin + num;
      setUnlockPin(nextPin);
      setUnlockError('');
      if (nextPin.length === 4) {
        handleUnlockWithPin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setUnlockPin(prev => prev.slice(0, -1));
    setUnlockError('');
  };

  const loadInitialData = async () => {
    try {
      const me = await getMe();
      setCurrentUser(me.user);
      if (me.shop) {
        setCurrentShop(me.shop);
        setIsOpen(me.shop.isOpen === 1);
        setIsOwner(me.isOwner !== false && me.user.role === 'Shopkeeper');
      } else if (me.staffRole) {
        setIsOwner(false);
        setIsOpen(me.staffRole.isOpen === 1);
      }

      loadItemsData();
      loadOrdersData();
      loadSalesData(dateRange);
      if (me.shop && me.user.role === 'Shopkeeper') loadStaffData();
    } catch (e) {
      if (e.message.includes('Unauthorized') || e.message.includes('terminated')) handleLogout();
    }
  };

  const loadItemsData = async () => {
    try {
      const data = await getItems();
      setItems(data);
    } catch (e) { console.error(e); }
  };

  const loadOrdersData = async () => {
    try {
      const data = await getShopOrders();
      setOrders(data);
    } catch (e) { console.error(e); }
  };

  const loadSalesData = async (range, start, end) => {
    try {
      const params = {};
      if (range === 'Custom' && start && end) {
        params.startDate = start;
        params.endDate = end;
      } else {
        params.range = range;
      }
      const data = await getSales(params);
      setSales(data.sales || []);
      setAnalytics(data.analytics || {});
    } catch (e) { console.error(e); }
  };

  const loadStaffData = async () => {
    try {
      const data = await getStaff();
      setStaffList(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadInitialData();
    getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') loadOrdersData();
    if (activeTab === 'transactions') loadSalesData(dateRange, customStart, customEnd);
    if (activeTab === 'items') loadItemsData();
    if (activeTab === 'staff') loadStaffData();
  }, [activeTab, dateRange]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleToggleStatus = async () => {
    const newStatus = !isOpen;
    await toggleShopStatus(newStatus);
    setIsOpen(newStatus);
  };

  // Order Actions
  const handleOpenOrderModal = (order, mode) => {
    setSelectedOrder(order);
    setOrderModalMode(mode);
    setPackingMinutes(15);
    setDeclineReason('');
    setShowOrderModal(true);
  };

  const handleConfirmOrderAction = async () => {
    if (!selectedOrder) return;
    if (orderModalMode === 'ACCEPT') {
      await acceptShopOrder(selectedOrder.id, packingMinutes);
    } else {
      await declineShopOrder(selectedOrder.id, declineReason);
    }
    setShowOrderModal(false);
    loadOrdersData();
  };

  const handleConvertToPOS = (order) => {
    setPrefilledOrder(order);
    setActiveTab('pos');
  };

  // Master Catalog Auto-Fill Handlers
  const handleSelectMasterSuggestion = (masterItem) => {
    setNewItemName(masterItem.name);
    setNewItemPrice(masterItem.price.toString());
    setNewItemUnit(masterItem.unit);
    setShowSuggestions(false);
  };

  const handleQuickAddMasterItem = async (masterItem) => {
    try {
      await saveItem({
        name: masterItem.name,
        price: masterItem.price,
        unit: masterItem.unit
      });
      setAddedItemNotice(`Added "${masterItem.name}" to shop inventory!`);
      setTimeout(() => setAddedItemNotice(''), 2500);
      loadItemsData();
    } catch (e) {
      alert('Error adding item');
    }
  };

  // Auto-complete filtered suggestions
  const nameSuggestions = newItemName.trim().length > 1 ? MASTER_GROCERY_CATALOG.filter(item => 
    item.name.toLowerCase().includes(newItemName.toLowerCase())
  ).slice(0, 6) : [];

  // Master Browser items
  const browsableMasterItems = MASTER_GROCERY_CATALOG.filter(item => {
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
    const matchesSearch = !masterCatalogSearch || item.name.toLowerCase().includes(masterCatalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Item CRUD
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    await saveItem({ name: newItemName, price: parseFloat(newItemPrice), unit: newItemUnit });
    setNewItemName('');
    setNewItemPrice('');
    setShowSuggestions(false);
    loadItemsData();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    await editItem(editingItem.id, { name: editingItem.name, price: parseFloat(editingItem.price), unit: editingItem.unit });
    setEditingItem(null);
    loadItemsData();
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this product from active inventory?')) return;
    await deleteItem(id);
    loadItemsData();
  };

  // Staff Invitation
  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    if (!staffIdentifier) return;
    try {
      const res = await inviteStaff(staffIdentifier);
      setStaffMsg(res.message || 'Invitation sent!');
      setStaffIdentifier('');
      loadStaffData();
    } catch (err) {
      setStaffMsg(err.message || 'Failed to send invite.');
    }
  };

  const handleRemoveStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    await deleteStaff(id);
    loadStaffData();
  };

  // Note Action (Max 20 chars)
  const handleSaveNote = async () => {
    if (!selectedSaleForNote) return;
    await updateSaleNote(selectedSaleForNote.id, noteInput.slice(0, 20));
    setSelectedSaleForNote(null);
    loadSalesData(dateRange, customStart, customEnd);
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Top Header */}
      <div className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logoImg} alt="GI SHOP" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d', letterSpacing: '-0.02em' }}>GI SHOP</span>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 0.25rem' }}></div>

          <div 
            onClick={handleOpenShopDetails}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              cursor: 'pointer', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '8px', 
              transition: 'all 0.15s ease',
              border: '1px solid transparent',
              background: '#f8fafc'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; }}
            title="Click to view and edit shop details"
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {currentShop?.shopName || 'Shop Dashboard'}
                <span className="badge" style={{ background: isOwner ? '#eff6ff' : '#f5f3ff', color: isOwner ? 'var(--primary)' : '#7c3aed', fontSize: '0.72rem' }}>
                  {isOwner ? 'Owner' : 'Cashier'}
                </span>
                <Info size={13} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Shop ID: <strong style={{ color: 'var(--primary)' }}>{currentShop?.shortId || 'shp'}</strong> • User: {currentUser?.name} ({currentUser?.shortId})
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Shop Open / Closed Switcher */}
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              background: isOpen ? '#dcfce7' : '#fee2e2',
              color: isOpen ? '#15803d' : '#b91c1c',
              border: `1px solid ${isOpen ? '#bbf7d0' : '#fecaca'}`
            }}
            onClick={handleToggleStatus}
          >
            {isOpen ? '🟢 Shop is OPEN' : '🔴 Shop is CLOSED'}
          </button>

          {/* Settings Button */}
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={handleOpenShopDetails} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Settings size={16} /> Settings
          </button>

          {/* Quick Screen Lock Button */}
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => {
              setIsScreenLocked(true);
              setUnlockPin('');
              setUnlockPassword('');
              setUnlockError('');
            }} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#cbd5e1' }}
            title="Lock Register / Screen"
          >
            <Lock size={15} color="#e11d48" /> Lock
          </button>

          <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ flex: 1, marginTop: '1rem', marginBottom: '4rem' }}>
        
        {/* TAB 1: POS BILLING */}
        {activeTab === 'pos' && (
          <POSBilling 
            items={items} 
            onSaleComplete={() => { loadSalesData(dateRange); loadOrdersData(); }} 
            prefilledOrder={prefilledOrder}
            onClearPrefill={() => setPrefilledOrder(null)}
          />
        )}

        {/* TAB 2: INCOMING ORDERS */}
        {activeTab === 'orders' && (
          <div className="panel">
            <h3 className="title" style={{ marginBottom: '1rem' }}>Incoming Customer Orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => {
                const items = JSON.parse(order.itemsJSON || '[]');
                return (
                  <div key={order.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem' }}>Order #{order.orderNumber}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          From: <strong>{order.customerName}</strong> ({order.customerShortId || '—'}) • {order.customerPhone} • {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <span className="badge" style={{
                        background: order.status === 'PENDING' ? '#eff6ff' 
                          : (order.status === 'PACKING' ? '#fef3c7' 
                          : ((order.status === 'COMPLETED' || order.status === 'READY') ? '#e0f2fe' 
                          : (order.status === 'COLLECTED' ? '#dcfce7' 
                          : ((order.status === 'NOT_COLLECTED' || order.status === 'CANCELLED_BY_CUSTOMER' || order.status === 'AUTO_CANCELLED_EXPIRED' || order.status === 'DECLINED') ? '#fee2e2' : '#eff6ff')))),
                        color: order.status === 'PENDING' ? 'var(--primary)' 
                          : (order.status === 'PACKING' ? '#b45309' 
                          : ((order.status === 'COMPLETED' || order.status === 'READY') ? '#0369a1' 
                          : (order.status === 'COLLECTED' ? '#15803d' 
                          : ((order.status === 'NOT_COLLECTED' || order.status === 'CANCELLED_BY_CUSTOMER' || order.status === 'AUTO_CANCELLED_EXPIRED' || order.status === 'DECLINED') ? '#b91c1c' : '#1d4ed8')))),
                        borderColor: 'transparent',
                        padding: '0.35rem 0.65rem',
                        fontWeight: '700'
                      }}>
                        {order.status === 'PENDING' && '🕒 PENDING ACCEPTANCE (45m Window)'}
                        {order.status === 'PACKING' && `⏳ PACKING (~${order.packingMinutes}m)`}
                        {(order.status === 'COMPLETED' || order.status === 'READY') && '📦 READY (WAITING FOR CUSTOMER)'}
                        {order.status === 'COLLECTED' && '✓ CUSTOMER COLLECTED'}
                        {order.status === 'NOT_COLLECTED' && '✗ CUSTOMER MARKED NOT COLLECTED'}
                        {order.status === 'CANCELLED_BY_CUSTOMER' && '🚫 CANCELLED BY CUSTOMER'}
                        {order.status === 'AUTO_CANCELLED_EXPIRED' && '⛔ AUTO-CANCELLED (45m EXPIRED)'}
                        {order.status === 'DECLINED' && `❌ DECLINED (${order.declineReason || 'Unavailable'})`}
                      </span>
                    </div>

                    {order.status === 'PENDING' && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', padding: '0.4rem 0.75rem', margin: '0.4rem 0', fontSize: '0.8rem', color: '#92400e' }}>
                        ⚠️ <strong>Action Required:</strong> Please accept & set packing time within 45 minutes or this order will be automatically cancelled.
                      </div>
                    )}

                    {order.status === 'AUTO_CANCELLED_EXPIRED' && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.4rem 0.75rem', margin: '0.4rem 0', fontSize: '0.8rem', color: '#b91c1c' }}>
                        ⛔ This order was automatically cancelled because 45 minutes elapsed without acceptance.
                      </div>
                    )}

                    <div style={{ background: '#fff', borderRadius: '6px', padding: '0.75rem', margin: '0.5rem 0', border: '1px solid #f1f5f9' }}>
                      {items.map((entry, idx) => (
                        <div key={idx} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          <span>{entry.item?.name || entry.name} x {entry.qty}</span>
                          <span>₹{(entry.amount || (entry.rate * entry.qty) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex-between" style={{ borderTop: '1px dashed var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: '700' }}>
                        <span>Total:</span>
                        <span style={{ color: 'var(--success)' }}>
                          ₹{((order.estimatedTotal && order.estimatedTotal > 0)
                            ? order.estimatedTotal
                            : items.reduce((sum, entry) => sum + (entry.amount || (entry.rate * entry.qty) || ((entry.item?.price || 0) * (entry.qty || 1)) || 0), 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {order.status === 'PENDING' && (
                        <>
                          <button type="button" className="btn btn-success" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={() => handleOpenOrderModal(order, 'ACCEPT')}>
                            Accept &amp; Set Packing Time
                          </button>
                          <button type="button" className="btn btn-danger" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={() => handleOpenOrderModal(order, 'DECLINE')}>
                            Decline
                          </button>
                        </>
                      )}

                      {order.status === 'PACKING' && (
                        <>
                          <button type="button" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={() => handleConvertToPOS(order)}>
                            ⚡ Convert to Final POS Bill
                          </button>
                          <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={async () => { await completeShopOrder(order.id); loadOrdersData(); }}>
                            Mark Ready / Done
                          </button>
                        </>
                      )}

                      {(order.status === 'READY' || order.status === 'COMPLETED') && (
                        <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '600' }}>
                          ⏳ Order is marked Ready. Waiting for customer to confirm collection.
                        </span>
                      )}

                      {order.status === 'COLLECTED' && (
                        <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle size={15} /> Order finalized and collected by customer. (Locked)
                        </span>
                      )}

                      {order.status === 'NOT_COLLECTED' && (
                        <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <AlertTriangle size={15} /> Customer marked as not collected. (Locked)
                        </span>
                      )}

                      {order.status === 'CANCELLED_BY_CUSTOMER' && (
                        <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <X size={15} /> Customer cancelled / took back this order. (Locked)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No incoming orders at the moment.</p>}
            </div>
          </div>
        )}

        {/* TAB 3: KHATA LEDGER */}
        {activeTab === 'khata' && <CustomerLedger currentShop={currentShop} />}

        {/* TAB 4: TRANSACTIONS & ANALYTICS */}
        {activeTab === 'transactions' && (
          <div>
            {/* Analytics Metric Cards */}
            <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
              <div className="panel" style={{ background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Revenue</div>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--primary)', fontSize: '1.4rem' }}>₹{(analytics.totalSales || 0).toFixed(2)}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analytics.count || 0} transactions</div>
              </div>

              <div className="panel" style={{ background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Cash Collected</div>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--success)', fontSize: '1.4rem' }}>₹{(analytics.cashSales || 0).toFixed(2)}</h3>
              </div>

              <div className="panel" style={{ background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Online / UPI</div>
                <h3 style={{ margin: '0.25rem 0', color: '#7c3aed', fontSize: '1.4rem' }}>₹{(analytics.onlineSales || 0).toFixed(2)}</h3>
              </div>

              <div className="panel" style={{ background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Khata (In Book)</div>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--warning)', fontSize: '1.4rem' }}>₹{(analytics.khataSales || 0).toFixed(2)}</h3>
              </div>
            </div>

            {/* Date Filters Bar */}
            <div className="panel" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
              <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600' }}>
                  <Calendar size={16} /> Date Filter:
                </div>

                {!isOwner ? (
                  <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)' }}>
                    Today Only (Cashier Access)
                  </span>
                ) : (
                  <div className="filter-pills-scroll">
                    {['Today', 'Yesterday', '7Days', '15Days', '1Month', '3Months', '1Year', 'Custom'].map(r => (
                      <button
                        key={r}
                        type="button"
                        className={`btn ${dateRange === r ? '' : 'btn-outline'}`}
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => setDateRange(r)}
                      >
                        {r === '7Days' ? '7 Days' : (r === '15Days' ? '15 Days' : (r === '1Month' ? '1 Month' : (r === '3Months' ? '3 Months' : (r === '1Year' ? '1 Year' : r))))}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isOwner && dateRange === 'Custom' && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="date" className="input" style={{ width: '160px', margin: 0 }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span>to</span>
                  <input type="date" className="input" style={{ width: '160px', margin: 0 }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  <button type="button" className="btn" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }} onClick={() => loadSalesData('Custom', customStart, customEnd)}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Sales Table with 20-char Notes */}
            <div className="panel">
              <h3 className="title" style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Itemized Sales History</h3>
              <div className="table-responsive">
                <table style={{ width: '100%', minWidth: '600px', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '0.65rem' }}>Bill # & Date</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem' }}>Items Breakdown</th>
                      <th style={{ textAlign: 'right', padding: '0.65rem' }}>Amount</th>
                      <th style={{ textAlign: 'center', padding: '0.65rem' }}>Mode</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem' }}>Note (Max 20c)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => {
                      const items = JSON.parse(sale.itemsJSON || '[]');
                      return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.65rem' }}>
                            <strong>#{sale.id}</strong><br/>
                            <small style={{ color: 'var(--text-muted)' }}>{new Date(sale.date).toLocaleString()}</small>
                          </td>
                          <td style={{ padding: '0.65rem' }}>
                            <div>{sale.customerPhone || 'Walk-in'}</div>
                            {sale.customerShortId && <small style={{ color: 'var(--primary)' }}>({sale.customerShortId})</small>}
                          </td>
                          <td style={{ padding: '0.65rem' }}>
                            {items.map((c, i) => (
                              <div key={i} style={{ fontSize: '0.8rem' }}>
                                {c.item?.name || c.name} ({c.qty} {c.item?.unit}) @ ₹{c.rate || c.item?.price}
                              </div>
                            ))}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.65rem', fontWeight: '700', color: 'var(--success)' }}>
                            ₹{sale.total.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.65rem' }}>
                            <span className="badge">{sale.paymentMethod}</span>
                          </td>
                          <td style={{ padding: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', color: sale.note ? '#6366f1' : 'var(--text-muted)' }}>
                                {sale.note ? `"${sale.note}"` : '—'}
                              </span>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                onClick={() => { setSelectedSaleForNote(sale); setNoteInput(sale.note || ''); }}
                              >
                                Edit Note
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sales.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No sales recorded for this period.</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE ITEMS (OWNER ONLY) WITH MASTER GROCERY AUTO-FILL */}
        {activeTab === 'items' && isOwner && (
          <div>
            {addedItemNotice && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                <CheckCircle size={18} /> {addedItemNotice}
              </div>
            )}

            {/* Add Item Form with Live Auto-Complete Suggestions */}
            <div className="panel" style={{ marginBottom: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>Add Inventory Product</h3>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  onClick={() => setShowMasterBrowser(!showMasterBrowser)}
                >
                  <Sparkles size={14} /> {showMasterBrowser ? 'Hide Master Library' : '⚡ Browse Master Grocery Library'}
                </button>
              </div>

              <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', position: 'relative' }}>
                
                {/* Auto-Complete Input */}
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                  <input 
                    className="input" 
                    style={{ margin: 0 }} 
                    placeholder="Type grocery name (e.g. Biscuit, Oil, Rice, Atta, Soap)..." 
                    value={newItemName} 
                    onChange={e => { setNewItemName(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    required 
                  />

                  {/* Auto-Fill Dropdown List */}
                  {showSuggestions && nameSuggestions.length > 0 && (
                    <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: '4px', padding: '0.5rem', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--border)' }}>
                        💡 Auto-Fill Suggestions (Click to fill Name, Rate & Unit)
                      </div>
                      {nameSuggestions.map((sug, idx) => (
                        <div 
                          key={idx}
                          style={{ padding: '0.55rem 0.65rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => handleSelectMasterSuggestion(sug)}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{sug.name}</div>
                            <span className="badge" style={{ fontSize: '0.7rem' }}>{sug.category}</span>
                          </div>
                          <strong style={{ color: 'var(--success)', fontSize: '0.9rem' }}>₹{sug.price} / {sug.unit}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <input 
                  className="input" 
                  type="number" 
                  step="0.01" 
                  style={{ width: '120px', margin: 0 }} 
                  placeholder="Rate (₹)" 
                  value={newItemPrice} 
                  onChange={e => setNewItemPrice(e.target.value)} 
                  required 
                />

                <select 
                  className="select" 
                  style={{ width: '120px', margin: 0 }} 
                  value={newItemUnit} 
                  onChange={e => setNewItemUnit(e.target.value)}
                >
                  <option value="Piece">Piece</option>
                  <option value="Kilo">Kilo</option>
                  <option value="Litre">Litre</option>
                </select>

                <button type="submit" className="btn" style={{ padding: '0.65rem 1.25rem' }}>
                  + Add to Shop
                </button>
              </form>
            </div>

            {/* Master Grocery Library Drawer / Browser */}
            {showMasterBrowser && (
              <div className="panel" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '2px dashed var(--primary)' }}>
                <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 className="title" style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
                      <Sparkles size={18} /> Master Grocery Library ({MASTER_GROCERY_CATALOG.length}+ Preloaded Items)
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tap <strong>"1-Tap Add"</strong> to instantly add pre-priced grocery items to your shop!
                    </div>
                  </div>

                  <div style={{ minWidth: '220px' }}>
                    <input 
                      className="input" 
                      style={{ margin: 0, background: '#fff' }} 
                      placeholder="Search master library..." 
                      value={masterCatalogSearch} 
                      onChange={e => setMasterCatalogSearch(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="filter-pills-scroll" style={{ paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  {GROCERY_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn ${selectedCategory === cat ? '' : 'btn-outline'}`}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Master Items Grid */}
                <div className="grid grid-3" style={{ maxHeight: '350px', overflowY: 'auto', gap: '0.5rem', paddingRight: '4px' }}>
                  {browsableMasterItems.map((masterItem, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.2rem' }}>{masterItem.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge" style={{ fontSize: '0.7rem' }}>{masterItem.category}</span>
                          <strong style={{ color: 'var(--success)', fontSize: '0.85rem' }}>₹{masterItem.price}/{masterItem.unit}</strong>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        onClick={() => handleQuickAddMasterItem(masterItem)}
                      >
                        + 1-Tap Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Active Products in Shop */}
            <div className="panel">
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <h3 className="title" style={{ margin: 0, fontSize: '1.1rem' }}>Active Products in Your Shop ({items.length})</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map(item => (
                  <div key={item.id} className="list-item" style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.65rem 0.85rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{item.name}</strong>
                      <span className="badge" style={{ marginLeft: '0.5rem' }}>₹{item.price.toFixed(2)} / {item.unit}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.65rem' }} onClick={() => setEditingItem(item)}>
                        <Edit2 size={14} />
                      </button>
                      <button type="button" className="btn btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No products added yet. Use the auto-fill form above or browse the Master Library!</p>}
              </div>
            </div>

            {/* Edit Item Modal */}
            {editingItem && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                <div className="panel" style={{ width: '380px', maxWidth: '100%' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h3 className="title" style={{ margin: 0 }}>Edit Product</h3>
                    <X size={20} style={{ cursor: 'pointer' }} onClick={() => setEditingItem(null)} />
                  </div>
                  <form onSubmit={handleSaveEdit}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product Name</label>
                    <input className="input" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} required />
                    
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rate (₹)</label>
                    <input className="input" type="number" step="0.01" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} required />
                    
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selling Unit</label>
                    <select className="select" value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}>
                      <option value="Piece">Piece</option>
                      <option value="Kilo">Kilo</option>
                      <option value="Litre">Litre</option>
                    </select>

                    <div className="flex-between" style={{ marginTop: '1rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setEditingItem(null)}>Cancel</button>
                      <button type="submit" className="btn">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: STAFF MANAGEMENT (OWNER ONLY) */}
        {activeTab === 'staff' && isOwner && (
          <div className="panel">
            <h3 className="title">Invite Staff / Cashier</h3>
            <p className="subtitle">Search any customer by their Short ID or Phone number to invite them to join your shop as a Cashier.</p>

            <form onSubmit={handleInviteStaff} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', maxWidth: '500px' }}>
              <input 
                className="input" 
                style={{ margin: 0, flex: 1 }} 
                placeholder="Customer Short ID or Phone number" 
                value={staffIdentifier} 
                onChange={e => setStaffIdentifier(e.target.value)} 
                required 
              />
              <button type="submit" className="btn">Send Invite</button>
            </form>

            {staffMsg && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', padding: '0.65rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {staffMsg}
              </div>
            )}

            <h3 className="title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Current Staff & Invites</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {staffList.map(st => (
                <div key={st.id} className="list-item" style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{st.userName}</strong> ({st.userShortId}) • {st.userPhone}
                    <span className="badge" style={{
                      marginLeft: '0.5rem',
                      background: st.status === 'ACCEPTED' ? '#dcfce7' : '#fef3c7',
                      color: st.status === 'ACCEPTED' ? '#15803d' : '#b45309'
                    }}>
                      {st.status === 'ACCEPTED' ? 'Active Cashier' : 'Invite Pending'}
                    </span>
                  </div>
                  <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleRemoveStaff(st.id)}>
                    Remove
                  </button>
                </div>
              ))}
              {staffList.length === 0 && <p className="subtitle">No staff members enrolled yet.</p>}
            </div>
          </div>
        )}

      </div>

      {/* Orders Accept / Decline Modal */}
      {showOrderModal && (
        <div className="modal-overlay">
          <div className="panel modal-dialog" style={{ width: '400px', maxWidth: '100%', padding: '1.25rem' }}>
            <h3 className="title">{orderModalMode === 'ACCEPT' ? 'Accept Order & Set Packing Time' : 'Decline Order'}</h3>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>Order #{selectedOrder?.orderNumber} from {selectedOrder?.customerName}</p>

            {orderModalMode === 'ACCEPT' ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Estimated Packing Time (Minutes):</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[10, 15, 20, 30].map(m => (
                    <button key={m} type="button" className={`btn ${packingMinutes === m ? '' : 'btn-outline'}`} style={{ flex: 1, padding: '0.45rem' }} onClick={() => setPackingMinutes(m)}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Reason for declining:</label>
                <input className="input" placeholder="e.g. Item out of stock" value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
              </div>
            )}

            <div className="flex-between">
              <button type="button" className="btn btn-outline" onClick={() => setShowOrderModal(false)}>Cancel</button>
              <button type="button" className={`btn ${orderModalMode === 'ACCEPT' ? 'btn-success' : 'btn-danger'}`} onClick={handleConfirmOrderAction}>
                {orderModalMode === 'ACCEPT' ? 'Confirm & Start Packing' : 'Decline Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit 20-Character Note Modal */}
      {selectedSaleForNote && (
        <div className="modal-overlay">
          <div className="panel modal-dialog" style={{ width: '380px', maxWidth: '100%', padding: '1.25rem' }}>
            <h3 className="title" style={{ fontSize: '1.1rem' }}>Add Note to Bill #{selectedSaleForNote.id}</h3>
            <p className="subtitle" style={{ fontSize: '0.8rem' }}>Enter an audit note (Maximum 20 characters):</p>
            
            <input 
              className="input" 
              maxLength={20}
              placeholder="e.g. Delivered to room 2"
              value={noteInput} 
              onChange={e => setNoteInput(e.target.value)} 
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {noteInput.length} / 20 characters
            </div>

            <div className="flex-between">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedSaleForNote(null)}>Cancel</button>
              <button type="button" className="btn" onClick={handleSaveNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Details, Linked User & Security Settings Modal */}
      {showShopDetailsModal && (
        <div className="modal-overlay">
          <div className="panel modal-dialog" style={{ width: '860px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.75rem', borderRadius: '22px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.3rem' }}>Shop & Owner Settings</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Shop ID: <strong style={{ color: 'var(--primary)' }}>{detailedShop?.shortId || currentShop?.shortId}</strong> • Owner: <strong>{detailedShop?.ownerName || currentUser?.name}</strong>
                  </div>
                </div>
              </div>
              <X size={22} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowShopDetailsModal(false)} />
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setSettingsTab('store')}
                style={{
                  padding: '0.6rem',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  background: settingsTab === 'store' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'store' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'store' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Store size={16} /> Store Details
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('owner')}
                style={{
                  padding: '0.6rem',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  background: settingsTab === 'owner' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'owner' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'owner' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <User size={16} /> Linked User
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('security')}
                style={{
                  padding: '0.6rem',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  background: settingsTab === 'security' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'security' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Shield size={16} /> PIN & Security
              </button>
            </div>

            {/* TAB 1: STORE DETAILS */}
            {settingsTab === 'store' && (
              <div>
                {!isOwner && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={18} />
                    <div>
                      <strong>View-Only Mode:</strong> You are logged in as a <strong>Cashier</strong>. Only the shop owner has permission to change store details, address, or timings.
                    </div>
                  </div>
                )}

                {shopSaveNotice && (
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} />
                    <div>{shopSaveNotice}</div>
                  </div>
                )}

                <form onSubmit={handleSaveShopDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Store Name</label>
                      <input 
                        className="input" 
                        value={shopForm.shopName} 
                        onChange={e => setShopForm({ ...shopForm, shopName: e.target.value })} 
                        disabled={!isOwner}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Phone</label>
                      <input 
                        className="input" 
                        value={shopForm.shopPhone} 
                        onChange={e => setShopForm({ ...shopForm, shopPhone: e.target.value })} 
                        disabled={!isOwner}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>City / Region</label>
                      <select 
                        className="input" 
                        value={shopForm.city} 
                        onChange={e => setShopForm({ ...shopForm, city: e.target.value })} 
                        disabled={!isOwner}
                        required
                        style={{ background: '#ffffff', width: '100%', marginBottom: 0 }}
                      >
                        {cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Shop Address</label>
                    <input 
                      className="input" 
                      value={shopForm.shopAddress} 
                      onChange={e => setShopForm({ ...shopForm, shopAddress: e.target.value })} 
                      disabled={!isOwner}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>Operating Timings</label>
                    
                    {/* 2 Time Pickers (Opens At & Closes At) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                          Opens At (From)
                        </span>
                        <input 
                          type="time" 
                          className="input" 
                          value={timeOpen} 
                          disabled={!isOwner}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTimeOpen(val);
                            setShopForm(prev => ({ ...prev, timings: formatTimings(val, timeClose) }));
                          }} 
                          required 
                          style={{ margin: 0, background: '#ffffff' }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                          Closes At (To)
                        </span>
                        <input 
                          type="time" 
                          className="input" 
                          value={timeClose} 
                          disabled={!isOwner}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTimeClose(val);
                            setShopForm(prev => ({ ...prev, timings: formatTimings(timeOpen, val) }));
                          }} 
                          required 
                          style={{ margin: 0, background: '#ffffff' }}
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    {isOwner && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' }}>
                        {[
                          { label: '8 AM - 10 PM', open: '08:00', close: '22:00' },
                          { label: '9 AM - 9 PM', open: '09:00', close: '21:00' },
                          { label: '7 AM - 11 PM', open: '07:00', close: '23:00' },
                          { label: '6 AM - 10 PM', open: '06:00', close: '22:00' }
                        ].map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              setTimeOpen(p.open);
                              setTimeClose(p.close);
                              setShopForm(prev => ({ ...prev, timings: formatTimings(p.open, p.close) }));
                            }}
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: '600',
                              padding: '0.22rem 0.55rem',
                              borderRadius: '6px',
                              border: (timeOpen === p.open && timeClose === p.close) ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              background: (timeOpen === p.open && timeClose === p.close) ? '#dcfce7' : '#ffffff',
                              color: (timeOpen === p.open && timeClose === p.close) ? '#15803d' : '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} /> {shopForm.timings || formatTimings(timeOpen, timeClose)}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    <div>Total Active Inventory: <strong>{detailedShop?.totalItemsCount || items.length} products</strong></div>
                    <div>Active Staff Enrolled: <strong>{detailedShop?.totalStaffCount || staffList.length} cashiers</strong></div>
                  </div>

                  <div className="flex-between" style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <a 
                      href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20Request" 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                    >
                      <Mail size={15} /> Contact Admin (pay.laxmikant@gmail.com)
                    </a>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setShowShopDetailsModal(false)}>
                        Close
                      </button>
                      {isOwner && (
                        <button type="submit" className="btn" disabled={shopSaving}>
                          {shopSaving ? 'Saving...' : 'Save Shop Changes'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: LINKED USER & OWNER PROFILE */}
            {settingsTab === 'owner' && (
              <div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.35rem' }}>
                      {(currentUser?.name || detailedShop?.ownerName || 'O')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{currentUser?.name || detailedShop?.ownerName}</h4>
                      <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '700' }}>
                        {isOwner ? '👑 Verified Shop Owner' : '🛡️ Enrolled Cashier'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.88rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>LINKED GOOGLE EMAIL</div>
                      <div style={{ fontWeight: '700', color: '#0f172a', wordBreak: 'break-all' }}>
                        {currentUser?.email || detailedShop?.ownerEmail || 'Linked via Google'}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '600' }}>🔒 Synced with Google Account</span>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>USER SHORT ID</div>
                      <div style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1rem' }}>
                        {currentUser?.shortId || detailedShop?.ownerShortId}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Unique ID for Staff & Khata</span>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>CONTACT PHONE</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {currentUser?.phone || detailedShop?.shopPhone || 'Not set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>CITY & REGION</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {currentUser?.city || detailedShop?.city || 'Delhi'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>ACCOUNT STATUS</div>
                      <div style={{ fontWeight: '700', color: '#16a34a' }}>
                        🟢 Active & Verified
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: '600', marginBottom: '3px' }}>AUTHENTICATION TYPE</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        Google OAuth + Passkey
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <a 
                    href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20Request" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                  >
                    <Mail size={15} /> Contact Admin (pay.laxmikant@gmail.com)
                  </a>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowShopDetailsModal(false)}>
                      Close
                    </button>
                    <button type="button" className="btn" onClick={() => setSettingsTab('security')}>
                      <Lock size={15} /> Manage PIN & Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PIN, PASSWORD & PASSKEY SECURITY */}
            {settingsTab === 'security' && (
              <div>
                {/* 2-Column Wide Grid for PIN & Password on Web Desktop */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  
                  {/* 1. Change 4-Digit Security PIN */}
                  <form onSubmit={handleChangePin} style={{ background: '#fdfbf7', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <Shield size={18} /> 4-Digit Security PIN
                      </div>
                      <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#7c2d12', lineHeight: '1.4' }}>
                        Used for quick register screen locking and cashier authorization.
                      </p>

                      {pinNotice && (
                        <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                  <form onSubmit={handleChangePassword} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Key size={18} /> Account Password
                        </div>
                        {currentUser?.hasPasswordSet === 1 ? (
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                            🟢 Password Active
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                            ⚠️ Not Set Yet
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {currentUser?.hasPasswordSet === 1 
                          ? 'Enter your current password to set a new password for your account.' 
                          : 'Set a password to log in directly with your Email ID or Short ID without Google.'}
                      </p>

                      {passwordNotice && (
                        <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle size={15} /> {passwordNotice}
                        </div>
                      )}
                      {passwordError && (
                        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={15} /> {passwordError}
                        </div>
                      )}

                      {/* Current Password Field (Only shown if user has an existing password set) */}
                      {currentUser?.hasPasswordSet === 1 && (
                        <div style={{ marginBottom: '0.65rem' }}>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current Password *</label>
                          <div style={{ position: 'relative', marginTop: '3px' }}>
                            <input 
                              type={showCurrentPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Enter current password" 
                              value={passwordForm.currentPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                              required 
                              style={{ margin: 0, paddingRight: '2.4rem', background: '#fff' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {currentUser?.hasPasswordSet === 1 ? 'New Password *' : 'Password *'}
                          </label>
                          <div style={{ position: 'relative', marginTop: '3px' }}>
                            <input 
                              type={showNewPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Enter password" 
                              value={passwordForm.newPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                              required 
                              minLength={4}
                              style={{ margin: 0, paddingRight: '2.4rem', background: '#fff' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm Password *</label>
                          <div style={{ position: 'relative', marginTop: '3px' }}>
                            <input 
                              type={showConfirmPassword ? 'text' : 'password'} 
                              className="input" 
                              placeholder="Re-type password" 
                              value={passwordForm.confirmPassword} 
                              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                              required 
                              minLength={4}
                              style={{ margin: 0, paddingRight: '2.4rem', background: '#fff' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
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

                {/* 3. Passkey Biometric Security */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Fingerprint size={18} /> Passkey Biometric Login
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#166534' }}>
                        Enable Face ID, Touch ID, or Device Screen Lock on this browser for instant 1-tap passwordless login.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegisterPasskey}
                      disabled={passkeyRegistering}
                      className="btn btn-outline"
                      style={{ padding: '0.65rem 1.25rem', fontSize: '0.86rem', borderColor: '#16a34a', color: '#15803d', background: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9px' }}
                    >
                      <Fingerprint size={16} />
                      {passkeyRegistering ? 'Registering Device Passkey...' : 'Set Up Passkey on this Device'}
                    </button>
                  </div>

                  {passkeyNotice && (
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20-%20PIN%20Reset%20%2F%20Security%20Help" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none' }}
                  >
                    <Mail size={15} /> Contact Admin (pay.laxmikant@gmail.com)
                  </a>

                  <button type="button" className="btn btn-outline" onClick={() => setShowShopDetailsModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* App-Like Bottom Footer Navigation Bar */}
      <div className="mobile-footer-nav">
        <button type="button" className={`footer-nav-item ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
          <ShoppingCart size={18} />
          <span>POS</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Clock size={18} />
            {pendingOrdersCount > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', borderRadius: '10px', padding: '1px 4px', fontWeight: '700' }}>
                {pendingOrdersCount}
              </span>
            )}
          </div>
          <span>Orders</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'khata' ? 'active' : ''}`} onClick={() => setActiveTab('khata')}>
          <Users size={18} />
          <span>Khata</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          <BarChart2 size={18} />
          <span>Analytics</span>
        </button>

        {isOwner && (
          <>
            <button type="button" className={`footer-nav-item ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
              <Plus size={18} />
              <span>Items</span>
            </button>

            <button type="button" className={`footer-nav-item ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
              <UserPlus size={18} />
              <span>Staff</span>
            </button>
          </>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="panel modal-dialog" style={{ width: '380px', maxWidth: '100%', background: '#fff', borderRadius: '18px', padding: '1.75rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.15rem auto' }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
              Log Out?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.45' }}>
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

      {/* FULL-SCREEN REGISTER / POS SCREEN LOCK OVERLAY */}
      {isScreenLocked && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 99999, 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1.5rem',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ width: '380px', maxWidth: '100%', textAlign: 'center', color: '#fff' }}>
            {/* Header Icon & Shop Name */}
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.3)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Lock size={32} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.3rem 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              {currentShop?.shopName || 'Register Locked'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              {unlockMode === 'PIN' ? 'Enter 4-digit PIN to resume billing' : 'Enter account password to resume billing'}
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
                      color: '#94a3b8',
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
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
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
                  color: '#f8fafc',
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
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  textDecoration: 'underline'
                }}
              >
                Switch Account / Log Out
              </button>

              <a
                href="mailto:pay.laxmikant@gmail.com?subject=GI%20Shop%20Support%20-%20PIN%20Reset%20%2F%20Register%20Lock%20Help"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  color: '#93c5fd',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  marginTop: '0.25rem'
                }}
              >
                <Mail size={13} /> Contact Admin (pay.laxmikant@gmail.com)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
