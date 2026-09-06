import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  PackageCheck,
  CreditCard,
  ShieldCheck,
  Check,
  AlertCircle,
  ShoppingBag,
  Download,
  Phone,
  Store,
  User,
} from 'lucide-react';

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
      status: 'CREATED',
    },
    {
      title: 'Order Received by Shop',
      timestamp: order.createdAt || new Date().toISOString(),
      description: 'Order received by shopkeeper',
      status: 'RECEIVED',
    },
    ...(order.acceptedAt ? [{
      title: 'Order Accepted & Preparing',
      timestamp: order.acceptedAt,
      description: `Estimated preparation time: ${order.packingMinutes || 15} mins`,
      status: 'ACCEPTED',
    }] : []),
    ...(order.status === 'READY' || order.status === 'COMPLETED' ? [{
      title: 'Order Ready for Pickup',
      timestamp: order.acceptedAt || order.createdAt,
      description: 'Order packed and ready for pickup',
      status: 'READY',
    }] : []),
    ...(order.paymentRequested ? [{
      title: 'Payment Requested',
      timestamp: order.acceptedAt || order.createdAt,
      description: `Requested ₹${(order.requestedAmount || order.estimatedTotal || 0).toFixed(2)} (${order.paymentMethod || 'Cash'})`,
      status: 'PAYMENT_REQUESTED',
    }] : []),
    ...(order.status === 'COMPLETED' ? [{
      title: 'Customer Verified (OTP)',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Customer 4-digit OTP successfully verified',
      status: 'VERIFIED',
    }, {
      title: 'Order Delivered & Completed',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Order handed over and sale recorded',
      status: 'COMPLETED',
    }] : []),
    ...(order.status === 'DECLINED' ? [{
      title: 'Order Declined',
      timestamp: order.updatedAt || new Date().toISOString(),
      description: order.declineReason || 'Shopkeeper declined this order',
      status: 'DECLINED',
    }] : []),
    ...(order.status === 'CANCELLED_BY_CUSTOMER' ? [{
      title: 'Order Cancelled by Customer',
      timestamp: order.updatedAt || new Date().toISOString(),
      description: 'Customer cancelled or took back this order',
      status: 'CANCELLED_BY_CUSTOMER',
    }] : []),
  ];

  const formattedCreatedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';

  const shopName = order.shopName || order.Shop?.name || 'GI SHOP Store';
  const shopPhone = order.shopPhone || order.Shop?.phone || order.shopContact || '';
  const shopAddress = [
    order.shopAddress || order.Shop?.address,
    order.shopCity || order.Shop?.city,
  ].filter(Boolean).join(', ');

  const customerName = order.customerName || order.User?.name || 'Customer';
  const customerPhone = order.customerPhone || order.User?.phone || '';
  const customerShortId = order.customerShortId || order.User?.shortId || '';
  const orderNumber = order.orderNumber || order.id || 'N/A';

  const finalPayableAmt = (Number(order.requestedAmount > 0 ? order.requestedAmount : order.estimatedTotal) || 0).toFixed(2);
  const subtotalAmt = (Number(order.estimatedTotal) || Number(finalPayableAmt)).toFixed(2);
  const discountAmt = (Number(order.requestedDiscount) || 0).toFixed(2);
  const paymentMethod = order.paymentMethod || 'Pay at Counter / Cash';

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
      case 'DECLINED':
      case 'CANCELLED_BY_CUSTOMER':
        return <AlertCircle size={16} color="#dc2626" />;
      default:
        return <Clock size={16} color="#64748b" />;
    }
  };

  const handleDownloadReceipt = () => {
    const printWin = window.open('', '_blank', 'width=450,height=750');
    if (!printWin) {
      alert('Popup blocked! Please allow popups to download or print receipt.');
      return;
    }

    const rowsHtml = items.map((it) => {
      const isUnavail = it.isUnavailable || it.unavailable;
      const name = it.item?.name || it.name || 'Item';
      const unit = it.item?.unit || it.unit || '';
      const rate = (Number(it.rate || it.price || it.item?.price) || 0).toFixed(2);
      const qty = it.qty || 1;
      const amt = (Number(it.amount || (rate * qty)) || 0).toFixed(2);

      return `
        <tr style="${isUnavail ? 'text-decoration: line-through; color: #666;' : ''}">
          <td style="padding: 4px 2px; text-align: left; vertical-align: top;">
            <div style="font-weight: 700; font-size: 11px;">${name}</div>
            ${isUnavail ? '<div style="font-size: 9px; color: #b91c1c; font-weight: 700;">* UNAVAILABLE (DEDUCTED)</div>' : ''}
          </td>
          <td style="padding: 4px 2px; text-align: center; font-size: 11px; vertical-align: top;">
            ${qty} ${unit}
          </td>
          <td style="padding: 4px 2px; text-align: right; font-size: 11px; vertical-align: top;">
            &#8377;${rate}
          </td>
          <td style="padding: 4px 2px; text-align: right; font-weight: 700; font-size: 11px; vertical-align: top;">
            &#8377;${amt}
          </td>
        </tr>
      `;
    }).join('');

    const totalUnits = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);

    const discountRowHtml = Number(discountAmt) > 0 ? `
      <tr>
        <td style="padding: 2px 0; text-align: left; color: #15803d; font-weight: 700;">DISCOUNT APPLIED:</td>
        <td style="padding: 2px 0; text-align: right; color: #15803d; font-weight: 700;">-&#8377;${Number(discountAmt).toFixed(2)}</td>
      </tr>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${orderNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .receipt-container {
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              padding: 4px 0 !important;
            }
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
            background-color: #f8fafc;
            color: #111827;
            margin: 0;
            padding: 14px;
            display: flex;
            justify-content: center;
            font-size: 11px;
            line-height: 1.35;
          }
          .receipt-container {
            width: 100%;
            max-width: 380px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-radius: 4px;
            padding: 14px 16px;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: 800; }
          .store-name {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .store-detail {
            font-size: 10px;
            color: #4b5563;
            line-height: 1.25;
          }
          .receipt-type-pill {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 10px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            background: #111827;
            color: #ffffff;
            border-radius: 2px;
          }
          .d-dash {
            border-top: 1px dashed #9ca3af;
            margin: 8px 0;
          }
          .d-double {
            border-top: 2px solid #111827;
            border-bottom: 1px solid #111827;
            height: 3px;
            margin: 8px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin: 2px 0;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
            font-size: 11px;
          }
          table.items-table th {
            border-bottom: 1px dashed #4b5563;
            padding: 4px 2px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          table.items-table td {
            border-bottom: 1px dotted #e5e7eb;
          }
          .summary-table {
            width: 100%;
            margin-top: 4px;
            font-size: 11px;
          }
          .grand-total-row {
            font-size: 14px;
            font-weight: 900;
            background: #f3f4f6;
            padding: 6px 4px;
            margin-top: 6px;
            border-top: 2px solid #111827;
            border-bottom: 2px solid #111827;
            display: flex;
            justify-content: space-between;
          }
          .pickup-box {
            margin-top: 12px;
            background: #f0fdf4;
            border: 1px dashed #16a34a;
            border-radius: 4px;
            padding: 8px 10px;
          }
          .barcode-box {
            margin: 12px 0 6px 0;
            text-align: center;
          }
          .barcode-bars {
            height: 28px;
            background: repeating-linear-gradient(
              90deg,
              #111 0px, #111 2px,
              transparent 2px, transparent 4px,
              #111 4px, #111 7px,
              transparent 7px, transparent 8px,
              #111 8px, #111 11px,
              transparent 11px, transparent 13px
            );
            margin: 0 auto;
            max-width: 180px;
          }
          .barcode-text {
            font-size: 9.5px;
            letter-spacing: 2px;
            margin-top: 2px;
            color: #334155;
          }
          .receipt-footer {
            margin-top: 14px;
            text-align: center;
            font-size: 10px;
            color: #475569;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Store Header -->
          <div class="center">
            <div class="store-name">${shopName}</div>
            ${shopAddress ? `<div class="store-detail">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="store-detail">Ph: ${shopPhone}</div>` : ''}
            <div class="receipt-type-pill">RETAIL INVOICE / CASH MEMO</div>
          </div>

          <div class="d-dash"></div>

          <!-- Order Metadata -->
          <div class="meta-row">
            <span><strong>ORDER #:</strong> ${orderNumber}</span>
            <span><strong>DATE:</strong> ${formattedCreatedDate}</span>
          </div>
          <div class="meta-row">
            <span><strong>STATUS:</strong> ${order.status || 'ACTIVE'}</span>
            <span><strong>PAYMENT:</strong> ${paymentMethod}</span>
          </div>

          <div class="d-dash"></div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="left" style="width: 45%;">Item</th>
                <th class="center" style="width: 15%;">Qty</th>
                <th class="right" style="width: 20%;">Rate</th>
                <th class="right" style="width: 20%;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="d-dash"></div>

          <!-- Total Calculations -->
          <table class="summary-table">
            <tr>
              <td style="padding: 2px 0; text-align: left; color: #4b5563;">TOTAL ITEMS / UNITS:</td>
              <td style="padding: 2px 0; text-align: right; font-weight: 700;">${items.length} items (${totalUnits} units)</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; text-align: left; color: #4b5563;">ITEMS SUBTOTAL:</td>
              <td style="padding: 2px 0; text-align: right; font-weight: 700;">&#8377;${subtotalAmt}</td>
            </tr>
            ${discountRowHtml}
          </table>

          <div class="grand-total-row">
            <span>NET PAYABLE:</span>
            <span>&#8377;${finalPayableAmt}</span>
          </div>

          <!-- Pickup Customer Card at Last -->
          <div class="pickup-box">
            <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #15803d; margin-bottom: 2px;">
              &#10003; PICKUP CUSTOMER DETAILS
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a;">
              ${customerName} ${customerShortId ? `(${customerShortId})` : ''}
            </div>
            ${customerPhone ? `<div style="font-size: 10.5px; margin-top: 2px; color: #334155;">Phone: ${customerPhone}</div>` : ''}
            <div style="margin-top: 4px; font-size: 10.5px; font-weight: 800; color: #166534;">
              (Customer will pick up the order)
            </div>
          </div>

          <!-- Barcode simulation -->
          <div class="barcode-box">
            <div class="barcode-bars"></div>
            <div class="barcode-text">*${orderNumber}*</div>
          </div>

          <!-- Footer Message -->
          <div class="receipt-footer">
            <div class="bold">&#9733; THANK YOU FOR SHOPPING WITH US &#9733;</div>
            <div>PLEASE VISIT AGAIN!</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Powered by GI SHOP &#8226; Digital Store & Khata</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="panel modal-dialog" style={{ width: '880px', maxWidth: '96vw', height: '92vh', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: '16px', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Modal Scrollable Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        
        {/* Header */}
        <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
              <h3 className="title" style={{ margin: 0, fontSize: '1.2rem' }}>
                Order #{orderNumber}
              </h3>
              {getStatusBadge(order.status)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Placed on {formattedCreatedDate}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadReceipt}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              <Download size={15} /> Receipt (PDF)
            </button>
            <X size={22} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
          </div>
        </div>

        {/* Shop Details Card with Contact Number */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: '800' }}>
                <Store size={14} color="var(--primary)" /> SHOP / STORE DETAILS
              </div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                {shopName}
              </div>
              {shopAddress && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                  {shopAddress}
                </div>
              )}
            </div>

            {shopPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                <Phone size={14} color="#1d4ed8" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: '700' }}>Shop Contact</div>
                  <a href={`tel:${shopPhone}`} style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1d4ed8', textDecoration: 'none' }}>
                    {shopPhone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1: ORDERED ITEMS BREAKDOWN */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.65rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '800' }}>
              Ordered Items &amp; Billing
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          
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
                <span style={{ fontWeight: '700' }}>₹{subtotalAmt}</span>
              </div>

              {Number(discountAmt) > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '4px' }}>
                  <span>Discount Applied:</span>
                  <span style={{ fontWeight: '700' }}>-₹{discountAmt}</span>
                </div>
              )}

              <div className="flex-between" style={{ paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                <span>Final Payable Amount:</span>
                <span style={{ color: 'var(--primary)' }}>
                  ₹{finalPayableAmt}
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
            Complete Order Journey
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
                    hour12: true,
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

        {/* Customer Pickup Details Card at the Very End */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem 1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            <User size={15} /> PICKUP CUSTOMER DETAILS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>
                {customerName} {customerShortId ? `(${customerShortId})` : ''}
              </div>
              {customerPhone && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  📞 {customerPhone}
                </div>
              )}
            </div>
            <div style={{ background: '#dcfce7', color: '#166534', fontWeight: '800', fontSize: '0.82rem', padding: '0.4rem 0.85rem', borderRadius: '6px' }}>
              (Customer will pick up the order)
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadReceipt}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}
          >
            <Download size={16} /> Download Receipt (PDF)
          </button>
          <button type="button" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontWeight: '700' }} onClick={onClose}>
            Close Order Details
          </button>
        </div>

        </div>
      </div>
    </div>
  );
}
