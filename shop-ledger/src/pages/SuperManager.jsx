import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminShops, getAdminUsers, getAdminCities, addAdminCity, deleteAdminCity,
  terminateShop, reactivateShop, terminateUser, reactivateUser, resetAdminPin,
  getSupportSettings, updateSupportSettings, getAdminSyncedContacts
} from '../lib/api';
import { Shield, Store, Users, MapPin, Plus, Trash2, LogOut, Search, CheckCircle, XCircle, AlertTriangle, KeyRound, Headphones, Phone, Mail, Clock, Save, Contact, Smartphone } from 'lucide-react';
import logoImg from '../assets/logo.png';

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, c, supp, contacts] = await Promise.all([
        getAdminShops().catch(err => { console.error('getAdminShops error:', err); return []; }),
        getAdminUsers().catch(err => { console.error('getAdminUsers error:', err); return []; }),
        getAdminCities().catch(err => { console.error('getAdminCities error:', err); return []; }),
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
      alert(err?.message || 'Failed to update support settings.');
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
      return alert('PIN must be exactly 4 numeric digits.');
    }
    try {
      const targetUserId = userObj?.ownerId || userObj?.id;
      const res = await resetAdminPin(targetUserId, customPin.trim());
      alert(res?.message || `PIN reset successfully to ${customPin.trim()}!`);
    } catch (e) {
      alert(e?.message || 'Failed to reset PIN.');
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
      alert(e?.message || 'Failed to update shop status.');
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
      alert(e?.message || 'Failed to update user status.');
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
      alert(err?.message || 'Failed to add city.');
    }
  };

  const handleDeleteCity = async (city) => {
    if (!confirm(`Remove city "${city?.name}" from the platform? Customers and shops in this city will be affected.`)) return;
    try {
      await deleteAdminCity(city.id);
      const updatedCities = await getAdminCities();
      setCities(Array.isArray(updatedCities) ? updatedCities : []);
    } catch (err) {
      alert(err?.message || 'Failed to delete city.');
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

  const filteredCities = safeCities.filter(c => {
    if (!c) return false;
    return (c.name || '').toLowerCase().includes(searchQuery);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Top Navigation */}
      <div className="nav-bar" style={{ background: '#1e1b4b', color: '#fff', borderBottom: '1px solid #312e81' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={logoImg} alt="GI SHOP" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Super Manager Portal</h3>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>GI SHOP • Platform Governance</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="tel:7323809242"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none' }}
          >
            <Phone size={14} /> Contact Customer Care (7323809242)
          </a>
          <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#fff', borderColor: '#4338ca' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="container" style={{ flex: 1, marginTop: '1.5rem', marginBottom: '2rem' }}>
        {/* Governance Notice */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#1e40af' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Super Admin Role:</strong> You have platform-wide governance to manage allowed cities, audit registered shops, and terminate/reactivate accounts.
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'shops' ? '' : 'btn-outline'}`}
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={() => setActiveTab('shops')}
              >
                <Store size={18} /> All Shops ({shops.length})
              </button>

              <button
                type="button"
                className={`btn ${activeTab === 'users' ? '' : 'btn-outline'}`}
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={() => setActiveTab('users')}
              >
                <Users size={18} /> All Users ({users.length})
              </button>

              <button
                type="button"
                className={`btn ${activeTab === 'cities' ? '' : 'btn-outline'}`}
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={() => setActiveTab('cities')}
              >
                <MapPin size={18} /> Manage Cities ({cities.length})
              </button>

              <button
                type="button"
                className={`btn ${activeTab === 'support' ? '' : 'btn-outline'}`}
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={() => setActiveTab('support')}
              >
                <Headphones size={18} /> Support Settings
              </button>

              <button
                type="button"
                className={`btn ${activeTab === 'contacts' ? '' : 'btn-outline'}`}
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={() => setActiveTab('contacts')}
              >
                <Contact size={18} /> Synced Contacts ({syncedContacts.length})
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '360px' }}>
              <input
                type="text"
                className="input"
                style={{ margin: 0, paddingLeft: '2.5rem' }}
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>

        {/* TAB 1: SHOPS */}
        {activeTab === 'shops' && (
          <div className="panel">
            <h3 className="title" style={{ marginBottom: '1rem' }}>Registered Shops across Cities</h3>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '650px', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Shop Info</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>City & Timings</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Owner Info</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Revenue</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map(shop => (
                    <tr key={shop.id} style={{ borderBottom: '1px solid var(--border)', opacity: shop.status === 'TERMINATED' ? 0.6 : 1 }}>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{shop.shopName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: <strong style={{ color: 'var(--primary)' }}>{shop.shortId}</strong> • {shop.shopAddress}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>{shop.city}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{shop.timings}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: '600' }}>{shop.ownerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{shop.ownerPhone}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem', fontWeight: '700', color: 'var(--success)' }}>
                        ₹{(Number(shop.totalRevenue) || 0).toFixed(2)}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>{Number(shop.totalSalesCount) || 0} bills</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.85rem 0.75rem' }}>
                        <span className="badge" style={{
                          background: shop.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: shop.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                          borderColor: shop.status === 'ACTIVE' ? '#bbf7d0' : '#fecaca'
                        }}>
                          {shop.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderColor: '#cbd5e1', color: '#475569' }}
                            title="Reset 4-Digit Security PIN"
                            onClick={() => handleResetPin(shop)}
                          >
                            Reset PIN
                          </button>
                          <button
                            type="button"
                            className={`btn ${shop.status === 'ACTIVE' ? 'btn-danger' : 'btn-outline'}`}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => handleToggleShop(shop)}
                          >
                            {shop.status === 'ACTIVE' ? 'Terminate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredShops.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No shops found.</p>}
            </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === 'users' && (
          <div className="panel">
            <h3 className="title" style={{ marginBottom: '1rem' }}>Platform Users Directory</h3>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '650px', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>User Info</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Contact</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>City</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', opacity: user.status === 'TERMINATED' ? 0.6 : 1 }}>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: '700' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Short ID: <strong style={{ color: 'var(--primary)' }}>{user.shortId}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span className="badge" style={{
                          background: user.role === 'Shopkeeper' ? '#eff6ff' : (user.role === 'SuperManager' ? '#f5f3ff' : '#f0fdf4'),
                          color: user.role === 'Shopkeeper' ? '#1d4ed8' : (user.role === 'SuperManager' ? '#7c3aed' : '#15803d'),
                          borderColor: 'transparent'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div>{user.phone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>{user.city || '—'}</td>
                      <td style={{ textAlign: 'center', padding: '0.85rem 0.75rem' }}>
                        <span className="badge" style={{
                          background: user.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: user.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderColor: '#cbd5e1', color: '#475569' }}
                            title="Reset 4-Digit Security PIN"
                            onClick={() => handleResetPin(user)}
                          >
                            Reset PIN
                          </button>
                          {user.role !== 'SuperManager' && (
                            <button
                              type="button"
                              className={`btn ${user.status === 'ACTIVE' ? 'btn-danger' : 'btn-outline'}`}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              onClick={() => handleToggleUser(user)}
                            >
                              {user.status === 'ACTIVE' ? 'Terminate' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No users found.</p>}
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE CITIES (SUPER ADMIN ONLY) */}
        {activeTab === 'cities' && (
          <div>
            {cityNotice && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                <CheckCircle size={18} /> {cityNotice}
              </div>
            )}

            {/* Add City Form */}
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <h3 className="title" style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Add New Platform City</h3>
              <p className="subtitle" style={{ marginBottom: '1rem' }}>
                Add a new city to the platform directory. Once added, customers can choose this city to discover local shops and shopkeepers can register stores here.
              </p>

              <form onSubmit={handleAddCity} style={{ display: 'flex', gap: '0.75rem', maxWidth: '500px' }}>
                <input
                  className="input"
                  style={{ margin: 0, flex: 1 }}
                  placeholder="Enter city name (e.g. Chandigarh, Patna, Surat, Kochi)..."
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  required
                />
                <button type="submit" className="btn">
                  <Plus size={16} /> Add City
                </button>
              </form>
            </div>

            {/* Cities Directory Table */}
            <div className="panel">
              <h3 className="title" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Active Platform Cities ({cities.length})</h3>
              <div className="table-responsive">
                <table style={{ width: '100%', minWidth: '500px', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>City Name</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem' }}>Active Shops</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date Created</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCities.map(city => (
                      <tr key={city.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: '700', fontSize: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={16} color="var(--primary)" />
                            {city.name}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.85rem 0.75rem' }}>
                          <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)' }}>
                            {city.shopCount || 0} active shops
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {city.createdAt ? new Date(city.createdAt).toLocaleDateString() : 'System Default'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteCity(city)}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCities.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No cities found matching search.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SUPPORT CONTACT SETTINGS ================= */}
        {activeTab === 'support' && (
          <div className="panel" style={{ padding: '1.75rem', maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Platform Support Contact Settings</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure the customer support helpline, WhatsApp number, and email displayed to all app & web users.</p>
              </div>
            </div>

            {supportNotice && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '600' }}>
                ✓ {supportNotice}
              </div>
            )}

            <form onSubmit={handleSaveSupport}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="label" style={{ fontWeight: '700' }}>Support Phone Helpline</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. +91 98765 43210"
                      value={supportForm.supportPhone}
                      onChange={e => setSupportForm({ ...supportForm, supportPhone: e.target.value })}
                    />
                    <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: '700' }}>Support WhatsApp Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. 919876543210 (digits only)"
                      value={supportForm.supportWhatsapp}
                      onChange={e => setSupportForm({ ...supportForm, supportWhatsapp: e.target.value })}
                    />
                    <Phone size={16} color="#16a34a" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="label" style={{ fontWeight: '700' }}>Support Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. support@yourdomain.com"
                      value={supportForm.supportEmail}
                      onChange={e => setSupportForm({ ...supportForm, supportEmail: e.target.value })}
                    />
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: '700' }}>Operational Hours / Timings</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. 09:00 AM - 09:00 PM IST"
                      value={supportForm.supportHours}
                      onChange={e => setSupportForm({ ...supportForm, supportHours: e.target.value })}
                    />
                    <Clock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={supportSaving}
                style={{ width: '100%', padding: '0.85rem', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Save size={18} />
                {supportSaving ? 'Saving Changes...' : 'Save Support Contact Settings'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: SYNCED CONTACTS DIRECTORY */}
        {activeTab === 'contacts' && (
          <div>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Total Synced Contacts
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e3a8a' }}>
                  {safeContacts.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                  Imported via Device Contacts
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Unique Phone Numbers
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#14532d' }}>
                  {new Set(safeContacts.map(c => c?.contactPhone).filter(Boolean)).size}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '0.2rem' }}>
                  Distinct customer leads
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Contributing Shops
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#581c87' }}>
                  {new Set(safeContacts.map(c => c?.shopId || c?.shopName).filter(Boolean)).size}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a855f7', marginTop: '0.2rem' }}>
                  Shops syncing device contacts
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 className="title" style={{ margin: 0 }}>Device Contacts Central Directory</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Contacts imported by shopkeepers from their mobile phone address books into GI SHOP.
                  </p>
                </div>
                <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700', padding: '0.35rem 0.75rem' }}>
                  {safeContacts.filter(c => {
                    const q = searchQuery;
                    return (
                      (c?.contactName || '').toLowerCase().includes(q) ||
                      String(c?.contactPhone || '').includes(q) ||
                      (c?.shopName || '').toLowerCase().includes(q) ||
                      (c?.shopkeeperName || '').toLowerCase().includes(q) ||
                      (c?.city || '').toLowerCase().includes(q)
                    );
                  }).length} Matching Contacts
                </span>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Customer Contact</th>
                      <th>Phone Number</th>
                      <th>Importing Shop</th>
                      <th>City</th>
                      <th>Shopkeeper</th>
                      <th>Source</th>
                      <th>Synced Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeContacts
                      .filter(c => {
                        const q = searchQuery;
                        return (
                          (c?.contactName || '').toLowerCase().includes(q) ||
                          String(c?.contactPhone || '').includes(q) ||
                          (c?.shopName || '').toLowerCase().includes(q) ||
                          (c?.shopkeeperName || '').toLowerCase().includes(q) ||
                          (c?.city || '').toLowerCase().includes(q)
                        );
                      })
                      .map((c, idx) => (
                        <tr key={c.id || idx}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{idx + 1}</td>
                          <td>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>
                              {c.contactName || 'Unnamed Contact'}
                            </strong>
                            {c.contactEmail ? (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.contactEmail}</div>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.92rem' }}>
                                📞 +91 {c.contactPhone}
                              </strong>
                              <a
                                href={`https://wa.me/91${c.contactPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: '700',
                                  textDecoration: 'none'
                                }}
                              >
                                WhatsApp
                              </a>
                            </div>
                          </td>
                          <td>
                            <strong>{c.shopName || 'Shop #' + c.shopId}</strong>
                          </td>
                          <td>
                            <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                              📍 {c.city || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>
                              {c.shopkeeperName || 'Shopkeeper'}
                            </div>
                            {c.shopkeeperPhone ? (
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {c.shopkeeperPhone}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                background: '#eff6ff',
                                color: '#2563eb'
                              }}
                            >
                              <Smartphone size={13} />
                              {c.source === 'DEVICE_IMPORT' ? 'Device Contacts' : c.source}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {c.syncedAt ? new Date(c.syncedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </td>
                        </tr>
                      ))}

                    {syncedContacts.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                          <Smartphone size={40} style={{ margin: '0 auto 0.75rem auto', display: 'block', color: '#cbd5e1' }} />
                          <strong style={{ display: 'block', fontSize: '1rem', color: '#475569', marginBottom: '0.25rem' }}>
                            No Synced Contacts Yet
                          </strong>
                          When shopkeepers tap "Import from Device Contacts" on their phone, contacts will sync and display here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
    </div>
  );
}
