import React from 'react';
import { X, CheckCircle2, Clock, PackageCheck, CreditCard, ShieldCheck, Check, AlertCircle, ShoppingBag } from 'lucide-react';

export default function OrderTimelineModal({ visible, order, onClose }) {
  if (!visible || !order) return null;

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.itemsJSON === 'string'
    ? JSON.parse(order.itemsJSON || '[]')
    : [];

  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : typeof order.timelineJSON === 'string'
    ? JSON.parse(order.timelineJSON || '[]')
    : [];

  // Fallback timeline if timelineJSON is not populated yet
  const displayTimeline = timeline.length > 0 ? timeline : [
    {
      title: 'Order Created',
      timestamp: order.createdAt || new Date().toISOString(),
      description: 'Customer placed the order',
      status: 'CREATED'
    },
    {
      title: 'Order Received by Shop',
      timestamp: order.createdAt || new Date().toISOString(),
      description: 'Order received by shopkeeper',
      status: 'RECEIVED'
    },
    ...(order.acceptedAt ? [{
      title: 'Order Accepted & Preparing',
      timestamp: order.acceptedAt,
      description: `Estimated preparation time: ${order.packingMinutes || 15} mins`,
      status: 'ACCEPTED'
    }] : []),
    ...(order.status === 'READY' || order.status === 'COMPLETED' ? [{
      title: 'Order Ready for Pickup',
      timestamp: order.acceptedAt || order.createdAt,
      description: 'Order packed and ready for pickup',
      status: 'READY'
    }] : []),
    ...(order.paymentRequested ? [{
      title: 'Payment Requested',
      timestamp: order.acceptedAt || order.createdAt,
      description: `Requested ₹${(order.requestedAmount || order.estimatedTotal || 0).toFixed(2)} (${order.paymentMethod || 'Cash'})`,
      status: 'PAYMENT_REQUESTED'
    }] : []),
    ...(order.status === 'COMPLETED' ? [{
      title: 'Customer Verified (OTP)',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Customer 4-digit OTP successfully verified',
      status: 'VERIFIED'
    }, {
      title: 'Order Delivered & Completed',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Order handed over and sale recorded',
      status: 'COMPLETED'
    }] : [])
  ];

  const formattedCreatedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';

  const getStatusBadge = (st) => {
    switch (st) {
      case 'COMPLETED':
        return <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700' }}>✓ COMPLETED</span>;
      case 'READY':
        return <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>📦 READY FOR PICKUP</span>;
      case 'PACKING':
      case 'ACCEPTED':
        return <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>⏳ PREPARING</span>;
      case 'DECLINED':
        return <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: '700' }}>❌ DECLINED</span>;
      case 'CANCELLED_BY_CUSTOMER':
        return <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: '700' }}>🚫 CANCELLED</span>;
      default:
        return <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontWeight: '700' }}>⌛ PENDING</span>;
    }
  };

  const getStepIcon = (st) => {
    switch (st) {
      case 'CREATED':
        return <ShoppingBag size={16} color="#0284c7" />;
      case 'RECEIVED':
        return <Clock size={16} color="#0284c7" />;
      case 'ACCEPTED':
        return <PackageCheck size={16} color="#d97706" />;
      case 'ITEMS_UPDATED':
        return <AlertCircle size={16} color="#d97706" />;
      case 'READY':
        return <CheckCircle2 size={16} color="#0284c7" />;
      case 'PAYMENT_REQUESTED':
        return <CreditCard size={16} color="#2563eb" />;
      case 'VERIFIED':
        return <ShieldCheck size={16} color="#16a34a" />;
      case 'COMPLETED':
        return <Check size={16} color="#16a34a" />;
      default:
        return <Clock size={16} color="#64748b" />;
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="panel modal-dialog" style={{ width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
              <h3 className="title" style={{ margin: 0, fontSize: '1.2rem' }}>
                Order #{order.orderNumber || order.id}
              </h3>
              {getStatusBadge(order.status)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Placed on {formattedCreatedDate} {order.shopName ? `• ${order.shopName}` : ''}
            </div>
          </div>
          <X size={22} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        {/* Customer & Shop Details Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '700' }}>CUSTOMER</span>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{order.customerName || 'Customer'} ({order.customerShortId || 'N/A'})</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📞 {order.customerPhone || 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '700' }}>SHOP / STORE</span>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{order.shopName || 'GI SHOP Store'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{order.shopAddress || ''}</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: ORDERED ITEMS BREAKDOWN */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '800' }}>
            🛒 Ordered Items &amp; Billing
          </h4>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const isUnavail = it.isUnavailable || it.unavailable;
                  const name = it.item?.name || it.name || 'Item';
                  const unit = it.item?.unit || it.unit || '';
                  const rate = it.rate || it.price || (it.item?.price) || 0;
                  const qty = it.qty || 1;
                  const amt = it.amount || (rate * qty);

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: isUnavail ? '#fef2f2' : '#ffffff' }}>
                      <td style={{ padding: '0.6rem 0.85rem' }}>
                        <div style={{ fontWeight: '700', textDecoration: isUnavail ? 'line-through' : 'none', color: isUnavail ? '#991b1b' : '#0f172a' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          @{rate}/{unit} {isUnavail && <span style={{ color: '#dc2626', fontWeight: '800', marginLeft: '6px' }}>(Marked Unavailable)</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontWeight: '700', color: isUnavail ? '#991b1b' : '#0f172a' }}>
                        {qty} {unit}
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontWeight: '800', textDecoration: isUnavail ? 'line-through' : 'none', color: isUnavail ? '#991b1b' : '#0f172a' }}>
                        ₹{(Number(amt) || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Subtotal & Final Summary */}
            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.86rem' }}>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Subtotal:</span>
                <span style={{ fontWeight: '700' }}>₹{(Number(order.estimatedTotal) || 0).toFixed(2)}</span>
              </div>

              {order.requestedDiscount > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '4px' }}>
                  <span>Discount Applied:</span>
                  <span style={{ fontWeight: '700' }}>-₹{(Number(order.requestedDiscount) || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex-between" style={{ paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                <span>Final Payable Amount:</span>
                <span style={{ color: 'var(--primary)' }}>
                  ₹{(Number(order.requestedAmount > 0 ? order.requestedAmount : order.estimatedTotal) || 0).toFixed(2)}
                </span>
              </div>

              {order.paymentMethod && (
                <div className="flex-between" style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Payment Mode:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{order.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: COMPLETE ORDER JOURNEY TIMELINE */}
        <div>
          <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '800' }}>
            📜 Complete Order Journey &amp; Timestamps
          </h4>

          <div style={{ paddingLeft: '0.5rem' }}>
            {displayTimeline.map((step, index) => {
              const formattedTime = step.timestamp
                ? new Date(step.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : '';

              const isLast = index === displayTimeline.length - 1;

              return (
                <div key={index} style={{ display: 'flex', gap: '0.85rem', position: 'relative', paddingBottom: isLast ? 0 : '1.25rem' }}>
                  {/* Vertical Line Connector */}
                  {!isLast && (
                    <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '0', width: '2px', background: '#cbd5e1', zIndex: 1 }} />
                  )}

                  {/* Icon Circle */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isLast ? '#dcfce7' : '#f1f5f9', border: `2px solid ${isLast ? '#16a34a' : '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
                    {getStepIcon(step.status)}
                  </div>

                  {/* Event Details */}
                  <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex-between" style={{ marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{step.title}</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>{formattedTime}</span>
                    </div>
                    {step.description && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.35' }}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-outline" style={{ padding: '0.5rem 1.25rem', fontWeight: '700' }} onClick={onClose}>
            Close Order Details
          </button>
        </div>

      </div>
    </div>
  );
}
