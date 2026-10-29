import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Search } from 'lucide-react';

export default function CityPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const list = options.filter(c => c.toLowerCase().includes(q.trim().toLowerCase()));
  const pick = (c) => { onChange(c); setOpen(false); setQ(''); };

  return (
    <div className="cp" ref={ref}>
      <button type="button" className="cp-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <MapPin size={15} />
        <span className="cp-label">City</span>
        <strong>{value}</strong>
        <ChevronDown size={15} className={open ? 'cp-flip' : ''} />
      </button>
      {open && (
        <>
          <div className="cp-scrim" onClick={() => setOpen(false)} />
          <div className="cp-menu" role="listbox">
            <div className="cp-search">
              <Search size={14} />
              <input autoFocus placeholder="Search city" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="cp-list">
              {list.map(c => (
                <button key={c} type="button" role="option" aria-selected={c === value} className={`cp-item ${c === value ? 'on' : ''}`} onClick={() => pick(c)}>
                  <span>{c}</span>
                  {c === value && <Check size={15} />}
                </button>
              ))}
              {list.length === 0 && <div className="cp-none">No city found</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
