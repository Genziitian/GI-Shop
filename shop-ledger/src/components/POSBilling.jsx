import React, { useState, useEffect } from 'react';
import { getCustomers, saveCustomer, saveSale, searchRegisteredCustomer } from '../lib/api';
import { 
  Search, Plus, Trash2, X, Receipt, UserCheck, AlertCircle, ShieldAlert, MessageSquare,
  ShoppingCart, ArrowRight, Minus, UserPlus, CreditCard, Banknote, BookOpen, Check
} from 'lucide-react';
import { ProductGridSkeleton } from './SkeletonLoader';

const QuickButton = ({ label, onClick }) => (
  <button type="button" className="btn btn-outline" style={{ padding: '0.5rem', flex: 1 }} onClick={onClick}>
    {label}
  </button>
);

export default function POSBilling({ items, onSaleComplete, prefilledOrder = null, onClearPrefill = null }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showMobileCartModal, setShowMobileCartModal] = useState(false);

  // App Customer Search Modal State (Email / Short ID)
  const [showAppSearchModal, setShowAppSearchModal] = useState(false);
  const [appQuery, setAppQuery] = useState('');
  const [appSearchResults, setAppSearchResults] = useState([]);
  const [appSearchLoading, setAppSearchLoading] = useState(false);
  const [appSearchNotice, setAppSearchNotice] = useState('');

  const [inlineAppResults, setInlineAppResults] = useState([]);
  const [inlineAppLoading, setInlineAppLoading] = useState(false);

  useEffect(() => {
    if (!searchCustomer || searchCustomer.trim().length < 2) {
      setInlineAppResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setInlineAppLoading(true);
      try {
        const results = await searchRegisteredCustomer(searchCustomer.trim());
        setInlineAppResults(results || []);
      } catch (e) {
        setInlineAppResults([]);
      } finally {
        setInlineAppLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchCustomer]);

  const [itemSearch, setItemSearch] = useState('');
  
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [saleNote, setSaleNote] = useState('');

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [subUnitMode, setSubUnitMode] = useState('Kilo'); // 'Kilo' (default) | 'Gram' (or 'Litre' | 'ML')
  const [qtyInput, setQtyInput] = useState(1); // always stored in base unit (e.g. kg or litre)
  const [displayQty, setDisplayQty] = useState('1'); // displayed in input based on subUnitMode
  const [priceInput, setPriceInput] = useState('');

  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    getCustomers().then(setCustomers).catch(console.error);
  }, []);

  // Handle Order Conversion Prefill
  useEffect(() => {
    if (prefilledOrder) {
      const itemsList = typeof prefilledOrder.itemsJSON === 'string' 
        ? JSON.parse(prefilledOrder.itemsJSON) 
        : (prefilledOrder.items || []);
      
      const formattedCart = itemsList.map(entry => ({
        item: entry.item || { id: entry.id, name: entry.name, price: entry.price || entry.rate, unit: entry.unit || 'Piece' },
        qty: entry.qty || 1,
        rate: entry.rate || entry.price || (entry.item?.price) || 0,
        amount: entry.amount || ((entry.rate || entry.price || entry.item?.price || 0) * (entry.qty || 1))
      }));
      setCart(formattedCart);

      if (prefilledOrder.customerPhone) {
        setSearchCustomer(prefilledOrder.customerPhone);
        setSelectedCustomer({
          name: prefilledOrder.customerName,
          phone: prefilledOrder.customerPhone,
          shortId: prefilledOrder.customerShortId,
          address: prefilledOrder.customerAddress
        });
      }
    }
  }, [prefilledOrder]);

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setSearchCustomer(c.phone || c.customerPhone);
    setShowCustomerDropdown(false);
  };

  const handleAddNewCustomer = async () => {
    if (!searchCustomer) return;
    await saveCustomer({ phone: searchCustomer, name: 'New Customer', address: '' });
    const custs = await getCustomers();
    setCustomers(custs);
    const newC = custs.find(c => (c.phone || c.customerPhone) === searchCustomer);
    if (newC) handleSelectCustomer(newC);
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredCustomers = customers.filter(c => {
    const p = c.phone || c.customerPhone || '';
    const sId = c.shortId || '';
    const name = c.name || '';
    return p.includes(searchCustomer) || sId.toLowerCase().includes(searchCustomer.toLowerCase()) || name.toLowerCase().includes(searchCustomer.toLowerCase());
  });

  const openModal = (product) => {
    setSelectedProduct(product);
    const defaultMode = product.unit === 'Litre' ? 'Litre' : (product.unit === 'Kilo' ? 'Kilo' : 'Piece');
    setSubUnitMode(defaultMode);
    setQtyInput(1);
    setDisplayQty('1');
    setPriceInput(product.price.toString());
  };

  const handleToggleSubUnitMode = (newMode) => {
    setSubUnitMode(newMode);
    if (newMode === 'Gram') {
      setDisplayQty((qtyInput * 1000).toString());
    } else if (newMode === 'Kilo') {
      setDisplayQty(qtyInput.toString());
    } else if (newMode === 'ML') {
      setDisplayQty((qtyInput * 1000).toString());
    } else if (newMode === 'Litre') {
      setDisplayQty(qtyInput.toString());
    }
  };

  const handleDisplayQtyChange = (valStr) => {
    setDisplayQty(valStr);
    const valNum = parseFloat(valStr) || 0;
    let actualBaseQty = valNum;

    if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
      actualBaseQty = valNum / 1000;
    }

    setQtyInput(actualBaseQty);
    if (selectedProduct) {
      setPriceInput((actualBaseQty * selectedProduct.price).toFixed(2));
    }
  };

  const handleSetPresetQty = (baseQty) => {
    setQtyInput(baseQty);
    if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
      setDisplayQty((baseQty * 1000).toString());
    } else {
      setDisplayQty(baseQty.toString());
    }
    if (selectedProduct) {
      setPriceInput((baseQty * selectedProduct.price).toFixed(2));
    }
  };

  const handlePriceChange = (valStr) => {
    setPriceInput(valStr);
    const valNum = parseFloat(valStr) || 0;
    if (selectedProduct && selectedProduct.price > 0) {
      const baseQty = valNum / selectedProduct.price;
      setQtyInput(baseQty);
      if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
        setDisplayQty((baseQty * 1000).toFixed(0));
      } else {
        setDisplayQty(parseFloat(baseQty.toFixed(3)).toString());
      }
    }
  };

  const addToCart = () => {
    if (!selectedProduct || qtyInput <= 0) return;
    const amount = qtyInput * selectedProduct.price;
    const existingIndex = cart.findIndex(c => c.item.id === selectedProduct.id);
    let newCart = [...cart];
    if (existingIndex >= 0) {
      newCart[existingIndex].qty += qtyInput;
      newCart[existingIndex].amount += amount;
    } else {
      newCart.push({ item: selectedProduct, qty: qtyInput, rate: selectedProduct.price, amount });
    }
    setCart(newCart);
    setSelectedProduct(null);
  };

  const subtotal = cart.reduce((sum, c) => sum + c.amount, 0);
  const finalTotal = Math.max(0, subtotal - discount);

  const removeCartItem = (index) => {
    const remaining = cart.filter((_, i) => i !== index);
    setCart(remaining);
    if (remaining.length === 0) {
      setShowMobileCartModal(false);
    }
  };

  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const target = updated[index];
      const step = target.item.unit === 'Piece' ? 1 : 0.5;
      const newQty = target.qty + (delta * step);
      if (newQty <= 0) {
        const remaining = prev.filter((_, i) => i !== index);
        if (remaining.length === 0) setShowMobileCartModal(false);
        return remaining;
      }
      updated[index] = {
        ...target,
        qty: Number(newQty.toFixed(2)),
        amount: Number((newQty * target.rate).toFixed(2))
      };
      return updated;
    });
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSearchCustomer('');
  };

  const handleSearchAppCustomer = async () => {
    if (!appQuery.trim()) return;
    setAppSearchLoading(true);
    setAppSearchNotice('');
    try {
      const results = await searchRegisteredCustomer(appQuery.trim());
      setAppSearchResults(results);
      if (results.length === 0) {
        setAppSearchNotice('No active customer account found with that Email, Short ID, or Phone number on GI SHOP.');
      }
    } catch (e) {
      setAppSearchNotice('Error searching registered customer.');
    } finally {
      setAppSearchLoading(false);
    }
  };

  const handleAssignAppCustomer = async (user) => {
    try {
      await saveCustomer({
        phone: user.phone,
        customerShortId: user.shortId,
        customerEmail: user.email,
        name: user.name,
        address: ''
      });
      const updatedList = await getCustomers();
      setCustomers(updatedList);
      const newlySaved = updatedList.find(c => (c.phone === user.phone) || (c.shortId === user.shortId));
      handleSelectCustomer(newlySaved || { name: user.name, phone: user.phone, shortId: user.shortId, email: user.email });
      setShowAppSearchModal(false);
      setAppQuery('');
      setAppSearchResults([]);
    } catch (e) {
      alert('Failed to link customer to Khata.');
    }
  };

  const handleCheckout = async () => {
    if (paymentMethod === 'Add to Book') {
      if (!selectedCustomer) {
        alert('Khata Credit Billing Error: "Add to Book" requires selecting a registered app customer with a Short ID / Email.');
        return;
      }
      if (!selectedCustomer.shortId) {
        alert('Khata Restriction: "Add to Book" (Khata credit) is strictly restricted to app-registered customers with a Short ID / Email. Walk-in customers without an app account cannot be added to Khata.\n\nPlease click "Link Email / Short ID" to search and assign the customer\'s app account.');
        return;
      }
    }
    
    const sanitizedNote = saleNote.slice(0, 20);

    const sale = {
      customerPhone: selectedCustomer ? (selectedCustomer.phone || selectedCustomer.customerPhone) : '',
      customerShortId: selectedCustomer ? (selectedCustomer.shortId || '') : '',
      customerEmail: selectedCustomer ? (selectedCustomer.email || selectedCustomer.customerEmail || '') : '',
      itemsJSON: JSON.stringify(cart),
      subtotal, 
      discount, 
      total: finalTotal, 
      paymentMethod,
      note: sanitizedNote
    };
    
    try {
      const saved = await saveSale(sale);
      setShowMobileCartModal(false);
      setReceiptData({ ...sale, id: saved.id, date: saved.date, items: cart });
      if (onSaleComplete) onSaleComplete();
      if (onClearPrefill) onClearPrefill();
    } catch (e) {
      alert(e.message || 'Error saving sale');
    }
  };

  const resetPOS = () => {
    setCart([]); 
    setDiscount(0); 
    setSelectedCustomer(null); 
    setSearchCustomer(''); 
    setReceiptData(null); 
    setItemSearch('');
    setSaleNote('');
    setShowMobileCartModal(false);
    if (onClearPrefill) onClearPrefill();
  };

  if (receiptData) {
    return (
      <div className="panel" style={{ maxWidth: '420px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 0.5rem 0' }}>Sale Receipt</h2>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          <div>Bill No: #{receiptData.id}</div>
          <div>Date: {new Date(receiptData.date).toLocaleString()}</div>
          {receiptData.customerPhone && (
            <div>Customer: {receiptData.customerPhone} {receiptData.customerShortId ? `(${receiptData.customerShortId})` : ''}</div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Item</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {receiptData.items.map((c, i) => (
              <tr key={i}>
                <td style={{ padding: '0.5rem 0' }}>{c.item.name}<br/><small style={{ color: 'var(--text-muted)' }}>@{c.rate}/{c.item.unit}</small></td>
                <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{c.qty}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{c.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1rem', fontSize: '0.9rem' }}>
          <div className="flex-between"><span>Subtotal:</span> <span>₹{receiptData.subtotal.toFixed(2)}</span></div>
          {receiptData.discount > 0 && <div className="flex-between"><span>Discount:</span> <span>-₹{receiptData.discount.toFixed(2)}</span></div>}
          <div className="flex-between" style={{ fontWeight: '700', fontSize: '1.2rem', marginTop: '0.5rem' }}>
            <span>Total:</span> <span>₹{receiptData.total.toFixed(2)}</span>
          </div>
          <div className="flex-between" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            <span>Paid via:</span> <span>{receiptData.paymentMethod}</span>
          </div>
          {receiptData.note && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6366f1', background: '#eef2ff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              Note: "{receiptData.note}"
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button 
            type="button" 
            className="btn" 
            style={{ background: '#25D366', color: '#fff', borderColor: '#25D366', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }} 
            onClick={() => {
              const rawPhone = (selectedCustomer?.phone || receiptData.customerPhone || '').toString().trim();
              const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
              const targetPhone = cleanPhone ? `91${cleanPhone}` : '';
              const shopName = receiptData.shopName || 'GI SHOP';
              const totalAmt = receiptData.total.toFixed(2);
              const billId = receiptData.id || 'N/A';

              const itemLines = receiptData.items.map(c => `• ${c.item.name} x${c.qty} - ₹${c.amount.toFixed(2)}`).join('\n');
              const message = `Thank you for shopping with ${shopName}.\nHere is your invoice for today’s purchase.\n\n📄 *Bill #${billId}*\n\n*ITEMS:*\n${itemLines}\n\n*Total Amount:* ₹${totalAmt} (${receiptData.paymentMethod || 'Paid'})\n\nPlease find your bill attached as a PDF.\nWe hope to see you again.`;

              const encodedMsg = encodeURIComponent(message);
              const whatsappUrl = targetPhone 
                ? `https://wa.me/${targetPhone}?text=${encodedMsg}` 
                : `https://api.whatsapp.com/send?text=${encodedMsg}`;

              window.open(whatsappUrl, '_blank');
            }}
          >
            <MessageSquare size={18} /> Share Bill on WhatsApp {selectedCustomer?.phone ? `(${selectedCustomer.phone})` : ''}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>Print / Save PDF</button>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={resetPOS}>New Bill</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Customer Account Card (Matches Native App Image 1) */}
      <div className="pos-mobile-section-card mobile-only-block">
        <div className="pos-mobile-card-header">
          <div className="pos-mobile-card-title">
            <UserCheck size={18} color="var(--primary)" />
            <span>Customer Account</span>
          </div>
          {selectedCustomer && (
            <button 
              type="button" 
              onClick={handleClearCustomer}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="pos-mobile-customer-input-row">
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text"
              className="pos-mobile-customer-input"
              placeholder="Enter Phone or Name (Optional)"
              value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || selectedCustomer.customerPhone})` : searchCustomer}
              onChange={e => {
                setSearchCustomer(e.target.value);
                setSelectedCustomer(null);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
            />
          </div>

          <button 
            type="button" 
            className="pos-mobile-customer-btn"
            onClick={() => { setShowAppSearchModal(true); setShowCustomerDropdown(false); }}
            title="Link Customer Account"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Dropdown for customer search on mobile */}
        {showCustomerDropdown && searchCustomer && !selectedCustomer && (
          <div className="panel" style={{ marginTop: '0.4rem', padding: '0.5rem', maxHeight: '240px', overflowY: 'auto', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: '10px' }}>
            {filteredCustomers.map(c => (
              <div 
                key={c.id || c.phone} 
                style={{ padding: '0.55rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }} 
                onClick={() => handleSelectCustomer(c)}
              >
                <strong>{c.name}</strong> • 📞 {c.phone} {c.shortId ? <span style={{ color: 'var(--primary)', fontWeight: '700', marginLeft: '4px' }}>(ID: {c.shortId})</span> : '(Walk-in)'}
              </div>
            ))}

            {inlineAppResults.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '0.5rem', marginTop: '0.35rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  🌐 Registered GI SHOP Accounts ({inlineAppResults.length})
                </div>
                {inlineAppResults.map(user => (
                  <div 
                    key={user.id} 
                    style={{ 
                      padding: '0.45rem', 
                      cursor: 'pointer', 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0', 
                      marginBottom: '0.35rem', 
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => handleAssignAppCustomer(user)}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                        {user.name} <span className="badge" style={{ fontSize: '0.68rem' }}>{user.shortId}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {user.phone}</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-success" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: '700' }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!filteredCustomers.find(c => (c.phone || c.customerPhone) === searchCustomer) && (
              <div 
                style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600' }} 
                onClick={handleAddNewCustomer}
              >
                + Add "{searchCustomer}" as Walk-in Customer
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pos-billing-grid">
        {/* Product Catalog Column */}
        <div className="panel pos-catalog-panel pos-mobile-section-card">
          <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Search size={20} color="var(--text-muted)" />
              <input 
                type="text" 
                className="input" 
                style={{ margin: 0, flex: 1, fontSize: '0.95rem', padding: '0.65rem 0.85rem', borderRadius: '10px' }} 
                placeholder="Search products (e.g. Milk, Rice)..." 
                value={itemSearch} 
                onChange={e => setItemSearch(e.target.value)} 
              />
              {itemSearch && (
                <button 
                  type="button" 
                  onClick={() => setItemSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          
          {items.length === 0 ? (
            <ProductGridSkeleton count={8} />
          ) : (
              <div className="pos-product-catalog-grid">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    className="pos-product-card" 
                    onClick={() => openModal(item)}
                  >
                    <div className="pos-product-card-name">{item.name}</div>
                    <div className="pos-product-card-badge">
                      ₹{Number(item.price).toFixed(2)} / {item.unit}
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    No matching products found
                  </div>
                )}
              </div>
          )}
        </div>

      {/* POS Cart & Payment Panel */}
      <div className="panel pos-cart-panel">
        
        {/* Customer Search & Selection */}
        <div style={{ position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <input 
              type="text" 
              className="input" 
              style={{ margin: 0, flex: 1, fontSize: '0.9rem' }} 
              placeholder="Search Saved Customer (Phone, Short ID, Name)" 
              value={searchCustomer} 
              onChange={e => { setSearchCustomer(e.target.value); setShowCustomerDropdown(true); setSelectedCustomer(null); }} 
              onFocus={() => setShowCustomerDropdown(true)} 
            />
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => { setShowAppSearchModal(true); setShowCustomerDropdown(false); }}
            >
              <UserCheck size={14} /> Link Email / Short ID
            </button>
          </div>

          {selectedCustomer && (
            <div style={{ 
              padding: '0.5rem 0.75rem', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: selectedCustomer.shortId ? '#ecfdf5' : '#fff7ed',
              border: `1px solid ${selectedCustomer.shortId ? '#6ee7b7' : '#fdba74'}`
            }}>
              <div>
                <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone || selectedCustomer.customerPhone})
                {selectedCustomer.shortId ? (
                  <span className="badge" style={{ background: '#10b981', color: '#fff', marginLeft: '0.4rem' }}>
                    Short ID: {selectedCustomer.shortId} (Khata Eligible)
                  </span>
                ) : (
                  <span className="badge" style={{ background: '#f97316', color: '#fff', marginLeft: '0.4rem' }}>
                    Walk-in (Cash/Online Only)
                  </span>
                )}
              </div>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCustomer(null); setSearchCustomer(''); }} />
            </div>
          )}

          {showCustomerDropdown && searchCustomer && !selectedCustomer && (
            <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '0.5rem', maxHeight: '280px', overflowY: 'auto', background: '#fff', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: '10px' }}>
              {/* Local Saved Shop Customers */}
              {filteredCustomers.map(c => (
                <div key={c.id || c.phone} style={{ padding: '0.55rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleSelectCustomer(c)}>
                  <strong>{c.name}</strong> • 📞 {c.phone} {c.shortId ? <span style={{ color: 'var(--primary)', fontWeight: '700', marginLeft: '4px' }}>(ID: {c.shortId})</span> : '(Walk-in)'}
                </div>
              ))}

              {/* Registered GI SHOP Accounts matching query (e.g. rajjgd59) */}
              {inlineAppResults.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '0.5rem', marginTop: '0.35rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                    🌐 Registered GI SHOP App Accounts ({inlineAppResults.length})
                  </div>
                  {inlineAppResults.map(user => (
                    <div 
                      key={user.id} 
                      style={{ 
                        padding: '0.5rem', 
                        cursor: 'pointer', 
                        borderRadius: '6px', 
                        border: '1px solid #e2e8f0', 
                        marginBottom: '0.35rem', 
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => handleAssignAppCustomer(user)}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>
                          {user.name} 
                          <span className="badge" style={{ background: user.role === 'Shopkeeper' ? '#f5f3ff' : '#eff6ff', color: user.role === 'Shopkeeper' ? '#7c3aed' : 'var(--primary)', fontSize: '0.7rem', marginLeft: '6px' }}>
                            {user.role === 'Shopkeeper' ? 'Shopkeeper' : 'Customer'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ID: <strong style={{ color: 'var(--primary)' }}>{user.shortId}</strong> • 📞 {user.phone}
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="btn btn-success" 
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}
                        onClick={(e) => { e.stopPropagation(); handleAssignAppCustomer(user); }}
                      >
                        Link &amp; Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {inlineAppLoading && (
                <div style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Searching GI SHOP registered accounts...
                </div>
              )}

              {!filteredCustomers.find(c => (c.phone || c.customerPhone) === searchCustomer) && (
                <div style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem' }} onClick={handleAddNewCustomer}>
                  + Add "{searchCustomer}" as Walk-in Customer (No Khata)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Itemized Table */}
        <div style={{ flex: 1, overflowY: 'auto', margin: '0.5rem 0' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.9rem' }}>
              Cart is empty. Tap items to add.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '0.35rem' }}>Item</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.35rem' }}>Qty</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.35rem' }}>₹</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.4rem 0' }}>{c.item.name}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>{c.qty}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>{c.amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>
                      <Trash2 size={15} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => removeCartItem(i)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals, Optional Note & Checkout */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex-between" style={{ marginBottom: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>Discount (₹):</span>
            <input 
              type="number" 
              className="input" 
              style={{ width: '90px', margin: 0, padding: '0.2rem 0.4rem', fontSize: '0.85rem' }} 
              value={discount} 
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <input 
              type="text" 
              maxLength={20}
              className="input" 
              style={{ margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} 
              placeholder="Optional Note (max 20 chars)..." 
              value={saleNote} 
              onChange={e => setSaleNote(e.target.value)} 
            />
          </div>

          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>Total:</span>
            <span style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--success)' }}>₹{finalTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {['Cash', 'Online', 'Add to Book'].map(m => (
              <button 
                key={m} 
                type="button"
                className={`btn ${paymentMethod === m ? '' : 'btn-outline'}`} 
                style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', minWidth: '70px' }} 
                onClick={() => setPaymentMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <button 
            type="button"
            className="btn" 
            style={{ width: '100%', fontSize: '1.1rem', padding: '0.85rem' }} 
            onClick={handleCheckout}
          >
            Complete Bill
          </button>
        </div>
      </div>

      {/* Floating Bottom Cart Banner (Sticky above Nav Bar on Mobile) */}
      {cart.length > 0 && (
        <div className="pos-mobile-cart-banner-wrap mobile-only-block">
          <div 
            className="pos-mobile-cart-banner"
            onClick={() => setShowMobileCartModal(true)}
          >
            <div className="pos-mobile-cart-left">
              <div className="pos-mobile-cart-icon-box">
                <ShoppingCart size={20} color="#ffffff" />
                <div className="pos-mobile-cart-badge-pill">{cart.length}</div>
              </div>
              <div>
                <div className="pos-mobile-cart-count-text">
                  {cart.length} {cart.length === 1 ? 'Item' : 'Items'} in Cart
                </div>
                <div className="pos-mobile-cart-total-text">₹{finalTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="pos-mobile-cart-right">
              <span>View Cart</span>
              <ArrowRight size={17} color="#ffffff" />
            </div>
          </div>
        </div>
      )}

      {/* Full Interactive Cart & Checkout Modal / Bottom Sheet */}
      {showMobileCartModal && (
        <div className="mobile-cart-sheet-overlay" onClick={() => setShowMobileCartModal(false)}>
          <div className="mobile-cart-sheet" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="mobile-cart-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                <ShoppingCart size={20} color="var(--primary)" />
                <span>Order Cart ({cart.length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {cart.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => { setCart([]); setShowMobileCartModal(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowMobileCartModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="mobile-cart-scroll">
              {/* Billing Customer Card */}
              <div 
                className="mobile-cart-customer-card" 
                onClick={() => setShowAppSearchModal(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <UserCheck size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Billing Customer</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                      {selectedCustomer 
                        ? `${selectedCustomer.name} (${selectedCustomer.phone || selectedCustomer.customerPhone})` 
                        : 'Walk-in / Cash Customer'}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedCustomer ? 'Edit ✏️' : '+ Add'}
                </span>
              </div>

              {/* Items in Bill list with Steppers */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Items in Bill
                </div>
                {cart.map((c, i) => (
                  <div key={i} className="mobile-cart-item-row">
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ₹{c.rate} / {c.item.unit}
                      </div>
                    </div>

                    {/* Stepper buttons */}
                    <div className="mobile-cart-stepper">
                      <button 
                        type="button" 
                        className="mobile-cart-stepper-btn"
                        onClick={() => updateCartQty(i, -1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="mobile-cart-stepper-val">
                        {c.qty} {c.item.unit}
                      </span>
                      <button 
                        type="button" 
                        className="mobile-cart-stepper-btn"
                        onClick={() => updateCartQty(i, 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: '60px', textAlign: 'right' }}>
                      ₹{c.amount.toFixed(2)}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeCartItem(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Calculations & Discount */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span style={{ fontWeight: 700 }}>₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Discount (Flat ₹):</span>
                  <input 
                    type="number" 
                    className="input" 
                    style={{ width: '90px', margin: 0, padding: '0.25rem 0.45rem', fontSize: '0.85rem', textAlign: 'right', borderRadius: '6px' }} 
                    value={discount || ''} 
                    placeholder="0.00"
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
                  />
                </div>

                <div style={{ marginBottom: '0.4rem' }}>
                  <input 
                    type="text" 
                    maxLength={20}
                    className="input" 
                    style={{ margin: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }} 
                    placeholder="Optional Note (max 20 chars)..." 
                    value={saleNote} 
                    onChange={e => setSaleNote(e.target.value)} 
                  />
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>TOTAL PAYABLE</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Payment Method
              </div>
              <div className="mobile-cart-payment-grid">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Online', label: 'Online / UPI', icon: CreditCard },
                  { id: 'Add to Book', label: 'Add to Book', icon: BookOpen },
                ].map(m => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button 
                      key={m.id}
                      type="button" 
                      className={`mobile-cart-payment-btn ${active ? 'active' : ''}`}
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id === 'Add to Book' && !selectedCustomer) {
                          alert('Khata credit requires customer details. Please link or select a customer.');
                          setShowAppSearchModal(true);
                        }
                      }}
                    >
                      <Icon size={18} color={active ? 'var(--primary)' : 'var(--text-muted)'} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Complete Bill CTA Button */}
              <button 
                type="button" 
                className="btn btn-success" 
                style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 800, borderRadius: '12px', gap: '0.5rem', marginTop: '0.25rem' }}
                onClick={handleCheckout}
              >
                <Check size={20} /> Complete Bill • ₹{finalTotal.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Quantity Modal */}
      {selectedProduct && (
        <div className="modal-overlay">
          <div className="panel modal-dialog" style={{ width: '400px', maxWidth: '100%', padding: '1.25rem' }}>
            <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
              <h2 className="title" style={{ margin: 0, fontSize: '1.25rem' }}>{selectedProduct.name}</h2>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedProduct(null)} />
            </div>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>Rate: ₹{selectedProduct.price} / {selectedProduct.unit}</p>

            {selectedProduct.unit === 'Piece' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', margin: '1.5rem 0' }}>
                <button type="button" className="btn btn-outline" style={{ fontSize: '1.4rem', width: '45px', height: '45px' }} onClick={() => handleSetPresetQty(Math.max(1, qtyInput - 1))}>-</button>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', width: '50px', textAlign: 'center' }}>{qtyInput}</span>
                <button type="button" className="btn btn-outline" style={{ fontSize: '1.4rem', width: '45px', height: '45px' }} onClick={() => handleSetPresetQty(qtyInput + 1)}>+</button>
              </div>
            )}
            {(selectedProduct.unit === 'Kilo' || selectedProduct.unit === 'Litre') && (
              <>
                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {selectedProduct.unit === 'Kilo' ? (
                    <>
                      <QuickButton label="50g" onClick={() => handleSetPresetQty(0.05)} />
                      <QuickButton label="100g" onClick={() => handleSetPresetQty(0.1)} />
                      <QuickButton label="250g" onClick={() => handleSetPresetQty(0.25)} />
                      <QuickButton label="500g" onClick={() => handleSetPresetQty(0.5)} />
                      <QuickButton label="1 kg" onClick={() => handleSetPresetQty(1)} />
                      <QuickButton label="2 kg" onClick={() => handleSetPresetQty(2)} />
                    </>
                  ) : (
                    <>
                      <QuickButton label="200ml" onClick={() => handleSetPresetQty(0.2)} />
                      <QuickButton label="250ml" onClick={() => handleSetPresetQty(0.25)} />
                      <QuickButton label="500ml" onClick={() => handleSetPresetQty(0.5)} />
                      <QuickButton label="1 Litre" onClick={() => handleSetPresetQty(1)} />
                      <QuickButton label="2 Litre" onClick={() => handleSetPresetQty(2)} />
                    </>
                  )}
                </div>

                <div className="grid grid-2" style={{ gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <div>
                    {/* Quantity Header Row with Compact Unit Toggle */}
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                        Quantity
                      </label>
                      <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: (subUnitMode === 'Kilo' || subUnitMode === 'Litre') ? '700' : '500',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: (subUnitMode === 'Kilo' || subUnitMode === 'Litre') ? 'var(--primary)' : 'transparent',
                            color: (subUnitMode === 'Kilo' || subUnitMode === 'Litre') ? '#fff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleToggleSubUnitMode(selectedProduct.unit === 'Litre' ? 'Litre' : 'Kilo')}
                        >
                          {selectedProduct.unit === 'Litre' ? 'Litre' : 'Kilo'}
                        </button>
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: (subUnitMode === 'Gram' || subUnitMode === 'ML') ? '700' : '500',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: (subUnitMode === 'Gram' || subUnitMode === 'ML') ? 'var(--primary)' : 'transparent',
                            color: (subUnitMode === 'Gram' || subUnitMode === 'ML') ? '#fff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleToggleSubUnitMode(selectedProduct.unit === 'Litre' ? 'ML' : 'Gram')}
                        >
                          {selectedProduct.unit === 'Litre' ? 'ML' : 'Gram'}
                        </button>
                      </div>
                    </div>

                    <input 
                      type="number" 
                      className="input" 
                      step="any" 
                      style={{ margin: 0 }}
                      value={displayQty} 
                      onChange={e => handleDisplayQtyChange(e.target.value)} 
                      placeholder={subUnitMode === 'Gram' ? 'e.g. 250' : (subUnitMode === 'ML' ? 'e.g. 500' : 'e.g. 1.5')}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px', height: '20px', lineHeight: '20px' }}>
                      Amount (₹)
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      step="any" 
                      style={{ margin: 0 }}
                      value={priceInput} 
                      onChange={e => handlePriceChange(e.target.value)} 
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              </>
            )}
            <button type="button" className="btn" style={{ width: '100%', fontSize: '1.1rem', marginTop: '0.5rem' }} onClick={addToCart}>
              Add {qtyInput} {selectedProduct.unit} (₹{parseFloat(priceInput || 0).toFixed(2)}) to Cart
            </button>
          </div>
        </div>
      )}

      {/* App Registered Customer Link Modal */}
      {showAppSearchModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserCheck size={20} color="var(--primary)" /> Assign Registered App Customer
              </h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowAppSearchModal(false)} />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1rem' }}>
              Search GI SHOP customer by their <strong>Email ID</strong> or <strong>Short ID</strong> (e.g. <code>ayu32</code>) to link them to Khata.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="input" 
                style={{ margin: 0, flex: 1 }}
                placeholder="Enter Email ID or Short ID (e.g. ayu32)..." 
                value={appQuery} 
                onChange={e => setAppQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchAppCustomer()}
              />
              <button type="button" className="btn" onClick={handleSearchAppCustomer} disabled={appSearchLoading}>
                {appSearchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {appSearchNotice && (
              <div style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', color: '#c2410c', marginBottom: '1rem' }}>
                {appSearchNotice}
              </div>
            )}

            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {appSearchResults.map(user => (
                <div 
                  key={user.id} 
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border)', 
                    marginBottom: '0.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: '#f8fafc' 
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {user.name} 
                      <span className="badge" style={{ background: user.role === 'Shopkeeper' ? '#f5f3ff' : '#eff6ff', color: user.role === 'Shopkeeper' ? '#7c3aed' : 'var(--primary)', fontSize: '0.72rem' }}>
                        {user.role === 'Shopkeeper' ? 'Shopkeeper' : 'Customer'}
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem' }}>ID: {user.shortId}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      📞 <strong>{user.phone}</strong> {user.email ? `• ✉️ ${user.email}` : ''} {user.city ? `• 📍 ${user.city}` : ''}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 700 }}
                    onClick={() => handleAssignAppCustomer(user)}
                  >
                    Select &amp; Link
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAppSearchModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
