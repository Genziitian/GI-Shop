import React from 'react';

export function ShopCardSkeleton({ count = 3 }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '55%', margin: 0 }} />
            <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          <div className="skeleton skeleton-text" style={{ width: '65%' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div className="skeleton skeleton-button" style={{ flex: 1 }} />
            <div className="skeleton skeleton-button" style={{ flex: 1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ padding: '0.85rem', alignItems: 'center', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '80%', height: '1.2rem', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ width: '60%', height: '1.5rem', borderRadius: '12px' }} />
        </div>
      ))}
    </div>
  );
}

export function CustomerListSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: '0.35rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '25%', margin: 0 }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="skeleton skeleton-text" style={{ width: '70px', marginBottom: '0.25rem' }} />
            <div className="skeleton" style={{ width: '90px', height: '1.4rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderCardSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '35%', margin: 0 }} />
            <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text" style={{ width: '45%' }} />
          <div className="skeleton skeleton-button" style={{ height: '36px', width: '120px', marginTop: '0.25rem' }} />
        </div>
      ))}
    </div>
  );
}

export function KhataOverviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="skeleton-card" style={{ background: '#f8fafc', padding: '1.5rem', textAlign: 'center' }}>
        <div className="skeleton skeleton-text" style={{ width: '140px', margin: '0 auto 0.5rem auto' }} />
        <div className="skeleton" style={{ width: '180px', height: '2.5rem', margin: '0 auto', borderRadius: '8px' }} />
      </div>
      <ShopCardSkeleton count={3} />
    </div>
  );
}
