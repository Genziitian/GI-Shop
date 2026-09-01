import React, { useState, useEffect } from 'react';
import { getCustomers, getCustomerLedger, saveSettlement, terminateCustomer, blockCustomer, unblockCustomer, getMyDetailedShop } from '../lib/api';
import { ArrowLeft, Search, Plus, Ban, CheckCircle, ShieldAlert, X, MessageCircle } from 'lucide-react';

export default function CustomerLedger({ currentShop }) {
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('All'); // All, Highest, Lowest, No Due
  const [search, setSearch] = useState('');
  const [shopInfo, setShopInfo] = useState(currentShop || null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [currentDue, setCurrentDue] = useState(0);

  // Timeline Date Filter State (All, Today, Yesterday, Month, Custom)
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [timelineCustomStart, setTimelineCustomStart] = useState('');
  const [timelineCustomEnd, setTimelineCustomEnd] = useState('');

  // Settlement Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Cash');
  const [settleCustomer, setSettleCustomer] = useState(null);

  useEffect(() => {
    if (!currentShop) {
      getMyDetailedShop().then(s => setShopInfo(s)).catch(() => {});
    } else {
      setShopInfo(currentShop);
    }
  }, [currentShop]);

  const loadData = async () => {
    try {
      const data = await getCustomers();
      const custsWithDue = await Promise.all(data.map(async c => {
        const led = await getCustomerLedger(c.customerPhone);
        let due = 0;
        led.sales.filter(s => s.paymentMethod === 'Add to Book').forEach(s => due += (s.total || 0));
        led.settlements.forEach(s => due -= (s.amount || 0));
        return { 
          ...c, 
          totalDue: due, 
          phone: c.customerPhone,
          shortId: c.shortId || ''
        };
      }));
      setCustomers(custsWithDue);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemindPayment = (e, customer) => {
    if (e) e.stopPropagation();
    if (!customer || !customer.phone) {
      alert('Customer phone number is not available.');
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const dueAmt = parseFloat(customer.totalDue ?? currentDue ?? 0).toFixed(2);
    const shopTitle = shopInfo?.shopName || currentShop?.shopName || 'our shop';
    const message = encodeURIComponent(
      `Hello ${customer.name || 'Customer'},\n\nThis is a gentle payment reminder from *${shopTitle}*.\n\nYou have an outstanding khata due of *₹${dueAmt}*.\nPlease submit/clear your payment at your earliest convenience.\n\nThank you!`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenLedger = async (customer) => {
    setSelectedCustomer(customer);
    setCurrentDue(customer.totalDue);
    
    try {
      const led = await getCustomerLedger(customer.phone);
      const sales = led.sales.map(s => ({ ...s, type: 'SALE', items: JSON.parse(s.itemsJSON || '[]') }));
      const settlements = led.settlements.map(s => ({ ...s, type: 'SETTLEMENT' }));
      
      const combined = [...sales, ...settlements].sort((a, b) => new Date(a.date) - new Date(b.date));
      let running = 0;
      const finalLedger = combined.map(entry => {
        if (entry.type === 'SALE' && entry.paymentMethod === 'Add to Book') running += entry.total;
        else if (entry.type === 'SETTLEMENT') running -= entry.amount;
        return { ...entry, runningDue: running };
      });
      setLedger(finalLedger);
    } catch (e) { console.error(e); }
  };

  const handleOpenSettle = (e, customer) => {
    e.stopPropagation();
    setSettleCustomer(customer);
    setSettleAmount(customer.totalDue.toString());
    setShowSettleModal(true);
  };

  const handleSettleSubmit = async () => {
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) return alert('Enter valid repayment amount');
    
    await saveSettlement({
      customerPhone: settleCustomer.phone,
      amount: amt,
      method: settleMethod
    });
    
    setShowSettleModal(false);
    await loadData();
    if (selectedCustomer && selectedCustomer.phone === settleCustomer.phone) {
      await handleOpenLedger(settleCustomer);
    }
  };

  const handleToggleBlock = async (customer) => {
    const isBlocking = !customer.isBlocked;
    if (!confirm(`Are you sure you want to ${isBlocking ? 'BLOCK' : 'UNBLOCK'} ${customer.name}?`)) return;

    if (isBlocking) await blockCustomer(customer.phone, 'Blocked from placing orders');
    else await unblockCustomer(customer.phone);

    await loadData();
    if (selectedCustomer) {
      setSelectedCustomer({ ...selectedCustomer, isBlocked: isBlocking ? 1 : 0 });
    }
  };

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to terminate this relationship? The customer will be hidden from active lists, but all historical bills remain intact for auditing.')) return;
    await terminateCustomer(selectedCustomer.phone);
    setSelectedCustomer(null);
    loadData();
  };

  let displayedCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.shortId && c.shortId.toLowerCase().includes(search.toLowerCase()))
  );

  if (filter === 'Highest') displayedCustomers.sort((a, b) => b.totalDue - a.totalDue);
  if (filter === 'Lowest') displayedCustomers.sort((a, b) => a.totalDue - b.totalDue);
  if (filter === 'No Due') displayedCustomers = displayedCustomers.filter(c => c.totalDue <= 0);

  if (selectedCustomer) {
    return (
      <div className="panel">
        <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setSelectedCustomer(null)}>
            <ArrowLeft size={16} /> Back to Customers
          </button>

          <div>
            <h2 className="title" style={{ margin: 0 }}>
              {selectedCustomer.name} 
              {selectedCustomer.shortId && <span style={{ color: 'var(--primary)', fontSize: '0.9rem', marginLeft: '0.4rem' }}>({selectedCustomer.shortId})</span>}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedCustomer.phone} • {selectedCustomer.address || 'No address'}</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Outstanding Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: currentDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
              ₹{currentDue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Customer Actions Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {currentDue > 0 && (
            <>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  background: '#25D366', 
                  borderColor: '#25D366', 
                  color: '#ffffff', 
                  padding: '0.45rem 0.85rem', 
                  fontWeight: '700',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem' 
                }} 
                onClick={(e) => handleRemindPayment(e, selectedCustomer)}
              >
                <MessageCircle size={16} /> Remind Payment (WhatsApp)
              </button>
              <button type="button" className="btn btn-success" style={{ padding: '0.45rem 0.85rem' }} onClick={(e) => handleOpenSettle(e, selectedCustomer)}>
                Settle Due (Record Payment)
              </button>
            </>
          )}

          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ 
              padding: '0.45rem 0.85rem', 
              color: selectedCustomer.isBlocked ? 'var(--success)' : 'var(--warning)', 
              borderColor: selectedCustomer.isBlocked ? 'var(--success)' : 'var(--warning)' 
            }}
            onClick={() => handleToggleBlock(selectedCustomer)}
          >
            {selectedCustomer.isBlocked ? '✓ Unblock Customer' : '🚫 Block from Ordering'}
          </button>

          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ padding: '0.45rem 0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: 'auto' }}
            onClick={handleTerminate}
          >
            Terminate Relationship
          </button>
        </div>

        {/* Chronological Ledger Header with Date Filter */}
        <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Transaction Timeline &amp; Ledger</h3>

          {/* Filter Pills */}
          <div className="filter-pills-scroll">
            {['All', 'Today', 'Yesterday', 'Month', 'Custom'].map(f => (
              <button
                key={f}
                type="button"
                className={`btn ${timelineFilter === f ? '' : 'btn-outline'}`}
                style={{ 
                  padding: '0.3rem 0.65rem', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  fontWeight: timelineFilter === f ? '700' : '500',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setTimelineFilter(f)}
              >
                {f === 'Month' ? 'This Month' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timelineFilter === 'Custom' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>From:</span>
              <input 
                type="date" 
                className="input" 
                style={{ width: '140px', margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} 
                value={timelineCustomStart} 
                onChange={e => setTimelineCustomStart(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>To:</span>
              <input 
                type="date" 
                className="input" 
                style={{ width: '140px', margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} 
                value={timelineCustomEnd} 
                onChange={e => setTimelineCustomEnd(e.target.value)} 
              />
            </div>
            {(timelineCustomStart || timelineCustomEnd) && (
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                onClick={() => { setTimelineCustomStart(''); setTimelineCustomEnd(''); }}
              >
                Reset Dates
              </button>
            )}
          </div>
        )}

        {(() => {
          const isTimelineDateMatching = (dateStr) => {
            if (!dateStr || timelineFilter === 'All') return true;
            const itemDate = new Date(dateStr);
            const now = new Date();
            
            if (timelineFilter === 'Today') {
              const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
              return itemDate >= startToday && itemDate <= endToday;
            }

            if (timelineFilter === 'Yesterday') {
              const startYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
              const endYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              return itemDate >= startYest && itemDate <= endYest;
            }

            if (timelineFilter === 'Month') {
              const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
              return itemDate >= startMonth && itemDate <= endMonth;
            }

            if (timelineFilter === 'Custom') {
              if (!timelineCustomStart && !timelineCustomEnd) return true;
              const start = timelineCustomStart ? new Date(timelineCustomStart + 'T00:00:00') : new Date(0);
              const end = timelineCustomEnd ? new Date(timelineCustomEnd + 'T23:59:59.999') : new Date(8640000000000000);
              return itemDate >= start && itemDate <= end;
            }

            return true;
          };

          const filteredLedger = ledger.filter(entry => isTimelineDateMatching(entry.date));

          return (
            <div className="table-responsive">
              <table style={{ width: '100%', fontSize: '0.85rem', minWidth: '600px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date &amp; Time</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Debit (+Due)</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Credit (-Paid)</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Running Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)' }}>
                        {new Date(entry.date).toLocaleDateString()}<br/>
                        <small>{new Date(entry.date).toLocaleTimeString()}</small>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        {entry.type === 'SALE' ? (
                          <div>
                            <strong>Bill #{entry.id}</strong> ({entry.items?.length || 0} items)
                            {entry.note && <div style={{ fontSize: '0.75rem', color: '#6366f1' }}>Note: "{entry.note}"</div>}
                          </div>
                        ) : (
                          <div>
                            <strong style={{ color: 'var(--success)' }}>Repayment Received</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>via {entry.method}</div>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.65rem 0.5rem', color: 'var(--danger)', fontWeight: '600' }}>
                        {entry.type === 'SALE' && entry.paymentMethod === 'Add to Book' ? `₹${entry.total.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.65rem 0.5rem', color: 'var(--success)', fontWeight: '600' }}>
                        {entry.type === 'SETTLEMENT' ? `₹${entry.amount.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.65rem 0.5rem', fontWeight: '700' }}>
                        ₹{entry.runningDue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLedger.length === 0 && (
                <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>
                  {ledger.length === 0 ? 'No transactions recorded for this customer.' : 'No transactions match selected date filter.'}
                </p>
              )}
            </div>
          );
        })()}

        {/* Settle Modal */}
        {showSettleModal && (
          <div className="modal-overlay">
            <div className="panel modal-dialog" style={{ width: '380px', maxWidth: '100%', padding: '1.25rem' }}>
              <h3 className="title" style={{ fontSize: '1.15rem' }}>Settle Due for {settleCustomer?.name}</h3>
              <p className="subtitle" style={{ marginBottom: '1rem' }}>Outstanding: <strong>₹{settleCustomer?.totalDue.toFixed(2)}</strong></p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Amount Paying Now (₹):</label>
                <input type="number" className="input" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {['Cash', 'Online'].map(m => (
                  <button key={m} type="button" className={`btn ${settleMethod === m ? '' : 'btn-outline'}`} style={{ flex: 1, padding: '0.45rem' }} onClick={() => setSettleMethod(m)}>
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex-between">
                <button type="button" className="btn btn-outline" onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={handleSettleSubmit}>Record Payment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Search & Filter Header */}
      <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            className="input"
            style={{ margin: 0, paddingLeft: '2.25rem' }}
            placeholder="Search customer (Name, Phone, Short ID)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <select className="select" style={{ width: '150px', margin: 0 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="All">All Customers</option>
          <option value="Highest">Highest Due</option>
          <option value="Lowest">Lowest Due</option>
          <option value="No Due">No Due</option>
        </select>
      </div>

      {/* Customer Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayedCustomers.map(customer => (
          <div 
            key={customer.id || customer.phone} 
            className="list-item" 
            style={{ background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)' }} 
            onClick={() => handleOpenLedger(customer)}
          >
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                {customer.name}
                {customer.shortId && <span style={{ color: 'var(--primary)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>({customer.shortId})</span>}
                {customer.isBlocked === 1 && <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', marginLeft: '0.4rem' }}>Blocked</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{customer.phone}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Due</div>
                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: customer.totalDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{customer.totalDue.toFixed(2)}
                </div>
              </div>

              {customer.totalDue > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn" 
                    style={{ 
                      background: '#25D366', 
                      borderColor: '#25D366', 
                      color: '#ffffff', 
                      padding: '0.35rem 0.65rem', 
                      fontSize: '0.8rem', 
                      fontWeight: '700',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem' 
                    }} 
                    onClick={(e) => handleRemindPayment(e, customer)}
                  >
                    <MessageCircle size={14} /> Remind
                  </button>
                  <button type="button" className="btn btn-success" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={(e) => handleOpenSettle(e, customer)}>
                    Settle
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {displayedCustomers.length === 0 && <p className="subtitle" style={{ textAlign: 'center', margin: '2rem 0' }}>No matching customers found.</p>}
      </div>
    </div>
  );
}
