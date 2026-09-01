import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMe, getCities, getShops, getShopDetails, compareItems, placeOrder, 
  getCustomerOrders, getCustomerHistory, getCustomerInvites, respondToInvite,
  updateUserProfile, changePin, getCustomerKhata, getCustomerShopKhata,
  cancelCustomerOrder, updateOrderCollection
} from '../lib/api';
import { 
  Store, ShoppingCart, Receipt, Clock, MapPin, Search, Plus, Minus, 
  X, CheckCircle, AlertCircle, LogOut, Phone, ShieldCheck, UserCheck, 
  Tag, ArrowRight, AlertTriangle, Printer, FileText, Download, Key, Lock, User,
  MessageCircle, BookOpen
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Customer() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'compare' | 'khata' | 'orders'
  
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [shops, setShops] = useState([]);
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

  // Customer Profile Modal & Settings State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    city: 'Delhi',
    address: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');

  // Security PIN State
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

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
    try {
      const data = await getShops(city);
      setShops(data);
    } catch (e) {
      console.error(e);
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
    try {
      const data = await getCustomerOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPurchases = async () => {
    try {
      const data = await getCustomerHistory();
      setPurchases(data.sales || []);
    } catch (e) {
      console.error(e);
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
      alert(e.message || 'Failed to open shop catalog');
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
      alert(e.message || 'Failed to cancel order.');
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
      alert(e.message || 'Failed to update collection status.');
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
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'purchases') loadPurchases();
    if (activeTab === 'khata') loadKhataData();
    if (activeTab === 'explore') loadShops(selectedCity);
    if (activeTab === 'compare') loadCompareData(selectedCity, compareQuery);
  }, [activeTab]);

  const handleLogout = () => {
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
    setProfileSaving(true);
    setProfileNotice('');
    setProfileError('');
    try {
      const res = await updateUserProfile(profileForm);
      if (res.user) {
        setCurrentUser(res.user);
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

  const handleOpenShop = async (shop) => {
    try {
      const details = await getShopDetails(shop.id || shop.shopId);
      setActiveShop(details);
      setActiveTab('explore'); // Ensures shop showcase opens immediately!
      setOrderErrorMsg('');
      setOrderSuccessMsg('');
    } catch (e) {
      alert(e.message || 'Failed to load shop');
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
      alert(e.message || 'Failed to respond to invite');
    }
  };

  const totalCartItemCount = Object.values(orderList).reduce((sum, e) => sum + e.qty, 0);
  const totalOrderAmount = Object.values(orderList).reduce((sum, e) => sum + e.amount, 0);

  const filteredShops = shops.filter(s => 
    s.shopName.toLowerCase().includes(shopSearch.toLowerCase()) ||
    s.shortId.toLowerCase().includes(shopSearch.toLowerCase()) ||
    s.shopAddress.toLowerCase().includes(shopSearch.toLowerCase())
  );

  const filteredShopItems = activeShop ? (activeShop.items || []).filter(i => 
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  ) : [];

  // Group compare results by product name
  const groupedCompare = {};
  compareResults.forEach(item => {
    const key = item.name.toLowerCase().trim();
    if (!groupedCompare[key]) groupedCompare[key] = { displayName: item.name, unit: item.unit, offers: [] };
    groupedCompare[key].offers.push(item);
  });

  // Spending Analytics
  const totalSpentAll = purchases.reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Top Header */}
      <div className="nav-bar" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logoImg} alt="GI SHOP" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d', letterSpacing: '-0.02em' }}>GI SHOP</span>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 0.25rem' }}></div>

          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '3px 8px', borderRadius: '8px', background: '#f8fafc', border: '1px solid var(--border)' }}
            onClick={handleOpenProfileModal}
            title="Click to view/edit profile & PIN"
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {currentUser?.name || 'Customer'}
                <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: 'var(--primary)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: '600' }}>✏️ Profile</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Short ID: <strong style={{ color: 'var(--primary)' }}>{currentUser?.shortId}</strong> • {currentUser?.phone}
              </div>
            </div>
          </div>
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
          <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="container" style={{ flex: 1, marginTop: '1rem', marginBottom: '4rem' }}>
        
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

        {/* City Selector Bar */}
        <div className="panel" style={{ marginBottom: '1.25rem', padding: '0.85rem' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>City:</span>
              <select 
                className="select" 
                style={{ width: '160px', margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                value={selectedCity}
                onChange={e => { setSelectedCity(e.target.value); setActiveShop(null); }}
              >
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Exploring shops in <strong>{selectedCity}</strong>
            </div>
          </div>
        </div>

        {/* TAB 1: EXPLORE SHOPS */}
        {activeTab === 'explore' && !activeShop && (
          <div>
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <input
                type="text"
                className="input"
                style={{ margin: 0, paddingLeft: '2.5rem', background: '#fff' }}
                placeholder={`Search shops in ${selectedCity} by name or Short ID...`}
                value={shopSearch}
                onChange={e => setShopSearch(e.target.value)}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div className="grid grid-2">
              {filteredShops.map(shop => (
                <div 
                  key={shop.id} 
                  className="panel" 
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1px solid var(--border)' }}
                  onClick={() => handleOpenShop(shop)}
                >
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{shop.shopName}</div>
                    <span className="badge" style={{
                      background: shop.isOpen ? '#dcfce7' : '#fee2e2',
                      color: shop.isOpen ? '#15803d' : '#b91c1c',
                      borderColor: shop.isOpen ? '#bbf7d0' : '#fecaca'
                    }}>
                      {shop.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Shop ID: <strong style={{ color: 'var(--primary)' }}>{shop.shortId}</strong> • {shop.city}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {shop.shopAddress}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Clock size={14} /> {shop.timings}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Phone size={14} /> {shop.shopPhone}
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>View Catalog & Order →</span>
                  </div>
                </div>
              ))}
              {filteredShops.length === 0 && (
                <div className="panel" style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem 1rem' }}>
                  <p className="subtitle">No open shops found in {selectedCity}. Try selecting another city above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRICE COMPARISON & SEARCH ITEMS */}
        {activeTab === 'compare' && (
          <div>
            <div className="panel" style={{ marginBottom: '1.25rem' }}>
              <h3 className="title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={18} color="var(--primary)" /> Compare Grocery Prices in {selectedCity}
              </h3>
              <p className="subtitle" style={{ marginBottom: '1rem' }}>Search any item to compare rates across local shops and find the best price!</p>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  style={{ margin: 0, paddingLeft: '2.5rem', background: '#fff', fontSize: '1rem', padding: '0.75rem 2.5rem' }}
                  placeholder="Search item to compare (e.g. Milk, Rice, Kurkure, Atta, Oil, Sugar)..."
                  value={compareQuery}
                  onChange={e => { setCompareQuery(e.target.value); loadCompareData(selectedCity, e.target.value); }}
                />
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Compared Items Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.keys(groupedCompare).map(key => {
                const group = groupedCompare[key];
                const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price);
                const lowestPrice = sortedOffers[0]?.price;

                return (
                  <div key={key} className="panel" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex-between" style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{group.displayName}</h4>
                        <span className="badge" style={{ marginTop: '4px' }}>Sold per {group.unit}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Best Available Rate</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)' }}>₹{lowestPrice.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Shop Offers for this item */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sortedOffers.map(offer => {
                        const isBestPrice = offer.price === lowestPrice && sortedOffers.length > 1;
                        const inCartQty = orderList[offer.id]?.qty || 0;

                        return (
                          <div 
                            key={offer.id} 
                            style={{ 
                              background: '#f8fafc', 
                              border: `1px solid ${isBestPrice ? '#bbf7d0' : 'var(--border)'}`, 
                              borderRadius: '8px', 
                              padding: '0.75rem 1rem', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '0.95rem' }}>{offer.shopName}</strong>
                                <span className="badge" style={{ fontSize: '0.7rem' }}>{offer.shopShortId}</span>
                                {isBestPrice && (
                                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', fontSize: '0.7rem' }}>
                                    🏆 Lowest Price
                                  </span>
                                )}
                                <span className="badge" style={{
                                  background: offer.isOpen ? '#dcfce7' : '#fee2e2',
                                  color: offer.isOpen ? '#15803d' : '#b91c1c',
                                  fontSize: '0.7rem'
                                }}>
                                  {offer.isOpen ? 'OPEN' : 'CLOSED'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {offer.shopAddress} • {offer.timings}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ fontSize: '1.15rem', color: isBestPrice ? 'var(--success)' : 'var(--text)' }}>
                                  ₹{offer.price.toFixed(2)}
                                </strong>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/{offer.unit}</div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button 
                                  type="button" 
                                  className="btn btn-outline" 
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                  onClick={() => handleOpenShop({ id: offer.shopId, shopName: offer.shopName })}
                                >
                                  Check More Items
                                </button>

                                {inCartQty > 0 ? (
                                  <button 
                                    type="button" 
                                    className="btn" 
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    onClick={() => setShowCartModal(true)}
                                  >
                                    <ShoppingCart size={13} /> In Cart ({inCartQty})
                                  </button>
                                ) : (
                                  <button 
                                    type="button" 
                                    className="btn" 
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    disabled={!offer.isOpen}
                                    onClick={() => handleAddItemToCart({ id: offer.id, name: offer.name, price: offer.price, unit: offer.unit }, { id: offer.shopId, shopName: offer.shopName })}
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {Object.keys(groupedCompare).length === 0 && (
                <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <p className="subtitle">No products found matching your search in {selectedCity}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SHOP SHOWCASE & "MAKE A LIST" ORDER CREATOR */}
        {activeTab === 'explore' && activeShop && (
          <div>
            {/* Shop Header Banner */}
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveShop(null)}>
                  ← Back to All Shops
                </button>
                <span className="badge" style={{
                  background: activeShop.isOpen ? '#dcfce7' : '#fee2e2',
                  color: activeShop.isOpen ? '#15803d' : '#b91c1c'
                }}>
                  {activeShop.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                </span>
              </div>

              <h2 className="title" style={{ margin: '0 0 0.25rem 0' }}>{activeShop.shopName}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Shop ID: <strong style={{ color: 'var(--primary)' }}>{activeShop.shortId}</strong> • {activeShop.city}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <div><MapPin size={14} style={{ verticalAlign: 'middle' }} /> {activeShop.shopAddress}</div>
                <div><Clock size={14} style={{ verticalAlign: 'middle' }} /> {activeShop.timings}</div>
                {activeShop.shopPhone && <div><Phone size={14} style={{ verticalAlign: 'middle' }} /> {activeShop.shopPhone}</div>}
              </div>

              {/* Instant Contact Action Buttons */}
              {activeShop.shopPhone && (
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <a 
                    href={`tel:${activeShop.shopPhone}`}
                    className="btn" 
                    style={{ 
                      background: '#2563eb', 
                      color: '#fff', 
                      padding: '0.45rem 1rem', 
                      fontSize: '0.85rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.45rem', 
                      textDecoration: 'none', 
                      borderRadius: '6px',
                      fontWeight: '600'
                    }}
                  >
                    <Phone size={15} /> Call Now
                  </a>

                  <a 
                    href={`https://wa.me/91${activeShop.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${activeShop.shopName}, I found your shop on GI Shop and would like to ask about grocery items.`)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn" 
                    style={{ 
                      background: '#16a34a', 
                      color: '#fff', 
                      padding: '0.45rem 1rem', 
                      fontSize: '0.85rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.45rem', 
                      textDecoration: 'none', 
                      borderRadius: '6px',
                      fontWeight: '600'
                    }}
                  >
                    <MessageCircle size={15} /> WhatsApp Us
                  </a>
                </div>
              )}
            </div>

            {orderErrorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> {orderErrorMsg}
              </div>
            )}

            {orderSuccessMsg && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> {orderSuccessMsg}
              </div>
            )}

            {/* Catalog & List Split View */}
            <div className="grid shop-showcase-grid">
              
              {/* Product Catalog */}
              <div className="panel">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ margin: 0 }}
                    placeholder="Search items in this shop..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredShopItems.map(item => {
                    const currentEntry = orderList[item.id];
                    const currentQty = currentEntry?.qty || 0;
                    const isAdded = currentQty > 0;

                    return (
                      <div 
                        key={item.id} 
                        className="list-item" 
                        style={{ 
                          background: isAdded ? '#f0fdf4' : '#f8fafc', 
                          border: isAdded ? '1px solid #86efac' : '1px solid var(--border)',
                          borderRadius: '10px', 
                          padding: '0.85rem 1rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => openItemModal(item, activeShop)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>₹{item.price.toFixed(2)}</strong>
                            <span>/ {item.unit}</span>
                          </div>

                          {isAdded && (
                            <div style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                              <CheckCircle size={12} /> In List: {currentQty} {item.unit} (₹{currentEntry.amount.toFixed(2)})
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                          {isAdded ? (
                            <button 
                              type="button" 
                              className="btn" 
                              style={{ background: '#16a34a', color: '#fff', padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px', fontWeight: '700' }}
                              onClick={() => openItemModal(item, activeShop)}
                            >
                              ✏️ {currentQty} {item.unit}
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: '600', borderRadius: '6px' }}
                              disabled={!activeShop.isOpen}
                              onClick={() => openItemModal(item, activeShop)}
                            >
                              + Select Qty
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredShopItems.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No items found in this shop.</p>}
                </div>
              </div>

              {/* Shopping List / Send Order Box */}
              <div className="panel" style={{ position: 'sticky', top: '1rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h3 className="title" style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShoppingCart size={18} /> Cart / Order List
                  </h3>
                  {activeCartShop && (
                    <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)' }}>
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
                        <div key={entry.item.id} className="flex-between" style={{ fontSize: '0.85rem', paddingBottom: '0.35rem', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div>{entry.item.name}</div>
                            <small style={{ color: 'var(--text-muted)' }}>{entry.qty} x ₹{entry.rate}</small>
                          </div>
                          <strong>₹{entry.amount.toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                  <div className="flex-between" style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    <span>Estimated Total:</span>
                    <span style={{ color: 'var(--success)' }}>₹{totalOrderAmount.toFixed(2)}</span>
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
                <div className="panel" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BookOpen size={22} color="#38bdf8" />
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', fontWeight: '800' }}>My Khata Ledger</h2>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Live synchronized credit ledger across all your local shops
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.07)', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>Total Amount Due to Pay</div>
                      <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.8rem', color: khataOverview.overallDue > 0 ? '#f87171' : '#4ade80', fontWeight: '900' }}>
                        ₹{khataOverview.overallDue.toFixed(2)}
                      </h2>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                        {khataOverview.stores.length} Enrolled Stores
                      </span>
                      <span className="badge" style={{ background: khataOverview.stores.filter(s => s.totalDue > 0).length > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)', color: '#fff' }}>
                        {khataOverview.stores.filter(s => s.totalDue > 0).length} Stores with Due
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={14} color="#38bdf8" /> Official Store Records (Read-Only)
                    </div>
                  </div>
                </div>

                {/* Stores List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {khataOverview.stores.map((st) => (
                    <div 
                      key={`khata-store-${st.shopId}`}
                      className="panel"
                      style={{ 
                        padding: '1.25rem', 
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        borderLeft: st.totalDue > 0 ? '4px solid var(--danger)' : '4px solid var(--success)'
                      }}
                      onClick={() => loadStoreKhataDetails(st)}
                    >
                      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                        
                        {/* Store Info (Left) */}
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>{st.shopName}</h3>
                            <span className="badge" style={{ fontSize: '0.7rem', background: '#eff6ff', color: 'var(--primary)', fontWeight: '700' }}>
                              ID: {st.shortId || `shp${st.shopId}`}
                            </span>
                            <span className="badge" style={{ fontSize: '0.7rem', background: st.isOpen ? '#dcfce7' : '#fee2e2', color: st.isOpen ? '#15803d' : '#b91c1c' }}>
                              {st.isOpen ? '🟢 Open' : '🔴 Closed'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            📍 {st.shopAddress ? `${st.shopAddress}, ${st.city}` : st.city} {st.timings ? `• 🕒 ${st.timings}` : ''}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                            {st.shopPhone && (
                              <a 
                                href={`tel:${st.shopPhone}`}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={13} /> Call Now
                              </a>
                            )}
                            {st.shopPhone && (
                              <a 
                                href={`https://wa.me/91${st.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${st.shopName}, I would like to check my khata and place an order.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle size={13} /> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Amount Due (Right) */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: st.totalDue > 0 ? 'var(--danger)' : 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {st.totalDue > 0 ? 'Amount Due to Pay' : 'Account Status'}
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: st.totalDue > 0 ? 'var(--danger)' : 'var(--success)', margin: '0.2rem 0' }}>
                            {st.totalDue > 0 ? `₹${st.totalDue.toFixed(2)}` : '₹0.00'}
                          </div>
                          {st.totalDue === 0 && (
                            <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: '700' }}>
                              ✓ No Due Clear
                            </span>
                          )}
                          {st.totalDue > 0 && (
                            <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: '700' }}>
                              Pending Due
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Store Card Footer with Action Buttons */}
                      <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Khata Credit: <strong>₹{(st.totalBook || 0).toFixed(2)}</strong> • Paid: <strong>₹{(st.totalPaid || 0).toFixed(2)}</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            className="btn" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#0284c7' }}
                            onClick={(e) => { e.stopPropagation(); handleStartNewOrderFromStore(st); }}
                          >
                            <Plus size={14} /> New Order +
                          </button>
                          
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={(e) => { e.stopPropagation(); loadStoreKhataDetails(st); }}
                          >
                            <BookOpen size={14} /> View History →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {khataOverview.stores.length === 0 && !khataLoading && (
                    <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                      <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>No Khata Records Found</h3>
                      <p className="subtitle" style={{ maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
                        When local shopkeepers bill your purchases with "Add to Book" or when you place orders, your store credit ledger will appear here.
                      </p>
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
                        <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)', fontWeight: '700' }}>
                          ID: {selectedKhataStore.shortId || `shp${selectedKhataStore.shopId || selectedKhataStore.id}`}
                        </span>
                        <span className="badge" style={{ background: selectedKhataStore.isOpen ? '#dcfce7' : '#fee2e2', color: selectedKhataStore.isOpen ? '#15803d' : '#b91c1c' }}>
                          {selectedKhataStore.isOpen ? '🟢 Open' : '🔴 Closed'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        📍 {selectedKhataStore.shopAddress ? `${selectedKhataStore.shopAddress}, ${selectedKhataStore.city}` : selectedKhataStore.city}
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
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', textDecoration: 'none', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <MessageCircle size={15} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Due metric */}
                    <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Amount Due to Pay</div>
                      <h2 style={{ margin: '0.25rem 0', fontSize: '1.75rem', color: (storeKhataDetails?.totalDue ?? selectedKhataStore.totalDue ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '900' }}>
                        ₹{(storeKhataDetails?.totalDue ?? selectedKhataStore.totalDue ?? 0).toFixed(2)}
                      </h2>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Credit Taken: ₹{(storeKhataDetails?.totalBook ?? selectedKhataStore.totalBook ?? 0).toFixed(2)} • Paid: ₹{(storeKhataDetails?.totalPaid ?? selectedKhataStore.totalPaid ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '1rem', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                            const items = JSON.parse(entry.itemsJSON || '[]');
                            const isKhataMethod = entry.paymentMethod === 'Add to Book';
                            return (
                              <div key={`timeline-purch-${entry.id}-${idx}`} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <strong style={{ fontSize: '0.95rem' }}>In-Store Purchase #{entry.id}</strong>
                                      <span className="badge" style={{ fontSize: '0.75rem', background: isKhataMethod ? '#fee2e2' : '#dcfce7', color: isKhataMethod ? '#b91c1c' : '#15803d', fontWeight: '700' }}>
                                        {isKhataMethod ? '📖 Added to Khata (Due)' : `💵 Paid (${entry.paymentMethod})`}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()} {entry.billedBy ? `• Billed by: ${entry.billedBy}` : ''}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: isKhataMethod ? 'var(--danger)' : 'var(--success)' }}>
                                      {isKhataMethod ? `+₹${entry.total.toFixed(2)} Due` : `₹${entry.total.toFixed(2)}`}
                                    </h3>
                                  </div>
                                </div>

                                <div style={{ background: '#fff', borderRadius: '6px', padding: '0.65rem', margin: '0.5rem 0', border: '1px solid #f1f5f9' }}>
                                  {items.map((c, i) => (
                                    <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                      <span>{c.item?.name || c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>x {c.qty} {c.item?.unit}</span></span>
                                      <span>₹{((c.rate || c.item?.price) * c.qty).toFixed(2)}</span>
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
                              <div key={`timeline-settle-${entry.id}-${idx}`} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <CheckCircle size={16} color="#16a34a" />
                                      <strong style={{ fontSize: '0.95rem', color: '#15803d' }}>Payment Settlement Received</strong>
                                      <span className="badge" style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: '700' }}>
                                        {entry.method}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: '#15803d', fontWeight: '800' }}>-₹{entry.amount.toFixed(2)}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Paid / Cleared</span>
                                  </div>
                                </div>

                                {entry.note && (
                                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.4rem' }}>
                                    📝 Note: "{entry.note}"
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (entry.type === 'ORDER') {
                            const items = JSON.parse(entry.itemsJSON || '[]');
                            return (
                              <div key={`timeline-order-${entry.id}-${idx}`} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.95rem' }}>Online Order #{entry.orderNumber}</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                                      ₹{((entry.estimatedTotal && entry.estimatedTotal > 0) ? entry.estimatedTotal : items.reduce((s, it) => s + (it.amount || (it.rate * it.qty) || 0), 0)).toFixed(2)}
                                    </h3>
                                    <span className="badge" style={{ fontSize: '0.75rem', background: '#eff6ff', color: 'var(--primary)' }}>
                                      {entry.status}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ background: '#fff', borderRadius: '6px', padding: '0.65rem', margin: '0.5rem 0', border: '1px solid #f1f5f9' }}>
                                  {items.map((it, i) => (
                                    <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                      <span>{it.item?.name || it.name} x {it.qty}</span>
                                      <span>₹{(it.amount || ((it.rate || it.price) * it.qty) || 0).toFixed(2)}</span>
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
                          <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
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
        {activeTab === 'orders' && (() => {
          const now = new Date();
          const nowMs = now.getTime();
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;
          const recentOrders = orders.filter(o => (nowMs - new Date(o.createdAt || o.date).getTime()) < twentyFourHoursMs);
          const pastOrders = orders.filter(o => (nowMs - new Date(o.createdAt || o.date).getTime()) >= twentyFourHoursMs);
          const grandTotal = totalSpentAll + orders.reduce((sum, o) => sum + (o.estimatedTotal || 0), 0);

          // Date Filter helper
          const isDateMatchingFilter = (dateStr) => {
            if (!dateStr || ordersDateFilter === 'All') return true;
            const itemDate = new Date(dateStr);
            
            if (ordersDateFilter === 'Today') {
              const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
              return itemDate >= startToday && itemDate <= endToday;
            }

            if (ordersDateFilter === 'Yesterday') {
              const startYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
              const endYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              return itemDate >= startYest && itemDate <= endYest;
            }

            if (ordersDateFilter === 'Month') {
              const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
              return itemDate >= startMonth && itemDate <= endMonth;
            }

            if (ordersDateFilter === 'Custom') {
              if (!ordersCustomStart && !ordersCustomEnd) return true;
              const start = ordersCustomStart ? new Date(ordersCustomStart + 'T00:00:00') : new Date(0);
              const end = ordersCustomEnd ? new Date(ordersCustomEnd + 'T23:59:59.999') : new Date(8640000000000000);
              return itemDate >= start && itemDate <= end;
            }

            return true;
          };

          const filteredPastOrders = pastOrders.filter(o => isDateMatchingFilter(o.createdAt || o.date));
          const filteredPurchases = purchases.filter(p => isDateMatchingFilter(p.date || p.createdAt));
          const totalFilteredAllOrdersCount = filteredPastOrders.length + filteredPurchases.length;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Grand Total Spending Banner */}
              <div className="panel" style={{ background: '#f8fafc', padding: '1rem 1.25rem' }}>
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Purchases &amp; Orders Value</div>
                    <h2 style={{ margin: 0, color: 'var(--success)', fontSize: '1.75rem' }}>₹{grandTotal.toFixed(2)}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order Requests (&lt;24h)</div>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{recentOrders.length}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All Orders &amp; Receipts</div>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{pastOrders.length + purchases.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: MY ORDER REQUESTS (< 24 HOURS) */}
              <div className="panel">
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h3 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={20} color="var(--primary)" /> My Order Requests
                    </h3>
                  </div>
                  <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)', fontWeight: '700', padding: '0.35rem 0.65rem' }}>
                    {recentOrders.length} Active
                  </span>
                </div>

                {recentOrders.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recentOrders.map(order => {
                      const items = JSON.parse(order.itemsJSON || '[]');
                      return (
                        <div 
                          key={order.id} 
                          style={{ 
                            background: '#f8fafc', 
                            border: '1px solid var(--border)', 
                            borderRadius: '8px', 
                            padding: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => setSelectedOrderForDetails(order)}
                        >
                          <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <strong style={{ fontSize: '1rem' }}>Order #{order.orderNumber}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Shop: <strong>{order.shopName}</strong> {order.shopShortId ? `(${order.shopShortId})` : ''} • {new Date(order.createdAt).toLocaleString()}
                              </div>
                            </div>

                            <span className="badge" style={{
                              background: order.status === 'PACKING' ? '#fef3c7' 
                                : ((order.status === 'COMPLETED' || order.status === 'READY') ? '#e0f2fe' 
                                : (order.status === 'COLLECTED' ? '#dcfce7' 
                                : ((order.status === 'NOT_COLLECTED' || order.status === 'CANCELLED_BY_CUSTOMER' || order.status === 'AUTO_CANCELLED_EXPIRED' || order.status === 'DECLINED') ? '#fee2e2' : '#eff6ff'))),
                              color: order.status === 'PACKING' ? '#b45309' 
                                : ((order.status === 'COMPLETED' || order.status === 'READY') ? '#0369a1' 
                                : (order.status === 'COLLECTED' ? '#15803d' 
                                : ((order.status === 'NOT_COLLECTED' || order.status === 'CANCELLED_BY_CUSTOMER' || order.status === 'AUTO_CANCELLED_EXPIRED' || order.status === 'DECLINED') ? '#b91c1c' : '#1d4ed8'))),
                              borderColor: 'transparent',
                              padding: '0.4rem 0.75rem',
                              fontWeight: '700'
                            }}>
                              {order.status === 'PACKING' && `⏳ PACKING (ETA: ~${order.packingMinutes} mins)`}
                              {order.status === 'PENDING' && '🕒 PENDING ACCEPTANCE (45m Window)'}
                              {(order.status === 'COMPLETED' || order.status === 'READY') && '📦 PACKED & READY FOR PICKUP'}
                              {order.status === 'COLLECTED' && '✓ COLLECTED BY YOU (LOCKED)'}
                              {order.status === 'NOT_COLLECTED' && '✗ MARKED NOT COLLECTED (LOCKED)'}
                              {order.status === 'CANCELLED_BY_CUSTOMER' && '🚫 CANCELLED / TAKEN BACK (LOCKED)'}
                              {order.status === 'AUTO_CANCELLED_EXPIRED' && '⛔ AUTO-CANCELLED (45m EXPIRED)'}
                              {order.status === 'DECLINED' && `❌ DECLINED (${order.declineReason || 'Unavailable'})`}
                            </span>
                          </div>

                          {order.status === 'AUTO_CANCELLED_EXPIRED' && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.5rem 0.75rem', margin: '0.4rem 0', fontSize: '0.8rem', color: '#b91c1c', fontWeight: '600' }}>
                              ⚠️ Order automatically cancelled: Shopkeeper did not accept within 45 minutes.
                            </div>
                          )}

                          {order.status === 'PENDING' && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', padding: '0.5rem 0.75rem', margin: '0.4rem 0', fontSize: '0.8rem', color: '#92400e' }}>
                              ⏳ Shopkeeper must accept within 45 minutes of order placement or it will be cancelled automatically.
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
                              <span>Total Payable:</span>
                              <span style={{ color: 'var(--success)' }}>
                                ₹{((order.estimatedTotal && order.estimatedTotal > 0) ? order.estimatedTotal : items.reduce((s, it) => s + (it.amount || (it.rate * it.qty) || 0), 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Customer Confirmation Action when Ready */}
                          {(order.status === 'READY' || order.status === 'COMPLETED') && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.65rem 0.85rem', margin: '0.5rem 0' }}>
                              <div style={{ fontWeight: '700', color: '#166534', fontSize: '0.85rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <CheckCircle size={15} /> Shopkeeper marked this order ready! Did you collect it?
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '700' }}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateCustomerCollection(order.id, 'COLLECTED'); }}
                                >
                                  ✓ Mark Collected
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateCustomerCollection(order.id, 'NOT_COLLECTED'); }}
                                >
                                  ✗ Not Collected
                                </button>
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              {(order.status === 'PENDING' || order.status === 'PACKING') && (
                                <button 
                                  type="button" 
                                  className="btn btn-outline" 
                                  style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  onClick={(e) => { e.stopPropagation(); handleCancelCustomerOrder(order.id); }}
                                >
                                  🚫 Cancel Order / Take Back
                                </button>
                              )}
                              {['COLLECTED', 'NOT_COLLECTED', 'CANCELLED_BY_CUSTOMER'].includes(order.status) && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Lock size={12} /> Status finalized &amp; locked
                                </span>
                              )}
                            </div>

                            <button 
                              type="button" 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              onClick={(e) => { e.stopPropagation(); setSelectedOrderForDetails(order); }}
                            >
                              <FileText size={14} /> View Details &amp; Slip →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                    <p className="subtitle" style={{ margin: 0 }}>No active order requests in the last 24 hours. Older requests have been archived into "All Orders" below.</p>
                  </div>
                )}
              </div>

              {/* SECTION 2: ALL ORDERS & PURCHASE RECEIPTS (Past Orders > 24h + In-Store Bills) */}
              <div className="panel">
                <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={20} color="var(--success)" /> All Orders &amp; Receipts
                    </h3>
                  </div>
                  <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontWeight: '700', padding: '0.35rem 0.65rem' }}>
                    {totalFilteredAllOrdersCount} {ordersDateFilter !== 'All' ? `(${ordersDateFilter})` : 'Total'}
                  </span>
                </div>

                {/* Date Filter Pills: Today, Yesterday, Month, Custom, All */}
                <div className="filter-pills-scroll" style={{ marginBottom: '1rem' }}>
                  {['All', 'Today', 'Yesterday', 'Month', 'Custom'].map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`btn ${ordersDateFilter === f ? '' : 'btn-outline'}`}
                      style={{ 
                        padding: '0.35rem 0.75rem', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px',
                        fontWeight: ordersDateFilter === f ? '700' : '500',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => setOrdersDateFilter(f)}
                    >
                      {f === 'Month' ? 'This Month' : f}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {ordersDateFilter === 'Custom' && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>From:</span>
                      <input 
                        type="date" 
                        className="input" 
                        style={{ width: '150px', margin: 0, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} 
                        value={ordersCustomStart} 
                        onChange={e => setOrdersCustomStart(e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>To:</span>
                      <input 
                        type="date" 
                        className="input" 
                        style={{ width: '150px', margin: 0, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} 
                        value={ordersCustomEnd} 
                        onChange={e => setOrdersCustomEnd(e.target.value)} 
                      />
                    </div>
                    {(ordersCustomStart || ordersCustomEnd) && (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => { setOrdersCustomStart(''); setOrdersCustomEnd(''); }}
                      >
                        Reset Dates
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Past Orders (> 24 hours) */}
                  {filteredPastOrders.map(order => {
                    const items = JSON.parse(order.itemsJSON || '[]');
                    return (
                      <div 
                        key={`past-ord-${order.id}`} 
                        style={{ 
                          background: '#f8fafc', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px', 
                          padding: '1rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedOrderForDetails(order)}
                      >
                        <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <strong style={{ fontSize: '1rem' }}>Order #{order.orderNumber}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Shop: <strong>{order.shopName}</strong> • {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <h3 style={{ margin: 0, color: 'var(--success)' }}>
                              ₹{((order.estimatedTotal && order.estimatedTotal > 0) ? order.estimatedTotal : items.reduce((s, it) => s + (it.amount || (it.rate * it.qty) || 0), 0)).toFixed(2)}
                            </h3>
                            <span className="badge" style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d' }}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '6px', padding: '0.75rem', margin: '0.5rem 0', border: '1px solid #f1f5f9' }}>
                          {items.map((entry, idx) => (
                            <div key={idx} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                              <span>{entry.item?.name || entry.name} x {entry.qty}</span>
                              <span>₹{(entry.amount || (entry.rate * entry.qty) || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex-between" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Order Slip</span>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={(e) => { e.stopPropagation(); setSelectedOrderForDetails(order); }}
                          >
                            View Order Slip
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* In-Store Purchases / Receipts */}
                  {filteredPurchases.map(purchase => {
                    const items = JSON.parse(purchase.itemsJSON || '[]');
                    return (
                      <div key={`purch-${purchase.id}`} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', padding: '1rem' }}>
                        <div className="flex-between" style={{ width: '100%', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{purchase.shopName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(purchase.date).toLocaleDateString()} at {new Date(purchase.date).toLocaleTimeString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <h3 style={{ margin: 0, color: 'var(--success)' }}>₹{purchase.total.toFixed(2)}</h3>
                            <span className="badge" style={{ fontSize: '0.75rem' }}>{purchase.paymentMethod}</span>
                          </div>
                        </div>

                        <div style={{ width: '100%', marginBottom: '0.75rem' }}>
                          {items.map((c, i) => (
                            <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                              <span>{c.item?.name || c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>x {c.qty} {c.item?.unit}</span></span>
                              <span>₹{((c.rate || c.item?.price) * c.qty).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {purchase.note && (
                          <div style={{ fontSize: '0.8rem', color: '#6366f1', background: '#eef2ff', padding: '0.25rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                            📝 Note: "{purchase.note}"
                          </div>
                        )}

                        <div className="flex-between" style={{ width: '100%', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In-Store Bill #{purchase.id}</span>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setSelectedReceipt(purchase)}
                          >
                            View Digital Receipt
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {totalFilteredAllOrdersCount === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                      <p className="subtitle" style={{ margin: 0 }}>
                        {ordersDateFilter === 'All' 
                          ? 'No past orders or purchase receipts recorded yet.' 
                          : `No orders or receipts found for ${ordersDateFilter === 'Month' ? 'This Month' : ordersDateFilter}.`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}

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
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
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
                        background: '#2563eb', 
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
                        background: '#16a34a', 
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
              <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Placed on</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{new Date(selectedOrderForDetails.createdAt).toLocaleString()}</div>
                </div>
                <span className="badge" style={{
                  background: selectedOrderForDetails.status === 'PACKING' ? '#fef3c7' 
                    : ((selectedOrderForDetails.status === 'COMPLETED' || selectedOrderForDetails.status === 'READY') ? '#e0f2fe' 
                    : (selectedOrderForDetails.status === 'COLLECTED' ? '#dcfce7' 
                    : ((selectedOrderForDetails.status === 'NOT_COLLECTED' || selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' || selectedOrderForDetails.status === 'DECLINED') ? '#fee2e2' : '#eff6ff'))),
                  color: selectedOrderForDetails.status === 'PACKING' ? '#b45309' 
                    : ((selectedOrderForDetails.status === 'COMPLETED' || selectedOrderForDetails.status === 'READY') ? '#0369a1' 
                    : (selectedOrderForDetails.status === 'COLLECTED' ? '#15803d' 
                    : ((selectedOrderForDetails.status === 'NOT_COLLECTED' || selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' || selectedOrderForDetails.status === 'DECLINED') ? '#b91c1c' : '#1d4ed8'))),
                  padding: '0.35rem 0.65rem',
                  fontWeight: '700'
                }}>
                  {selectedOrderForDetails.status === 'PACKING' && `⏳ PACKING (ETA: ~${selectedOrderForDetails.packingMinutes} mins)`}
                  {selectedOrderForDetails.status === 'PENDING' && '🕒 PENDING CONFIRMATION'}
                  {(selectedOrderForDetails.status === 'COMPLETED' || selectedOrderForDetails.status === 'READY') && '📦 PACKED & READY FOR PICKUP'}
                  {selectedOrderForDetails.status === 'COLLECTED' && '✓ COLLECTED BY YOU (LOCKED)'}
                  {selectedOrderForDetails.status === 'NOT_COLLECTED' && '✗ MARKED NOT COLLECTED (LOCKED)'}
                  {selectedOrderForDetails.status === 'CANCELLED_BY_CUSTOMER' && '🚫 CANCELLED / TAKEN BACK (LOCKED)'}
                  {selectedOrderForDetails.status === 'DECLINED' && `❌ DECLINED`}
                </span>
              </div>

              {/* Ready Confirmation Banner inside Details Modal */}
              {(selectedOrderForDetails.status === 'READY' || selectedOrderForDetails.status === 'COMPLETED') && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '700', color: '#166534', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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

              {/* Itemized Order Table */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Ordered Items
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JSON.parse(selectedOrderForDetails.itemsJSON || '[]').map((entry, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>{entry.item?.name || entry.name}</td>
                          <td style={{ textAlign: 'center', padding: '0.5rem' }}>{entry.qty} {entry.item?.unit || ''}</td>
                          <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{entry.rate || entry.item?.price || 0}</td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: '600' }}>₹{(entry.amount || ((entry.rate || entry.price || 0) * entry.qty)).toFixed(2)}</td>
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
                    ₹{((selectedOrderForDetails.estimatedTotal && selectedOrderForDetails.estimatedTotal > 0)
                      ? selectedOrderForDetails.estimatedTotal
                      : JSON.parse(selectedOrderForDetails.itemsJSON || '[]').reduce((s, it) => s + (it.amount || (it.rate * it.qty) || ((it.item?.price || 0) * it.qty) || 0), 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Customer Delivery Info */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
                  <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>🛒 Your Order List</h3>
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
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  {orderSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {Object.values(orderList).map(entry => (
                  <div key={entry.item.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      <strong style={{ fontSize: '0.95rem', minWidth: '55px', textAlign: 'right' }}>₹{entry.amount.toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="flex-between" style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: 'var(--success)' }}>₹{totalOrderAmount.toFixed(2)}</span>
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
                {JSON.parse(selectedReceipt.itemsJSON || '[]').map((c, i) => (
                  <div key={i} className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span>{c.item?.name || c.name} ({c.qty} {c.item?.unit})</span>
                    <span>₹{((c.rate || c.item?.price) * c.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
                <div className="flex-between"><span>Subtotal:</span><span>₹{(selectedReceipt.subtotal || selectedReceipt.total).toFixed(2)}</span></div>
                {selectedReceipt.discount > 0 && <div className="flex-between"><span>Discount:</span><span>-₹{selectedReceipt.discount.toFixed(2)}</span></div>}
                <div className="flex-between" style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  <span>Total:</span><span style={{ color: 'var(--success)' }}>₹{selectedReceipt.total.toFixed(2)}</span>
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

        {/* CUSTOMER PROFILE & SECURITY PIN MODAL */}
        {showProfileModal && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.25rem', borderRadius: '12px' }}>
              
              <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>Customer Profile</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage profile &amp; security PIN</div>
                  </div>
                </div>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowProfileModal(false)} />
              </div>

              {/* Profile Card Header */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>{currentUser?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Role: <strong>{currentUser?.role || 'Customer'}</strong> • {currentUser?.email}
                  </div>
                </div>
                <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Short ID: {currentUser?.shortId}
                </span>
              </div>

              {/* SECTION 1: EDIT PROFILE */}
              <form onSubmit={handleSaveProfile} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                  <User size={16} color="var(--primary)" /> Profile Information
                </h4>

                {profileNotice && (
                  <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={16} /> {profileNotice}
                  </div>
                )}
                {profileError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={16} /> {profileError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ margin: 0, marginTop: '4px' }} 
                      value={profileForm.name} 
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Phone</label>
                    <input 
                      type="tel" 
                      className="input" 
                      style={{ margin: 0, marginTop: '4px' }} 
                      value={profileForm.phone} 
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current City</label>
                  <select 
                    className="select" 
                    style={{ margin: 0, marginTop: '4px' }} 
                    value={profileForm.city} 
                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                  >
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Default Delivery Address</label>
                  <textarea 
                    className="input" 
                    rows={2} 
                    style={{ margin: 0, marginTop: '4px', resize: 'vertical' }} 
                    placeholder="e.g. Flat #302, Sunrise Heights, Near City Mall" 
                    value={profileForm.address} 
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  style={{ width: '100%', padding: '0.65rem' }} 
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              {/* SECTION 2: CHANGE 4-DIGIT SECURITY PIN */}
              <form onSubmit={handleChangePin} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                  <Lock size={16} color="#e11d48" /> Change 4-Digit Security PIN
                </h4>

                {pinNotice && (
                  <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={16} /> {pinNotice}
                  </div>
                )}
                {pinError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={16} /> {pinError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Current PIN</label>
                    <input 
                      type="password" 
                      maxLength="4" 
                      className="input" 
                      style={{ margin: 0, marginTop: '4px', textAlign: 'center', letterSpacing: '2px' }} 
                      placeholder="••••" 
                      value={pinForm.currentPin} 
                      onChange={e => setPinForm({ ...pinForm, currentPin: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>New PIN</label>
                    <input 
                      type="password" 
                      maxLength="4" 
                      className="input" 
                      style={{ margin: 0, marginTop: '4px', textAlign: 'center', letterSpacing: '2px' }} 
                      placeholder="••••" 
                      value={pinForm.newPin} 
                      onChange={e => setPinForm({ ...pinForm, newPin: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm PIN</label>
                    <input 
                      type="password" 
                      maxLength="4" 
                      className="input" 
                      style={{ margin: 0, marginTop: '4px', textAlign: 'center', letterSpacing: '2px' }} 
                      placeholder="••••" 
                      value={pinForm.confirmPin} 
                      onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-outline" 
                  style={{ width: '100%', padding: '0.65rem' }} 
                  disabled={pinSaving}
                >
                  {pinSaving ? 'Updating...' : 'Update Security PIN'}
                </button>
              </form>

            </div>
          </div>
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
                Shop Rate: <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>₹{selectedModalProduct.price.toFixed(2)}</strong> / {selectedModalProduct.unit}
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
                        <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px', gap: '2px' }}>
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
                              color: (modalSubUnitMode === 'Kilo' || modalSubUnitMode === 'Litre') ? '#fff' : '#475569',
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
                              color: (modalSubUnitMode === 'Gram' || modalSubUnitMode === 'ML') ? '#fff' : '#475569',
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
          <span>Explore</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => { setActiveTab('compare'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Tag size={18} />
          <span>Compare</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'khata' ? 'active' : ''}`} onClick={() => { setActiveTab('khata'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <BookOpen size={18} />
          <span>My Khata</span>
        </button>

        <button type="button" className={`footer-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setActiveShop(null); setSelectedKhataStore(null); }}>
          <Clock size={18} />
          <span>All Orders</span>
        </button>
      </div>
    </div>
  );
}
