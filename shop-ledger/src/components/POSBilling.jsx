import React, { useState, useEffect } from 'react';
import { getCustomers, saveCustomer, saveSale } from '../lib/api';
import { Search, Plus, Trash2, X, Receipt } from 'lucide-react';

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

  const removeCartItem = (index) => setCart(cart.filter((_, i) => i !== index));

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    if (paymentMethod === 'Add to Book' && !selectedCustomer) return alert('You must select a customer to Add to Book.');
    
    const sanitizedNote = saleNote.slice(0, 20);

    const sale = {
      customerPhone: selectedCustomer ? (selectedCustomer.phone || selectedCustomer.customerPhone) : '',
      customerShortId: selectedCustomer ? (selectedCustomer.shortId || '') : '',
      itemsJSON: JSON.stringify(cart),
      subtotal, 
      discount, 
      total: finalTotal, 
      paymentMethod,
      note: sanitizedNote
    };
    
    try {
      const saved = await saveSale(sale);
      setReceiptData({ ...sale, id: saved.id, date: saved.date, items: cart });
      if (onSaleComplete) onSaleComplete();
      if (onClearPrefill) onClearPrefill();
    } catch (e) {
      alert('Error saving sale');
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

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>Print</button>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={resetPOS}>New Bill</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-billing-grid">
      {/* Product Catalog Column */}
      <div className="panel pos-catalog-panel">
        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              className="input" 
              style={{ margin: 0, flex: 1, fontSize: '1.1rem', padding: '0.75rem' }} 
              placeholder="Search products to bill..." 
              value={itemSearch} 
              onChange={e => setItemSearch(e.target.value)} 
            />
          </div>
        </div>
        
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="panel" 
              style={{ cursor: 'pointer', padding: '0.85rem', textAlign: 'center', transition: 'transform 0.1s', border: '1px solid var(--border)', background: '#fff' }} 
              onClick={() => openModal(item)}
            >
              <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.35rem' }}>{item.name}</div>
              <div className="badge">₹{item.price} / {item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Cart & Payment Panel */}
      <div className="panel pos-cart-panel">
        
        {/* Customer Search by Short ID or Phone */}
        <div style={{ position: 'relative', zIndex: 20 }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search Customer (Phone, Short ID, Name)" 
            value={searchCustomer} 
            onChange={e => { setSearchCustomer(e.target.value); setShowCustomerDropdown(true); setSelectedCustomer(null); }} 
            onFocus={() => setShowCustomerDropdown(true)} 
          />
          {showCustomerDropdown && searchCustomer && (
            <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '0.5rem', maxHeight: '200px', overflowY: 'auto', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {filteredCustomers.map(c => (
                <div key={c.id || c.phone} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleSelectCustomer(c)}>
                  <strong>{c.name}</strong> • {c.phone} {c.shortId ? `(${c.shortId})` : ''}
                </div>
              ))}
              {!filteredCustomers.find(c => (c.phone || c.customerPhone) === searchCustomer) && (
                <div style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--success)', fontSize: '0.85rem' }} onClick={handleAddNewCustomer}>
                  + Add "{searchCustomer}" as new customer
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
    </div>
  );
}
