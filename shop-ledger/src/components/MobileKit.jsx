import React from 'react';
import { ChevronRight } from 'lucide-react';
import logoImg from '../assets/logo.png';

// Phone-only building blocks. Hidden on desktop by .m-only (see mobile.css).

// Large-title app bar: small brand row + big screen title.
export function MobileTopBar({ right }) {
  return (
    <header className="m-only m-topbar">
      <div className="m-topbar-row">
        <img src={logoImg} alt="" className="m-logo" />
        <span className="m-brand">GI SHOP</span>
        <span className="m-spacer" />
        {right}
      </div>
    </header>
  );
}

// Grouped list (iOS "inset grouped"): optional small caps label + white rounded group.
export function MGroup({ label, children }) {
  return (
    <section className="m-group">
      {label && <div className="m-group-label">{label}</div>}
      <div className="m-group-body">{children}</div>
    </section>
  );
}

// One tappable row: tinted icon, title, optional value, chevron.
export function MRow({ icon, tint = 'green', title, value, onClick, danger = false, chevron = true, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`m-row ${danger ? 'm-row-danger' : ''}`} onClick={onClick}>
      {icon && <span className={`m-row-icon m-tint-${tint}`}>{icon}</span>}
      <span className="m-row-main">
        <span className="m-row-title">{title}</span>
        {value != null && value !== '' && <span className="m-row-value">{value}</span>}
      </span>
      {children}
      {onClick && chevron && <ChevronRight size={18} className="m-row-chevron" />}
    </Tag>
  );
}

// iOS segmented control.
export function MSegment({ options, value, onChange }) {
  return (
    <div className="m-segment" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Horizontally scrollable filter chips.
export function MChips({ options, value, onChange }) {
  return (
    <div className="m-chips">
      {options.map((o) => (
        <button key={o.value} type="button" className={`m-chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Big summary card (e.g. total due).
export function MHero({ label, value, meta, tone = 'green' }) {
  return (
    <div className={`m-hero m-hero-${tone}`}>
      <div className="m-hero-label">{label}</div>
      <div className="m-hero-value">{value}</div>
      {meta && <div className="m-hero-meta">{meta}</div>}
    </div>
  );
}
