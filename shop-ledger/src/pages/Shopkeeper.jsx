import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMe, getItems, saveItem, deleteItem, editItem, toggleShopStatus, 
  getShopOrders, acceptShopOrder, declineShopOrder, completeShopOrder,
  getSales, updateSaleNote, inviteStaff, getStaff, deleteStaff,
  getMyDetailedShop, updateMyDetailedShop
} from '../lib/api';
import { MASTER_GROCERY_CATALOG, GROCERY_CATEGORIES } from '../lib/masterGroceryCatalog';
import { 
  Store, ShoppingCart, Users, Plus, Edit2, Trash2, LogOut, Clock, 
  BarChart2, ShieldCheck, UserPlus, CheckCircle, XCircle, FileText, 
  Search, X, Calendar, AlertCircle, ArrowRight, Sparkles, Check, Info, Lock, MapPin, Phone
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
  const [detailedShop, setDetailedShop] = useState(null);
  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopPhone: '',
    city: 'Delhi',
    shopAddress: '',
    timings: ''
  });
  const [shopSaving, setShopSaving] = useState(false);
  const [shopSaveNotice, setShopSaveNotice] = useState('');

  const handleOpenShopDetails = async () => {
    try {
      const data = await getMyDetailedShop();
      setDetailedShop(data);
      setShopForm({
        shopName: data.shopName || '',
        shopPhone: data.shopPhone || '',
        city: data.city || 'Delhi',
        shopAddress: data.shopAddress || '',
        timings: data.timings || ''
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
      setCurrentShop(prev => ({ ...prev, ...shopForm }));
      setTimeout(() => setShowShopDetailsModal(false), 1200);
    } catch (err) {
      alert(err.message || 'Failed to save shop details');
    } finally {
      setShopSaving(false);
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
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') loadOrdersData();
    if (activeTab === 'transactions') loadSalesData(dateRange, customStart, customEnd);
    if (activeTab === 'items') loadItemsData();
    if (activeTab === 'staff') loadStaffData();
  }, [activeTab, dateRange]);

  const handleLogout = () => {
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

      {/* Shop Details & Settings Modal (Click on Shop Header) */}
      {showShopDetailsModal && (
        <div className="modal-overlay">
          <div className="panel modal-dialog" style={{ width: '460px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '1.25rem' }}>
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Store size={22} color="var(--primary)" />
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.15rem' }}>Shop Information & Settings</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Shop ID: <strong style={{ color: 'var(--primary)' }}>{detailedShop?.shortId || currentShop?.shortId}</strong>
                  </div>
                </div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowShopDetailsModal(false)} />
            </div>

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

            {/* Cashier View-Only Warning */}
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

            {/* Shop Details Form */}
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
                  <input 
                    className="input" 
                    value={shopForm.city} 
                    onChange={e => setShopForm({ ...shopForm, city: e.target.value })} 
                    disabled={!isOwner}
                    required 
                  />
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
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Operating Timings</label>
                <input 
                  className="input" 
                  value={shopForm.timings} 
                  onChange={e => setShopForm({ ...shopForm, timings: e.target.value })} 
                  disabled={!isOwner}
                  placeholder="e.g. 08:00 AM - 10:00 PM"
                  required 
                />
              </div>

              {/* Statistics Metadata */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>Owner: <strong>{detailedShop?.ownerName || currentUser?.name}</strong> ({detailedShop?.ownerShortId || currentUser?.shortId})</div>
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
    </div>
  );
}
