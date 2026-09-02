import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMe, getItems, saveItem, deleteItem, editItem, toggleShopStatus, 
  getShopOrders, acceptShopOrder, declineShopOrder, completeShopOrder,
  getSales, updateSaleNote, inviteStaff, getStaff, deleteStaff,
  getMyDetailedShop, updateMyDetailedShop, getCities, changePin, changePassword,
  parseTimings, formatTimings
} from '../lib/api';
import { registerPasskey } from '../lib/passkey';
import { MASTER_GROCERY_CATALOG, GROCERY_CATEGORIES } from '../lib/masterGroceryCatalog';
import { 
  Store, ShoppingCart, Users, Plus, Edit2, Trash2, LogOut, Clock, 
  BarChart2, ShieldCheck, UserPlus, CheckCircle, XCircle, FileText, 
  Search, X, Calendar, AlertCircle, ArrowRight, Sparkles, Check, Info, Lock, MapPin, Phone, AlertTriangle, Fingerprint, Settings, Key, User, Mail, Shield
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
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setTimeout(() => setPinNotice(''), 4000);
    } catch (err) {
      setPinError(err.message || 'Failed to update PIN');
    } finally {
      setPinSaving(false);
    }
  };

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
      const res = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordNotice(res.message || 'Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordNotice(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
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
          <div className="panel modal-dialog" style={{ width: '540px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.35rem', borderRadius: '18px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            {/* Modal Header */}
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.2rem' }}>Shop & Owner Settings</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Shop ID: <strong style={{ color: 'var(--primary)' }}>{detailedShop?.shortId || currentShop?.shortId}</strong> • Owner: <strong>{detailedShop?.ownerName || currentUser?.name}</strong>
                  </div>
                </div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowShopDetailsModal(false)} />
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setSettingsTab('store')}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: settingsTab === 'store' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'store' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'store' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Store size={15} /> Store Details
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('owner')}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: settingsTab === 'owner' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'owner' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'owner' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <User size={15} /> Linked User
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('security')}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: settingsTab === 'security' ? '#ffffff' : 'transparent',
                  color: settingsTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: settingsTab === 'security' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Lock size={15} /> PIN & Security
              </button>
            </div>

            {/* TAB 1: STORE DETAILS */}
            {settingsTab === 'store' && (
              <div>
                {/* Quick Metrics & Role Badge */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>YOUR ACCESS ROLE</div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isOwner ? 'var(--primary)' : '#7c3aed', marginTop: '2px' }}>
                      {isOwner ? '👑 Shop Owner' : '🛡️ Cashier (Staff)'}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>STORE STATUS</div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isOpen ? 'var(--success)' : 'var(--danger)', marginTop: '2px' }}>
                      {isOpen ? '🟢 Open for Orders' : '🔴 Closed'}
                    </div>
                  </div>
                </div>

                {!isOwner && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e40af' }}>
                    <Lock size={16} />
                    <div>
                      <strong>View-Only Mode:</strong> You are logged in as a <strong>Cashier</strong>. Only the shop owner has permission to change store details, address, or timings.
                    </div>
                  </div>
                )}

                {shopSaveNotice && (
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <CheckCircle size={16} /> {shopSaveNotice}
                  </div>
                )}

                <form onSubmit={handleSaveShopDetails}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Shop Name</label>
                    <input 
                      className="input" 
                      value={shopForm.shopName} 
                      onChange={e => setShopForm({ ...shopForm, shopName: e.target.value })} 
                      disabled={!isOwner}
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Phone</label>
                      <input 
                        className="input" 
                        value={shopForm.shopPhone} 
                        onChange={e => setShopForm({ ...shopForm, shopPhone: e.target.value })} 
                        disabled={!isOwner}
                        required 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>City</label>
                      <select 
                        className="select" 
                        value={shopForm.city} 
                        onChange={e => setShopForm({ ...shopForm, city: e.target.value })} 
                        disabled={!isOwner}
                        required 
                        style={{ marginBottom: 0 }}
                      >
                        {cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Shop Address</label>
                    <input 
                      className="input" 
                      value={shopForm.shopAddress} 
                      onChange={e => setShopForm({ ...shopForm, shopAddress: e.target.value })} 
                      disabled={!isOwner}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>Operating Timings</label>
                    
                    {/* 2 Time Pickers (Opens At & Closes At) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
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
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
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
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.45rem',
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

                    <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} /> {shopForm.timings || formatTimings(timeOpen, timeClose)}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>Total Active Inventory: <strong>{detailedShop?.totalItemsCount || items.length} products</strong></div>
                    <div>Active Staff Enrolled: <strong>{detailedShop?.totalStaffCount || staffList.length} cashiers</strong></div>
                  </div>

                  <div className="flex-between">
                    <button type="button" className="btn btn-outline" onClick={() => setShowShopDetailsModal(false)}>
                      Close
                    </button>
                    {isOwner && (
                      <button type="submit" className="btn" disabled={shopSaving}>
                        {shopSaving ? 'Saving...' : 'Save Shop Changes'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: LINKED USER & OWNER PROFILE */}
            {settingsTab === 'owner' && (
              <div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem' }}>
                      {(currentUser?.name || detailedShop?.ownerName || 'O')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{currentUser?.name || detailedShop?.ownerName}</h4>
                      <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700' }}>
                        {isOwner ? '👑 Verified Shop Owner' : '🛡️ Enrolled Cashier'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.86rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>LINKED GOOGLE EMAIL</div>
                      <div style={{ fontWeight: '700', color: '#0f172a', wordBreak: 'break-all' }}>
                        {currentUser?.email || detailedShop?.ownerEmail || 'Linked via Google'}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>🔒 Synced with Google Account</span>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>USER SHORT ID</div>
                      <div style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {currentUser?.shortId || detailedShop?.ownerShortId}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unique ID for Staff & Khata</span>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>CONTACT PHONE</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {currentUser?.phone || detailedShop?.shopPhone || 'Not set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>CITY & REGION</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {currentUser?.city || detailedShop?.city || 'Delhi'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>ACCOUNT STATUS</div>
                      <div style={{ fontWeight: '700', color: '#16a34a' }}>
                        🟢 Active & Verified
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px' }}>AUTHENTICATION TYPE</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        Google OAuth + Passkey
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-between">
                  <button type="button" className="btn btn-outline" onClick={() => setShowShopDetailsModal(false)}>
                    Close
                  </button>
                  <button type="button" className="btn" onClick={() => setSettingsTab('security')}>
                    <Lock size={15} /> Manage PIN & Password
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PIN, PASSWORD & PASKEY SECURITY */}
            {settingsTab === 'security' && (
              <div>
                {/* 1. Change 4-Digit Security PIN */}
                <form onSubmit={handleChangePin} style={{ background: '#fdfbf7', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Shield size={16} /> 4-Digit Security PIN
                  </div>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: '#7c2d12' }}>
                    Used for cashier mode verification and quick store security locks.
                  </p>

                  {pinNotice && (
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={15} /> {pinNotice}
                    </div>
                  )}
                  {pinError && (
                    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={15} /> {pinError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#7c2d12', fontWeight: '700' }}>Current PIN</label>
                      <input 
                        type="password" 
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
                      <label style={{ fontSize: '0.75rem', color: '#7c2d12', fontWeight: '700' }}>New PIN</label>
                      <input 
                        type="password" 
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
                      <label style={{ fontSize: '0.75rem', color: '#7c2d12', fontWeight: '700' }}>Confirm PIN</label>
                      <input 
                        type="password" 
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

                  <button 
                    type="submit" 
                    className="btn btn-outline" 
                    disabled={pinSaving} 
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', borderColor: '#ea580c', color: '#c2410c', fontWeight: '700', background: '#fff' }}
                  >
                    {pinSaving ? 'Updating PIN...' : 'Update 4-Digit Security PIN'}
                  </button>
                </form>

                {/* 2. Set / Change Password */}
                <form onSubmit={handleChangePassword} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Key size={16} /> Account Password
                  </div>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Set a password if you would like to log in with your Email ID or Short ID directly.
                  </p>

                  {passwordNotice && (
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={15} /> {passwordNotice}
                    </div>
                  )}
                  {passwordError && (
                    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={15} /> {passwordError}
                    </div>
                  )}

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current Password (leave blank if first time)</label>
                    <input 
                      type="password" 
                      className="input" 
                      placeholder="Current password (if set)" 
                      value={passwordForm.currentPassword} 
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                      style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>New Password</label>
                      <input 
                        type="password" 
                        className="input" 
                        placeholder="New password" 
                        value={passwordForm.newPassword} 
                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                        required 
                        style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm Password</label>
                      <input 
                        type="password" 
                        className="input" 
                        placeholder="Confirm password" 
                        value={passwordForm.confirmPassword} 
                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                        required 
                        style={{ margin: 0, marginTop: '3px', background: '#fff' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-outline" 
                    disabled={passwordSaving} 
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', fontWeight: '700', background: '#fff' }}
                  >
                    {passwordSaving ? 'Updating Password...' : 'Save / Change Password'}
                  </button>
                </form>

                {/* 3. Passkey Biometric Security */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Fingerprint size={16} /> Passkey Biometric Login
                  </div>
                  <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.78rem', color: '#166534' }}>
                    Enable Face ID, Touch ID, or Device Screen Lock on this browser for instant 1-tap passwordless login.
                  </p>
                  {passkeyNotice && (
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={14} /> {passkeyNotice}
                    </div>
                  )}
                  {passkeyError && (
                    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} /> {passkeyError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRegisterPasskey}
                    disabled={passkeyRegistering}
                    className="btn btn-outline"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', borderColor: '#16a34a', color: '#15803d', background: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Fingerprint size={16} />
                    {passkeyRegistering ? 'Registering Device Passkey...' : 'Set Up Passkey on this Device'}
                  </button>
                </div>

                <div className="flex-between">
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
    </div>
  );
}
