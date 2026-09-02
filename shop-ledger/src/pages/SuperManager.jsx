import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminShops, getAdminUsers, getAdminCities, addAdminCity, deleteAdminCity,
  terminateShop, reactivateShop, terminateUser, reactivateUser, resetAdminPin
} from '../lib/api';
import { Shield, Store, Users, MapPin, Plus, Trash2, LogOut, Search, CheckCircle, XCircle, AlertTriangle, KeyRound } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function SuperManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shops'); // 'shops' | 'users' | 'cities'
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // New City Input State
  const [newCityName, setNewCityName] = useState('');
  const [cityNotice, setCityNotice] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, c] = await Promise.all([getAdminShops(), getAdminUsers(), getAdminCities()]);
      setShops(s);
      setUsers(u);
      setCities(c);
    } catch (e) {
      if (e.message.includes('Unauthorized') || e.message.includes('Forbidden')) {
        confirmLogout();
      }
    } finally {
      setLoading(false);
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
    const customPin = prompt(`Enter new 4-digit PIN for ${userObj.name || userObj.ownerName} (${userObj.shortId}):`, '1234');
    if (customPin === null) return;
    if (!/^\d{4}$/.test(customPin.trim())) {
      return alert('PIN must be exactly 4 numeric digits.');
    }
    try {
      const targetUserId = userObj.ownerId || userObj.id;
      const res = await resetAdminPin(targetUserId, customPin.trim());
      alert(res.message || `PIN reset successfully to ${customPin.trim()}!`);
    } catch (e) {
      alert(e.message || 'Failed to reset PIN.');
    }
  };

  const handleToggleShop = async (shop) => {
    const isTerminating = shop.status === 'ACTIVE';
    if (!confirm(`Are you sure you want to ${isTerminating ? 'TERMINATE' : 'REACTIVATE'} "${shop.shopName}" (${shop.shortId})?`)) return;
    
    if (isTerminating) await terminateShop(shop.id);
    else await reactivateShop(shop.id);
    loadData();
  };

  const handleToggleUser = async (user) => {
    const isTerminating = user.status === 'ACTIVE';
    if (!confirm(`Are you sure you want to ${isTerminating ? 'TERMINATE' : 'REACTIVATE'} user "${user.name}" (${user.shortId})?`)) return;

    if (isTerminating) await terminateUser(user.id);
    else await reactivateUser(user.id);
    loadData();
  };

  // City Management Handlers
  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setCityNotice('');
    try {
      const res = await addAdminCity(newCityName.trim());
      setCityNotice(res.message || 'City added successfully!');
      setNewCityName('');
      setTimeout(() => setCityNotice(''), 3000);
      const updatedCities = await getAdminCities();
      setCities(updatedCities);
    } catch (err) {
      alert(err.message || 'Failed to add city.');
    }
  };

  const handleDeleteCity = async (city) => {
    if (!confirm(`Remove city "${city.name}" from the platform? Customers and shops in this city will be affected.`)) return;
    try {
      await deleteAdminCity(city.id);
      const updatedCities = await getAdminCities();
      setCities(updatedCities);
    } catch (err) {
      alert(err.message || 'Failed to delete city.');
    }
  };

  const filteredShops = shops.filter(s => 
    s.shopName.toLowerCase().includes(search.toLowerCase()) ||
    s.shortId.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.shortId.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search) ||
    u.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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

        <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#fff', borderColor: '#4338ca' }}>
          <LogOut size={16} /> Logout
        </button>
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
                        ₹{(shop.totalRevenue || 0).toFixed(2)}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>{shop.totalSalesCount || 0} bills</div>
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
                            🔑 Reset PIN
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
                            🔑 Reset PIN
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
