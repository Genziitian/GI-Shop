import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminShops, getAdminUsers, getAdminCities, addAdminCity, deleteAdminCity,
  terminateShop, reactivateShop, terminateUser, reactivateUser, resetAdminPin,
  changeAdminShopCity, deleteAdminShop, getSupportSettings, updateSupportSettings, getAdminSyncedContacts
} from '../lib/api';
import { notifyError } from '../lib/errorHandler';
import { Shield, Store, Users, MapPin, Plus, Trash2, LogOut, Search, CheckCircle, XCircle, AlertTriangle, KeyRound, Headphones, Phone, Mail, Clock, Save, Contact, RefreshCw, IndianRupee, UserCheck, AlertOctagon, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { CountUp } from '../components/Motion';

export default function SuperManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shops'); // 'shops' | 'users' | 'cities' | 'support' | 'contacts'
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [syncedContacts, setSyncedContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Support Settings State
  const [supportForm, setSupportForm] = useState({
    supportPhone: '',
    supportWhatsapp: '',
    supportEmail: '',
    supportHours: '09:00 AM - 09:00 PM'
  });
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportNotice, setSupportNotice] = useState('');

  // New City Input State
  const [newCityName, setNewCityName] = useState('');
  const [cityNotice, setCityNotice] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Delete Shop 3-Confirmation Modal State
  const [shopToDelete, setShopToDelete] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1); // 1 | 2 | 3
  const [confirmCheck1, setConfirmCheck1] = useState(false);
  const [confirmCheck2, setConfirmCheck2] = useState(false);
  const [confirmCheck3, setConfirmCheck3] = useState(false);
  const [typedShopName, setTypedShopName] = useState('');
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [shopDeleteNotice, setShopDeleteNotice] = useState('');

  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [s, u, c, supp, contacts] = await Promise.all([
        getAdminShops().catch(err => { console.error('getAdminShops error:', err); setLoadError(err?.message || 'Failed to load data'); return []; }),
        getAdminUsers().catch(err => { console.error('getAdminUsers error:', err); setLoadError(err?.message || 'Failed to load data'); return []; }),
        getAdminCities().catch(err => { console.error('getAdminCities error:', err); setLoadError(err?.message || 'Failed to load data'); return []; }),
        getSupportSettings().catch(() => ({ supportPhone: '', supportWhatsapp: '', supportEmail: '', supportHours: '09:00 AM - 09:00 PM' })),
        getAdminSyncedContacts().catch(() => [])
      ]);
      setShops(Array.isArray(s) ? s : (Array.isArray(s?.shops) ? s.shops : []));
      setUsers(Array.isArray(u) ? u : (Array.isArray(u?.users) ? u.users : []));
      setCities(Array.isArray(c) ? c : (Array.isArray(c?.cities) ? c.cities : []));
      setSyncedContacts(Array.isArray(contacts) ? contacts : (Array.isArray(contacts?.contacts) ? contacts.contacts : []));
      if (supp) {
        setSupportForm({
          supportPhone: supp.supportPhone || '',
          supportWhatsapp: supp.supportWhatsapp || '',
          supportEmail: supp.supportEmail || '',
          supportHours: supp.supportHours || '09:00 AM - 09:00 PM'
        });
      }
    } catch (e) {
      console.error('SuperManager loadData error:', e);
      if (e?.message && (e.message.includes('Unauthorized') || e.message.includes('Forbidden'))) {
        confirmLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupport = async (e) => {
    e.preventDefault();
    setSupportSaving(true);
    setSupportNotice('');
    try {
      const res = await updateSupportSettings(supportForm);
      setSupportNotice(res?.message || 'Support contact settings updated successfully!');
      setTimeout(() => setSupportNotice(''), 4000);
    } catch (err) {
      notifyError(err, 'Support Settings');
    } finally {
      setSupportSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleResetPin = async (userObj) => {
    const name = userObj?.name || userObj?.ownerName || 'User';
    const shortId = userObj?.shortId || userObj?.id || '';
    const customPin = prompt(`Enter new 4-digit PIN for ${name} (${shortId}):`, '1234');
    if (customPin === null) return;
    if (!/^\d{4}$/.test(customPin.trim())) {
      return notifyError('PIN must be exactly 4 numeric digits.', 'PIN Validation');
    }
    try {
      const targetUserId = userObj?.ownerId || userObj?.id;
      const res = await resetAdminPin(targetUserId, customPin.trim());
      alert(res?.message || `PIN reset successfully to ${customPin.trim()}!`);
    } catch (e) {
      notifyError(e, 'Reset PIN');
    }
  };

  const handleChangeShopCity = async (shop) => {
    const activeCityNames = cities.map(c => c.name || c).filter(Boolean);
    const optionsText = activeCityNames.length > 0 ? activeCityNames.join(', ') : 'Delhi, Mumbai, Bengaluru';
    const chosenCity = prompt(`Change city for "${shop?.shopName}" (${shop?.city}):\nAvailable platform cities:\n${optionsText}`, shop?.city || 'Delhi');
    if (!chosenCity || chosenCity.trim() === shop?.city) return;
    try {
      const res = await changeAdminShopCity(shop.id, chosenCity.trim());
      alert(res?.message || `Shop city successfully changed to ${chosenCity.trim()}!`);
      loadData();
    } catch (e) {
      notifyError(e, 'Change Shop City');
    }
  };

  const handleToggleShop = async (shop) => {
    const isTerminating = shop?.status === 'ACTIVE';
    if (!confirm(`Are you sure you want to ${isTerminating ? 'TERMINATE' : 'REACTIVATE'} "${shop?.shopName || 'Shop'}" (${shop?.shortId || ''})?`)) return;
    
    try {
      if (isTerminating) await terminateShop(shop.id);
      else await reactivateShop(shop.id);
      loadData();
    } catch (e) {
      notifyError(e, 'Shop Status');
    }
  };

  const handleOpenDeleteModal = (shop) => {
    setShopToDelete(shop);
    setDeleteStep(1);
    setConfirmCheck1(false);
    setConfirmCheck2(false);
    setConfirmCheck3(false);
    setTypedShopName('');
    setIsDeletingShop(false);
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingShop) return;
    setShopToDelete(null);
    setDeleteStep(1);
    setConfirmCheck1(false);
    setConfirmCheck2(false);
    setConfirmCheck3(false);
    setTypedShopName('');
  };

  const handleConfirmDeleteShop = async () => {
    if (!shopToDelete) return;
    setIsDeletingShop(true);
    try {
      const res = await deleteAdminShop(shopToDelete.id);
      setShopDeleteNotice(res?.message || `Shop "${shopToDelete.shopName}" deleted successfully. Linked owner has been converted to a Customer.`);
      setTimeout(() => setShopDeleteNotice(''), 6000);
      handleCloseDeleteModal();
      loadData();
    } catch (err) {
      notifyError(err, 'Delete Shop');
    } finally {
      setIsDeletingShop(false);
    }
  };

  const handleToggleUser = async (user) => {
    const isTerminating = user?.status === 'ACTIVE';
    if (!confirm(`Are you sure you want to ${isTerminating ? 'TERMINATE' : 'REACTIVATE'} user "${user?.name || 'User'}" (${user?.shortId || ''})?`)) return;

    try {
      if (isTerminating) await terminateUser(user.id);
      else await reactivateUser(user.id);
      loadData();
    } catch (e) {
      notifyError(e, 'User Status');
    }
  };

  // City Management Handlers
  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setCityNotice('');
    try {
      const res = await addAdminCity(newCityName.trim());
      setCityNotice(res?.message || 'City added successfully!');
      setNewCityName('');
      setTimeout(() => setCityNotice(''), 3000);
      const updatedCities = await getAdminCities();
      setCities(Array.isArray(updatedCities) ? updatedCities : []);
    } catch (err) {
      notifyError(err, 'Add City');
    }
  };

  const handleDeleteCity = async (city) => {
    const shopCount = Number(city?.shopCount || 0);
    if (shopCount > 0) {
      alert(`Cannot remove ${city?.name} because ${shopCount} active ${shopCount === 1 ? 'shop is' : 'shops are'} registered here. Please reassign the shops first.`);
      return;
    }
    if (!confirm(`Remove city "${city?.name}" from the platform? Customers and shops in this city will be affected.`)) return;
    try {
      await deleteAdminCity(city.id);
      const updatedCities = await getAdminCities();
      setCities(Array.isArray(updatedCities) ? updatedCities : []);
    } catch (err) {
      notifyError(err, 'Delete City');
    }
  };

  const safeShops = Array.isArray(shops) ? shops : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeCities = Array.isArray(cities) ? cities : [];
  const safeContacts = Array.isArray(syncedContacts) ? syncedContacts : [];

  const searchQuery = (search || '').toLowerCase().trim();

  const filteredShops = safeShops.filter(s => {
    if (!s) return false;
    return (
      (s.shopName || '').toLowerCase().includes(searchQuery) ||
      (s.shortId || '').toLowerCase().includes(searchQuery) ||
      (s.city || '').toLowerCase().includes(searchQuery) ||
      (s.ownerName || '').toLowerCase().includes(searchQuery) ||
      String(s.ownerPhone || '').includes(searchQuery)
    );
  });

  const filteredUsers = safeUsers.filter(u => {
    if (!u) return false;
    return (
      (u.name || '').toLowerCase().includes(searchQuery) ||
      (u.shortId || '').toLowerCase().includes(searchQuery) ||
      (u.email || '').toLowerCase().includes(searchQuery) ||
      String(u.phone || '').includes(searchQuery) ||
      (u.city || '').toLowerCase().includes(searchQuery)
    );
  });

  const totalRevenue = safeShops.reduce((a, s) => a + (Number(s?.totalRevenue) || 0), 0);

  const filteredContacts = safeContacts.filter(c => {
    if (!c) return false;
    return (
      (c.contactName || '').toLowerCase().includes(searchQuery) ||
      String(c.contactPhone || '').includes(searchQuery) ||
      (c.shopName || '').toLowerCase().includes(searchQuery) ||
      (c.city || '').toLowerCase().includes(searchQuery)
    );
  });

  const filteredCities = safeCities.filter(c => {
    if (!c) return false;
    return (c.name || '').toLowerCase().includes(searchQuery);
  });

  return (
    <div className="sm-page">
      <style>{`
        .sm-page{min-height:100vh;display:flex;flex-direction:column;background:#f4f6f8}
        .sm-head{background:#1e1b4b;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.75rem clamp(.85rem,3vw,2rem);position:sticky;top:0;z-index:20;box-shadow:0 2px 12px rgba(30,27,75,.25)}
        .sm-brand{display:flex;align-items:center;gap:.65rem;min-width:0}
        .sm-brand img{width:38px;height:38px;border-radius:10px;object-fit:contain;background:#fff}
        .sm-brand b{font-size:1.05rem;white-space:nowrap}
        .sm-act{display:flex;gap:.5rem;align-items:center}
        .sm-call{display:inline-flex;align-items:center;gap:.4rem;background:#16a34a;color:#fff;border-radius:10px;padding:.55rem .95rem;font-weight:700;font-size:.85rem;text-decoration:none;border:0}
        .sm-call:hover{background:#15803d}
        .sm-icon{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:.55rem .8rem;font-weight:600;font-size:.85rem;cursor:pointer}
        .sm-icon:hover{background:rgba(255,255,255,.2)}
        .sm-wrap{width:100%;max-width:1200px;margin:0 auto;padding:1.25rem clamp(.85rem,3vw,2rem) 2.5rem;flex:1}
        .sm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.1rem}
        .sm-stat{background:#fff;border:1px solid var(--border);border-radius:14px;padding:.9rem 1rem;display:flex;align-items:center;gap:.75rem}
        .sm-stat i{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sm-stat b{display:block;font-size:1.35rem;line-height:1.1}
        .sm-stat span{font-size:.75rem;color:var(--text-muted)}
        .sm-bar{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem}
        .sm-tabs{display:flex;gap:.4rem;overflow-x:auto;padding:2px;flex:1 1 auto;scrollbar-width:none}
        .sm-tabs::-webkit-scrollbar{display:none}
        .sm-tab{display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap;border:1px solid var(--border);background:#fff;color:#344054;border-radius:999px;padding:.5rem .95rem;font-weight:600;font-size:.85rem;cursor:pointer}
        .sm-tab.on{background:#0f7a43;border-color:#0f7a43;color:#fff}
        .sm-tab em{font-style:normal;font-size:.72rem;background:rgba(0,0,0,.08);border-radius:999px;padding:0 .45rem}
        .sm-tab.on em{background:rgba(255,255,255,.25)}
        .sm-search{position:relative;flex:0 1 300px;min-width:200px}
        .sm-search input{margin:0!important;padding-left:2.4rem!important;border-radius:999px!important}
        .sm-search svg{position:absolute;left:.9rem;top:50%;transform:translateY(-50%);color:var(--text-muted)}
        .sm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:.9rem}
        .sm-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:1rem;display:flex;flex-direction:column;gap:.7rem}
        .sm-card.off{opacity:.65}
        .sm-top{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start}
        .sm-name{font-weight:800;font-size:1rem;overflow-wrap:anywhere}
        .sm-sub{font-size:.75rem;color:var(--text-muted);overflow-wrap:anywhere}
        .sm-pill{font-size:.7rem;font-weight:700;border-radius:999px;padding:.2rem .6rem;white-space:nowrap}
        .sm-ok{background:#dff3e6;color:#0f7a43}.sm-bad{background:#fee2e2;color:#b91c1c}.sm-blue{background:#e0f2fe;color:#0369a1}.sm-grey{background:#eff1f4;color:#475467}.sm-vio{background:#f5f3ff;color:#7c3aed}
        .sm-meta{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
        .sm-rev{display:flex;justify-content:space-between;align-items:center;background:#f7f8fa;border-radius:10px;padding:.55rem .75rem;font-size:.8rem;color:var(--text-muted)}
        .sm-rev b{color:#0f7a43;font-size:1rem}
        .sm-btns{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:auto}
        .sm-b{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;border-radius:9px;border:1px solid #d0d5dd;background:#fff;color:#344054;padding:.45rem .7rem;font-size:.78rem;font-weight:700;cursor:pointer;text-decoration:none}
        .sm-b:hover{background:#f7f8fa}
        .sm-b.call{background:#e9f6ee;border-color:#bfe3cb;color:#0f7a43}
        .sm-b.red{background:#fff1f2;border-color:#fca5a5;color:#dc2626}
        .sm-b.solid{background:#dc2626;border-color:#dc2626;color:#fff}
        .sm-b.sky{border-color:#7dd3fc;color:#0284c7}
        .sm-empty{text-align:center;color:var(--text-muted);padding:3rem 1rem;background:#fff;border:1px dashed var(--border);border-radius:16px}
        .sm-toast{background:#dff3e6;border:1px solid #c4e8d1;color:#0f7a43;border-radius:12px;padding:.75rem 1rem;margin-bottom:1rem;display:flex;gap:.5rem;align-items:center;font-weight:600;font-size:.9rem}
        .sm-form{background:#fff;border:1px solid var(--border);border-radius:16px;padding:1.1rem;margin-bottom:1rem}
        .sm-row{display:flex;gap:.6rem}
        .sm-row input{margin:0!important;flex:1}
        .sm-fields{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:1rem}
        @media(max-width:760px){
          .sm-stats{grid-template-columns:repeat(2,1fr)}
          .sm-grid{grid-template-columns:1fr}
          .sm-fields{grid-template-columns:1fr}
          .sm-brand small,.sm-btxt{display:none}
          .sm-search{flex:1 1 100%}
        }
      `}</style>

      {/* Header */}
      <header className="sm-head">
        <div className="sm-brand">
          <img src={logoImg} alt="GI SHOP" />
          <div><b>Super Manager</b><br /><small style={{ color: '#a5b4fc', fontSize: '.72rem' }}>GI SHOP</small></div>
        </div>
        <div className="sm-act">
          <a className="sm-call" href={`tel:${(supportForm.supportPhone || '7323809242').replace(/[^\d+]/g, '')}`} aria-label="Call customer care">
            <Phone size={16} /> <span>Call</span>
          </a>
          <button type="button" className="sm-icon" onClick={loadData} aria-label="Refresh" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button type="button" className="sm-icon" onClick={handleLogout} aria-label="Logout">
            <LogOut size={16} /> <span className="sm-btxt">Logout</span>
          </button>
        </div>
      </header>

      <main className="sm-wrap">
        {loadError && (
          <div className="sm-toast" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c', justifyContent: 'space-between' }}>
            <span><AlertTriangle size={16} style={{ verticalAlign: '-3px' }} /> {loadError}</span>
            <button type="button" className="sm-b" onClick={loadData}>Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="sm-stats">
          <div className="sm-stat"><i style={{ background: '#e9f6ee', color: '#0f7a43' }}><Store size={20} /></i><div><b><CountUp value={safeShops.filter(s => s?.status === 'ACTIVE').length} /></b><span>Active shops</span></div></div>
          <div className="sm-stat"><i style={{ background: '#e0f2fe', color: '#0284c7' }}><Users size={20} /></i><div><b><CountUp value={safeUsers.length} /></b><span>Users</span></div></div>
          <div className="sm-stat"><i style={{ background: '#fdf0cf', color: '#b45309' }}><MapPin size={20} /></i><div><b><CountUp value={safeCities.length} /></b><span>Cities</span></div></div>
          <div className="sm-stat"><i style={{ background: '#f5f3ff', color: '#7c3aed' }}><IndianRupee size={20} /></i><div><b>₹{Math.round(totalRevenue).toLocaleString('en-IN')}</b><span>Revenue</span></div></div>
        </div>

        {/* Tabs + search */}
        <div className="sm-bar">
          <div className="sm-tabs" role="tablist">
            {[
              ['shops', Store, 'Shops', safeShops.length],
              ['users', Users, 'Users', safeUsers.length],
              ['cities', MapPin, 'Cities', safeCities.length],
              ['contacts', Contact, 'Contacts', safeContacts.length],
              ['support', Headphones, 'Support', null]
            ].map(([key, Icon, label, count]) => (
              <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`sm-tab ${activeTab === key ? 'on' : ''}`} onClick={() => { setActiveTab(key); setSearch(''); }}>
                <Icon size={15} /> {label} {count !== null && <em>{count}</em>}
              </button>
            ))}
          </div>
          {activeTab !== 'support' && (
            <div className="sm-search">
              <input type="text" className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={16} />
            </div>
          )}
        </div>

        {/* SHOPS */}
        {activeTab === 'shops' && (
          <>
            {shopDeleteNotice && <div className="sm-toast"><CheckCircle size={18} /> {shopDeleteNotice}</div>}
            {filteredShops.length === 0 ? <div className="sm-empty">No shops found.</div> : (
              <div className="sm-grid">
                {filteredShops.map(shop => {
                  const active = shop.status === 'ACTIVE';
                  return (
                    <div key={shop.id} className={`sm-card ${active ? '' : 'off'}`}>
                      <div className="sm-top">
                        <div>
                          <div className="sm-name">{shop.shopName}</div>
                          <div className="sm-sub">{shop.shortId}{shop.shopAddress ? ` • ${shop.shopAddress}` : ''}</div>
                        </div>
                        <span className={`sm-pill ${active ? 'sm-ok' : 'sm-bad'}`}>{shop.status}</span>
                      </div>
                      <div className="sm-meta">
                        <span className="sm-pill sm-blue"><MapPin size={11} style={{ verticalAlign: '-1px' }} /> {shop.city}</span>
                        {shop.timings && <span className="sm-pill sm-grey"><Clock size={11} style={{ verticalAlign: '-1px' }} /> {shop.timings}</span>}
                      </div>
                      <div className="sm-rev">
                        <span>{shop.ownerName || 'Owner'}</span>
                        <span><b>₹{(Number(shop.totalRevenue) || 0).toFixed(2)}</b> · {Number(shop.totalSalesCount) || 0} bills</span>
                      </div>
                      <div className="sm-btns">
                        {shop.ownerPhone && <a className="sm-b call" href={`tel:${shop.ownerPhone}`}><Phone size={13} /> Call</a>}
                        <button type="button" className="sm-b sky" onClick={() => handleChangeShopCity(shop)}>Change City</button>
                        <button type="button" className="sm-b" onClick={() => handleResetPin(shop)}><KeyRound size={13} /> PIN</button>
                        <button type="button" className={`sm-b ${active ? 'solid' : ''}`} onClick={() => handleToggleShop(shop)}>{active ? 'Terminate' : 'Reactivate'}</button>
                        <button type="button" className="sm-b red" aria-label="Delete shop" onClick={() => handleOpenDeleteModal(shop)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          filteredUsers.length === 0 ? <div className="sm-empty">No users found.</div> : (
            <div className="sm-grid">
              {filteredUsers.map(user => {
                const active = user.status === 'ACTIVE';
                return (
                  <div key={user.id} className={`sm-card ${active ? '' : 'off'}`}>
                    <div className="sm-top">
                      <div>
                        <div className="sm-name">{user.name}</div>
                        <div className="sm-sub">{user.shortId}{user.email ? ` • ${user.email}` : ''}</div>
                      </div>
                      <span className={`sm-pill ${active ? 'sm-ok' : 'sm-bad'}`}>{user.status}</span>
                    </div>
                    <div className="sm-meta">
                      <span className={`sm-pill ${user.role === 'SuperManager' ? 'sm-vio' : user.role === 'Shopkeeper' ? 'sm-ok' : 'sm-grey'}`}>{user.role}</span>
                      {user.city && <span className="sm-pill sm-blue"><MapPin size={11} style={{ verticalAlign: '-1px' }} /> {user.city}</span>}
                    </div>
                    <div className="sm-btns">
                      {user.phone && <a className="sm-b call" href={`tel:${user.phone}`}><Phone size={13} /> Call</a>}
                      <button type="button" className="sm-b" onClick={() => handleResetPin(user)}><KeyRound size={13} /> PIN</button>
                      {user.role !== 'SuperManager' && (
                        <button type="button" className={`sm-b ${active ? 'solid' : ''}`} onClick={() => handleToggleUser(user)}>{active ? 'Terminate' : 'Reactivate'}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* CITIES */}
        {activeTab === 'cities' && (
          <>
            {cityNotice && <div className="sm-toast"><CheckCircle size={18} /> {cityNotice}</div>}
            <form className="sm-form sm-row" onSubmit={handleAddCity}>
              <input className="input" placeholder="New city name" value={newCityName} onChange={e => setNewCityName(e.target.value)} required />
              <button type="submit" className="btn"><Plus size={16} /> Add</button>
            </form>
            {filteredCities.length === 0 ? <div className="sm-empty">No cities found.</div> : (
              <div className="sm-grid">
                {filteredCities.map(city => {
                  const count = Number(city.shopCount || 0);
                  return (
                    <div key={city.id} className="sm-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div className="sm-name"><MapPin size={15} color="var(--primary)" style={{ verticalAlign: '-2px' }} /> {city.name}</div>
                        <div className="sm-sub">{count} {count === 1 ? 'shop' : 'shops'}{city.createdAt ? ` • ${new Date(city.createdAt).toLocaleDateString()}` : ''}</div>
                      </div>
                      {count > 0
                        ? <button type="button" className="sm-b" onClick={() => handleDeleteCity(city)}><Lock size={13} /> In use</button>
                        : <button type="button" className="sm-b red" onClick={() => handleDeleteCity(city)}><Trash2 size={13} /> Remove</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CONTACTS */}
        {activeTab === 'contacts' && (
          filteredContacts.length === 0 ? <div className="sm-empty">No synced contacts.</div> : (
            <div className="sm-grid">
              {filteredContacts.map((c, idx) => (
                <div key={c.id || idx} className="sm-card">
                  <div className="sm-top">
                    <div>
                      <div className="sm-name">{c.contactName || 'Unnamed'}</div>
                      <div className="sm-sub">{c.shopName || `Shop #${c.shopId}`}{c.city ? ` • ${c.city}` : ''}</div>
                    </div>
                    <span className="sm-pill sm-grey">{c.syncedAt ? new Date(c.syncedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                  </div>
                  <div className="sm-btns">
                    {c.contactPhone && <a className="sm-b call" href={`tel:+91${c.contactPhone}`}><Phone size={13} /> Call</a>}
                    {c.contactPhone && <a className="sm-b" href={`https://wa.me/91${c.contactPhone}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* SUPPORT */}
        {activeTab === 'support' && (
          <form className="sm-form" onSubmit={handleSaveSupport} style={{ maxWidth: 720 }}>
            {supportNotice && <div className="sm-toast"><CheckCircle size={18} /> {supportNotice}</div>}
            <div className="sm-fields">
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+91 98765 43210" value={supportForm.supportPhone} onChange={e => setSupportForm({ ...supportForm, supportPhone: e.target.value })} />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" placeholder="919876543210" value={supportForm.supportWhatsapp} onChange={e => setSupportForm({ ...supportForm, supportWhatsapp: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="support@example.com" value={supportForm.supportEmail} onChange={e => setSupportForm({ ...supportForm, supportEmail: e.target.value })} />
              </div>
              <div>
                <label className="label">Hours</label>
                <input className="input" placeholder="09:00 AM - 09:00 PM" value={supportForm.supportHours} onChange={e => setSupportForm({ ...supportForm, supportHours: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={supportSaving} style={{ width: '100%', padding: '.8rem', fontWeight: 700 }}>
              <Save size={17} /> {supportSaving ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </main>

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
              Are you sure you want to log out of SuperManager Admin?
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

      {/* 3-Step Shop Deletion Confirmation Modal */}
      {shopToDelete && (
        <div className="modal-overlay" style={{
          zIndex: 9999,
          position: 'fixed',
          inset: 0,
          background: 'rgba(16, 24, 40, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }} onClick={handleCloseDeleteModal}>
          <div className="panel modal-dialog" style={{
            width: '520px',
            maxWidth: '100%',
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>

            {/* Header: Title & Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#101828' }}>
                    Permanently Delete Shop
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#667085' }}>
                    3-Stage Safety Confirmation • Step {deleteStep} of 3
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeletingShop}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#98a2b3',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              background: '#f7f8fa',
              padding: '0.5rem',
              borderRadius: '12px',
              border: '1px solid #e4e7ec'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '0.45rem 0.2rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: deleteStep === 1 ? '#ef4444' : (deleteStep > 1 ? '#dff3e6' : 'transparent'),
                color: deleteStep === 1 ? '#ffffff' : (deleteStep > 1 ? '#0f7a43' : '#667085')
              }}>
                1. Data Impact {deleteStep > 1 && '✓'}
              </div>
              <div style={{
                textAlign: 'center',
                padding: '0.45rem 0.2rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: deleteStep === 2 ? '#ef4444' : (deleteStep > 2 ? '#dff3e6' : 'transparent'),
                color: deleteStep === 2 ? '#ffffff' : (deleteStep > 2 ? '#0f7a43' : '#667085')
              }}>
                2. User Downgrade {deleteStep > 2 && '✓'}
              </div>
              <div style={{
                textAlign: 'center',
                padding: '0.45rem 0.2rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: deleteStep === 3 ? '#ef4444' : 'transparent',
                color: deleteStep === 3 ? '#ffffff' : '#667085'
              }}>
                3. Final Authorize
              </div>
            </div>

            {/* Target Shop Summary Card */}
            <div style={{
              background: '#f7f8fa',
              border: '1px solid #e4e7ec',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#101828' }}>
                  {shopToDelete.shopName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#667085' }}>
                  ID: <span style={{ color: '#0284c7', fontWeight: '700' }}>{shopToDelete.shortId}</span> • City: <span style={{ fontWeight: '600', color: '#0369a1' }}>{shopToDelete.city}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#667085' }}>Owner: <strong style={{ color: '#101828' }}>{shopToDelete.ownerName}</strong></div>
                <div style={{ fontSize: '0.75rem', color: '#1f9d5a', fontWeight: '700' }}>
                  ₹{(Number(shopToDelete.totalRevenue) || 0).toFixed(2)} ({shopToDelete.totalSalesCount || 0} bills)
                </div>
              </div>
            </div>

            {/* STEP 1: Shop Data Impact Confirmation */}
            {deleteStep === 1 && (
              <div>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontWeight: '700', color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <AlertTriangle size={18} /> Confirmation 1 of 3: Permanent Data Loss
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', color: '#7f1d1d', lineHeight: '1.55' }}>
                    <li>All catalog products, price lists, and stock barcode inventory will be erased.</li>
                    <li>All customer orders, POS receipts, and customer dues / Khata ledgers will be deleted.</li>
                    <li>Any cashiers or staff assigned to this store will be unlinked immediately.</li>
                    <li><strong>This operation is permanent and CANNOT be recovered or undone.</strong></li>
                  </ul>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.85rem',
                  background: confirmCheck1 ? '#fee2e2' : '#f7f8fa',
                  border: `1.5px solid ${confirmCheck1 ? '#ef4444' : '#d0d5dd'}`,
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={confirmCheck1}
                    onChange={e => setConfirmCheck1(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#101828', lineHeight: '1.4' }}>
                    I understand that deleting this shop will permanently destroy all its products, orders, and sales history.
                  </span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCloseDeleteModal}
                    style={{ padding: '0.75rem', fontWeight: '700', borderRadius: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={!confirmCheck1}
                    onClick={() => setDeleteStep(2)}
                    style={{
                      padding: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '10px',
                      opacity: confirmCheck1 ? 1 : 0.5,
                      cursor: confirmCheck1 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    Next: Owner Downgrade (2/3) <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Owner Conversion to Normal Customer */}
            {deleteStep === 2 && (
              <div>
                <div style={{
                  background: '#e9f6ee',
                  border: '1px solid #bfe3cb',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontWeight: '700', color: '#0b5e33', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <UserCheck size={18} /> Confirmation 2 of 3: Convert Linked User to Normal Customer
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.84rem', color: '#0b5e33', lineHeight: '1.45' }}>
                    The shopkeeper <strong>{shopToDelete.ownerName}</strong> ({shopToDelete.ownerPhone}) will have their role converted:
                  </p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    background: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #d3eddc',
                    margin: '0.5rem 0 0.75rem 0'
                  }}>
                    <span className="badge" style={{ background: '#fdf0cf', color: '#92400e', fontWeight: '700' }}>
                      Shopkeeper (Owner)
                    </span>
                    <ArrowRight size={18} color="#0f7a43" />
                    <span className="badge" style={{ background: '#dff3e6', color: '#0f7a43', fontWeight: '700' }}>
                      Customer (Normal User)
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#0b5e33', lineHeight: '1.45' }}>
                    <li>The user will lose store ownership and access to the POS billing dashboard.</li>
                    <li>Their login remains active so they can continue to discover stores and order groceries as a normal customer.</li>
                  </ul>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.85rem',
                  background: confirmCheck2 ? '#e9f6ee' : '#f7f8fa',
                  border: `1.5px solid ${confirmCheck2 ? '#0f7a43' : '#d0d5dd'}`,
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={confirmCheck2}
                    onChange={e => setConfirmCheck2(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#0f7a43' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#101828', lineHeight: '1.4' }}>
                    I confirm that {shopToDelete.ownerName} will become a normal Customer account.
                  </span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setDeleteStep(1)}
                    style={{ padding: '0.75rem', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <ArrowLeft size={16} /> Back (Step 1)
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={!confirmCheck2}
                    onClick={() => setDeleteStep(3)}
                    style={{
                      padding: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '10px',
                      opacity: confirmCheck2 ? 1 : 0.5,
                      cursor: confirmCheck2 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    Next: Final Verify (3/3) <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Final Verification & Type Name Authorization */}
            {deleteStep === 3 && (
              <div>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontWeight: '700', color: '#991b1b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <Shield size={18} /> Confirmation 3 of 3: Security Verification
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.84rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                    To authorize deletion, please type the exact shop name <strong>"{shopToDelete.shopName}"</strong> or type <strong>DELETE</strong>:
                  </p>
                  <input
                    type="text"
                    className="input"
                    placeholder={`Type "${shopToDelete.shopName}" or "DELETE"`}
                    value={typedShopName}
                    onChange={e => setTypedShopName(e.target.value)}
                    style={{
                      margin: 0,
                      background: '#ffffff',
                      borderColor: (typedShopName.trim() === shopToDelete.shopName.trim() || typedShopName.trim().toUpperCase() === 'DELETE') ? '#22c55e' : '#f87171',
                      fontWeight: '600',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.85rem',
                  background: confirmCheck3 ? '#fee2e2' : '#f7f8fa',
                  border: `1.5px solid ${confirmCheck3 ? '#ef4444' : '#d0d5dd'}`,
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={confirmCheck3}
                    onChange={e => setConfirmCheck3(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#dc2626' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#101828', lineHeight: '1.4' }}>
                    I authorize the immediate permanent deletion of this shop and account downgrade.
                  </span>
                </label>

                {(() => {
                  const isMatch = typedShopName.trim() === shopToDelete.shopName.trim() || typedShopName.trim().toUpperCase() === 'DELETE';
                  const canExecute = confirmCheck3 && isMatch && !isDeletingShop;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={isDeletingShop}
                        onClick={() => setDeleteStep(2)}
                        style={{ padding: '0.75rem', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <ArrowLeft size={16} /> Back (Step 2)
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={!canExecute}
                        onClick={handleConfirmDeleteShop}
                        style={{
                          padding: '0.75rem',
                          fontWeight: '800',
                          borderRadius: '10px',
                          background: canExecute ? '#dc2626' : '#98a2b3',
                          borderColor: canExecute ? '#b91c1c' : '#98a2b3',
                          cursor: canExecute ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: canExecute ? '0 10px 15px -3px rgba(220, 38, 38, 0.4)' : 'none'
                        }}
                      >
                        <Trash2 size={16} />
                        {isDeletingShop ? 'Deleting Shop...' : 'Permanently Delete Shop'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
