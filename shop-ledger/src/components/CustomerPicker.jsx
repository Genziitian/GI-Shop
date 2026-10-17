import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { getCustomers, linkCustomerAccount, searchRegisteredCustomer } from '../lib/api';
import { customerDraftFromQuery, getCustomerPhone, getCustomerShortId, mergeCustomerResults } from '../lib/customerSearch';
import './CustomerPicker.css';

const EMPTY_CUSTOMERS = [];

export default function CustomerPicker({ customers = EMPTY_CUSTOMERS, initialQuery = '', initialLinkTarget = null, onClose, onSelect, onSave }) {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState(initialLinkTarget ? getCustomerPhone(initialLinkTarget) : initialQuery);
  const [saved, setSaved] = useState(customers);
  const [accounts, setAccounts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [savedError, setSavedError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState({ name: '', phone: '', address: '' });
  const [linkTarget, setLinkTarget] = useState(initialLinkTarget);
  const [confirmation, setConfirmation] = useState(null);
  const dialog = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => { setSaved(customers); }, [customers]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    return () => previousFocus?.focus();
  }, []);
  useEffect(() => {
    let current = true;
    setLoadingSaved(true); setSavedError('');
    getCustomers().then(data => { if (current) setSaved(data); })
      .catch(e => { if (current) setSavedError(e.message || 'Could not refresh saved customers.'); })
      .finally(() => { if (current) setLoadingSaved(false); });
    return () => { current = false; };
  }, [retry]);
  useEffect(() => {
    let current = true;
    setAccounts([]); setSearchError('');
    if (mode !== 'search' || query.trim().length < 2) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      searchRegisteredCustomer(query.trim()).then(data => { if (current) setAccounts(data || []); })
        .catch(e => { if (current) setSearchError(e.message || 'Could not search GI SHOP accounts.'); })
        .finally(() => { if (current) setSearching(false); });
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  }, [query, mode, retry]);

  const results = (linkTarget
    ? accounts.map(c => ({ ...c, _needsSave: true, _linkExistingPhone: getCustomerPhone(linkTarget) }))
    : mergeCustomerResults(saved, accounts, query)).slice(0, 30);
  const close = () => { if (!busyRef.current) onClose(); };
  const select = async customer => {
    if (busyRef.current) return;
    if (customer._linkExistingPhone && confirmation !== customer) { setConfirmation(customer); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (customer._linkExistingPhone) {
        const response = await linkCustomerAccount({ phone: customer._linkExistingPhone, customerId: getCustomerShortId(customer), email: customer.email || customer.customerEmail });
        await onSelect({ ...(linkTarget || customer), ...response.customer, shortId: response.customer.customerShortId });
      } else if (!customer._needsSave) await onSelect(customer);
      else await onSave({ phone: getCustomerPhone(customer), name: customer.name, address: customer.address || '', customerShortId: getCustomerShortId(customer) || undefined, customerEmail: customer.email || customer.customerEmail || undefined });
      onClose();
    } catch (e) { setError(e.message || 'Could not select this customer. Please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const addNew = () => {
    setDraft({ ...customerDraftFromQuery(query), address: '' }); setError(''); setMode('new');
  };
  const saveNew = async event => {
    event.preventDefault();
    if (busyRef.current) return;
    const phone = draft.phone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return setError('Enter a valid 10-digit mobile number.');
    if (!draft.name.trim()) return setError('Enter the customer name.');
    if (saved.some(c => getCustomerPhone(c).replace(/\D/g, '').slice(-10) === phone)) {
      setMode('search'); setQuery(phone); setError('This phone is already saved. Select the customer below.'); return;
    }
    busyRef.current = true; setBusy(true); setError('');
    try { await onSave({ name: draft.name.trim(), phone, address: draft.address.trim() }); onClose(); }
    catch (e) { setError(e.message || 'Could not save this customer. Please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const back = () => { setMode('search'); setLinkTarget(null); setConfirmation(null); setError(''); };
  const handleKeys = event => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return <div className="modal-overlay cp-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-picker-title" ref={dialog} onKeyDown={handleKeys}>
      <header className="cp-header">
        <div className="cp-heading">{mode === 'new' || linkTarget || confirmation ? <button type="button" className="cp-icon" aria-label="Back to customer search" onClick={back} disabled={busy}><ArrowLeft size={20} /></button> : <UserCheck size={22} />}
          <h2 id="customer-picker-title">{confirmation || linkTarget ? 'Connect app account' : mode === 'new' ? 'New customer' : 'Choose customer'}</h2>
        </div>
        <button type="button" className="cp-icon" aria-label="Close customer picker" onClick={close} disabled={busy}><X size={20} /></button>
      </header>
      <div className="cp-body">
        {confirmation ? <>
          <p>Connect past bills and any existing Khata for <strong>{linkTarget?.name || confirmation.name}</strong> ({confirmation._linkExistingPhone}) to this GI SHOP account?</p>
          <div className="cp-notice"><strong>{confirmation._appAccountName || confirmation.name}</strong><br />{getCustomerPhone(confirmation)} · ID {getCustomerShortId(confirmation)}</div>
          <p className="cp-muted">Check that this is the same person. Connecting an account does not create new credit.</p>
          {!!error && <p className="cp-error" role="alert">{error}</p>}
          <button type="button" autoFocus className="cp-primary" disabled={busy} onClick={() => select(confirmation)}>{busy ? 'Connecting…' : 'Connect & select customer'}</button>
        </> : mode === 'search' ? <>
          <p className="cp-subtitle">{linkTarget ? `Find ${linkTarget.name}'s registered account to connect their past bills and any existing Khata.` : 'Find a saved customer or someone on GI SHOP.'}</p>
          <div className="cp-search"><Search size={18} /><input autoFocus aria-label="Search customers" placeholder="Name, phone or Customer ID" value={query} onChange={event => { setQuery(event.target.value); setError(''); }} disabled={busy} autoComplete="off" />{(searching || loadingSaved) && <span role="status" className="cp-muted">Searching…</span>}</div>
          {query.trim().length === 1 && <p className="cp-muted">Type at least 2 characters to search GI SHOP accounts.</p>}
          {!!(searchError || savedError) && <div className="cp-notice"><p className="cp-error" role="alert">{searchError || savedError} Saved results may still be available.</p><button type="button" className="cp-text" disabled={busy} onClick={() => setRetry(n => n + 1)}>Retry search</button></div>}
          {!!error && <p className="cp-error" role="alert">{error}</p>}
          <p className="cp-label">{linkTarget ? 'Registered app accounts' : query.trim() ? 'Matching customers' : 'Saved customers'}</p>
          <div aria-live="polite">{results.map((customer, index) => <div className="cp-row" key={`${getCustomerShortId(customer)}:${getCustomerPhone(customer)}:${index}`}>
            <button type="button" className="cp-choice" disabled={busy} onClick={() => select(customer)} aria-label={`Select ${customer.name}, ${getCustomerPhone(customer)}`}>
              <span className="cp-avatar">{(customer.name || '?').slice(0, 1).toUpperCase()}</span>
              <span className="cp-person"><strong>{customer.name}</strong><span>{getCustomerPhone(customer)}{getCustomerShortId(customer) ? ` · ${getCustomerShortId(customer)}` : ''}</span><small className={getCustomerShortId(customer) ? 'cp-linked' : 'cp-cash'}>{getCustomerShortId(customer) ? 'GI SHOP account' : 'Cash / Online only'}</small></span><ChevronRight size={17} />
            </button>
            {!getCustomerShortId(customer) && <button type="button" className="cp-text cp-connect" disabled={busy} onClick={() => { setLinkTarget(customer); setQuery(getCustomerPhone(customer)); setError(''); }}>Connect app</button>}
          </div>)}</div>
          {!results.length && !searching && !loadingSaved && !searchError && !savedError && <p className="cp-empty">{query.trim() ? 'No matching customers found.' : 'No saved customers yet. Search GI SHOP or add someone new.'}</p>}
          {!linkTarget && <><button type="button" className="cp-add" disabled={busy} onClick={addNew}><UserPlus size={18} /> Add new customer</button><button type="button" className="cp-skip" disabled={busy} onClick={close}>Close</button></>}
          {busy && <p role="status">Selecting customer…</p>}
        </> : <form onSubmit={saveNew}>
          <p className="cp-subtitle">Save their details once for faster billing next time.</p>
          <label className="cp-field">Customer name *<input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Ramesh Kumar" required disabled={busy} /></label>
          <label className="cp-field">Phone number *<input type="tel" inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} placeholder="10-digit mobile number" required disabled={busy} /></label>
          <label className="cp-field">Address / area (optional)<input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="e.g. Gandhi Nagar" disabled={busy} /></label>
          <p className="cp-notice cp-muted">Cash / Online billing is available. For Khata credit, select or link their registered GI SHOP account.</p>
          {!!error && <p className="cp-error" role="alert">{error}</p>}
          <button className="cp-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save & select customer'}</button>
        </form>}
      </div>
    </section>
  </div>;
}
