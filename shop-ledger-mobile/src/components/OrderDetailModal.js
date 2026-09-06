import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Clock,
  PackageCheck,
  CreditCard,
  ShieldCheck,
  Check,
  AlertCircle,
  ShoppingBag,
  Download,
  CheckCircle2,
  User,
  Share2,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, shadowMedium, shadowLarge } from '../theme/colors';

export default function OrderDetailModal({ visible, order, onClose, onAccept, onDecline }) {
  const [downloading, setDownloading] = useState(false);

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
    ? new Date(order.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
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

  const finalPayableAmt = Number(order.requestedAmount > 0 ? order.requestedAmount : order.estimatedTotal) || 0;
  const subtotalAmt = Number(order.estimatedTotal) || finalPayableAmt;
  const discountAmt = Number(order.requestedDiscount) || 0;
  const paymentMethod = order.paymentMethod || 'Pay at Counter';

  const getStepIcon = (st) => {
    switch (st) {
      case 'CREATED':
        return <ShoppingBag size={14} color="#0284c7" />;
      case 'RECEIVED':
        return <Clock size={14} color="#0284c7" />;
      case 'ACCEPTED':
        return <PackageCheck size={14} color="#d97706" />;
      case 'ITEMS_UPDATED':
        return <AlertCircle size={14} color="#d97706" />;
      case 'READY':
        return <CheckCircle2 size={14} color="#0284c7" />;
      case 'PAYMENT_REQUESTED':
        return <CreditCard size={14} color="#2563eb" />;
      case 'VERIFIED':
        return <ShieldCheck size={14} color="#16a34a" />;
      case 'COMPLETED':
        return <Check size={14} color="#16a34a" />;
      case 'DECLINED':
      case 'CANCELLED_BY_CUSTOMER':
        return <AlertCircle size={14} color="#dc2626" />;
      default:
        return <Clock size={14} color="#64748b" />;
    }
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'COMPLETED':
        return { label: 'Completed', bg: '#dcfce7', text: '#15803d' };
      case 'READY':
        return { label: 'Ready for Pickup', bg: '#e0f2fe', text: '#0369a1' };
      case 'PACKING':
      case 'ACCEPTED':
        return { label: 'Preparing Order', bg: '#fef3c7', text: '#b45309' };
      case 'DECLINED':
        return { label: 'Declined', bg: '#fee2e2', text: '#b91c1c' };
      case 'CANCELLED_BY_CUSTOMER':
        return { label: 'Cancelled', bg: '#fee2e2', text: '#b91c1c' };
      default:
        return { label: 'Pending Confirmation', bg: '#fef3c7', text: '#b45309' };
    }
  };

  const badge = getStatusBadge();

  // Generate Authentic Thermal POS Store Receipt HTML
  const generateReceiptHtml = () => {
    const rowsHtml = items.map((it, idx) => {
      const isUnavail = it.isUnavailable || it.unavailable;
      const name = it.item?.name || it.name || 'Item';
      const unit = it.item?.unit || it.unit || 'pcs';
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

    const discountRowHtml = discountAmt > 0 ? `
      <tr>
        <td style="padding: 2px 0; text-align: left; color: #15803d; font-weight: 700;">DISCOUNT APPLIED:</td>
        <td style="padding: 2px 0; text-align: right; color: #15803d; font-weight: 700;">-&#8377;${discountAmt.toFixed(2)}</td>
      </tr>
    ` : '';

    return `
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
            padding: 20px 16px;
            border: 1px dashed #94a3b8;
            box-shadow: 0 4px 14px rgba(0,0,0,0.06);
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: 700; }
          .d-dash {
            border-top: 1px dashed #1e293b;
            margin: 8px 0;
          }
          .d-double {
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            height: 3px;
            margin: 8px 0;
          }
          .store-name {
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .store-detail {
            font-size: 10.5px;
            color: #334155;
            margin-bottom: 2px;
          }
          .receipt-type-pill {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 12px;
            border: 1px solid #0f172a;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            padding: 2px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
          }
          .items-table th {
            padding: 6px 2px;
            border-top: 1px dashed #1e293b;
            border-bottom: 1px dashed #1e293b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
            font-size: 11px;
          }
          .grand-total-val {
            font-size: 16px;
            font-weight: 900;
          }
          .pickup-box {
            margin-top: 10px;
            padding: 8px 10px;
            border: 1px dashed #1e293b;
            background: #f8fafc;
          }
          .barcode-box {
            margin-top: 16px;
            text-align: center;
          }
          .barcode-bars {
            display: inline-block;
            height: 34px;
            width: 220px;
            background: repeating-linear-gradient(
              90deg,
              #0f172a 0px, #0f172a 2px,
              #fff 2px, #fff 4px,
              #0f172a 4px, #0f172a 6px,
              #fff 6px, #fff 9px,
              #0f172a 9px, #0f172a 12px,
              #fff 12px, #fff 14px,
              #0f172a 14px, #0f172a 15px,
              #fff 15px, #fff 18px,
              #0f172a 18px, #0f172a 21px,
              #fff 21px, #fff 24px,
              #0f172a 24px, #0f172a 25px,
              #fff 25px, #fff 28px
            );
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
            <span><strong>MODE:</strong> ${paymentMethod}</span>
            <span><strong>STATUS:</strong> ${order.status || 'COMPLETED'}</span>
          </div>

          <div class="d-dash"></div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">ITEM</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">RATE</th>
                <th style="text-align: right;">AMT</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="d-dash"></div>

          <!-- Totals Calculation -->
          <table class="summary-table">
            <tr>
              <td style="padding: 2px 0;">ITEMS / UNITS:</td>
              <td class="right" style="padding: 2px 0; font-weight: 700;">${items.length} / ${totalUnits}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">SUBTOTAL:</td>
              <td class="right" style="padding: 2px 0; font-weight: 700;">&#8377;${subtotalAmt.toFixed(2)}</td>
            </tr>
            ${discountRowHtml}
          </table>

          <div class="d-double"></div>

          <table class="summary-table">
            <tr class="grand-total-row">
              <td style="font-weight: 900; font-size: 13px;">NET PAYABLE:</td>
              <td class="right grand-total-val">&#8377;${finalPayableAmt.toFixed(2)}</td>
            </tr>
          </table>

          <div class="d-double"></div>

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
      </body>
      </html>
    `;
  };

  // Generate PDF download or native print preview
  const handleDownloadReceipt = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const html = generateReceiptHtml();

      // 1. Generate PDF file via expo-print
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // 2. Try native sharing (Save to files / WhatsApp / Drive / PDF viewer)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        const shareOptions = {
          mimeType: 'application/pdf',
          dialogTitle: `Order Receipt #${orderNumber}`,
        };
        if (Platform.OS === 'ios') {
          shareOptions.UTI = 'com.adobe.pdf';
        }
        await Sharing.shareAsync(uri, shareOptions);
      } else {
        // Fallback: Open device system Print dialog (allows Save as PDF)
        await Print.printAsync({ html });
      }
    } catch (err) {
      console.warn('Sharing/PDF error, falling back to direct print dialogue:', err);
      try {
        const html = generateReceiptHtml();
        await Print.printAsync({ html });
      } catch (fallbackErr) {
        console.error('Final receipt generation error:', fallbackErr);
        Alert.alert(
          'Receipt Error',
          fallbackErr?.message || 'Unable to generate receipt PDF. Please try again.'
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.fullPageContainer}>
        {/* Full Page Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.navBackBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.navTitle}>Order Details</Text>
              <View style={[styles.statusBadgePill, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>
            <Text style={styles.navSub}>#{orderNumber} • {formattedCreatedDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.headerReceiptBtn}
            onPress={handleDownloadReceipt}
            disabled={downloading}
            activeOpacity={0.8}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Download size={14} color="#ffffff" />
                <Text style={styles.headerReceiptText}>Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Order Details Body */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Shop Details Card with Contact Number */}
          <View style={styles.shopCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={styles.shopIconCircle}>
                <Store size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeaderSmall}>SHOP DETAILS</Text>
                <Text style={styles.shopName}>{shopName}</Text>
                {shopAddress ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={styles.shopAddress} numberOfLines={2}>{shopAddress}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {shopPhone ? (
              <View style={styles.shopPhoneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phoneLabel}>Shop Contact Phone</Text>
                  <Text style={styles.phoneNumber}>{shopPhone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callShopBtn}
                  onPress={() => Linking.openURL(`tel:${shopPhone}`)}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#ffffff" />
                  <Text style={styles.callShopBtnText}>Call Shop</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Ordered Items Breakdown */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ordered Items & Billing</Text>
            <Text style={styles.itemsCountText}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
          </View>

          <View style={styles.itemsCard}>
            {items.map((it, idx) => {
              const isUnavail = it.isUnavailable || it.unavailable;
              const name = it.item?.name || it.name || 'Item';
              const unit = it.item?.unit || it.unit || '';
              const rate = it.rate || it.price || (it.item?.price) || 0;
              const qty = it.qty || 1;
              const amt = it.amount || (rate * qty);

              return (
                <View key={idx} style={[styles.itemRow, isUnavail && styles.itemRowUnavail]}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.itemName, isUnavail && styles.strikeText]}>
                      {name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
                      <Text style={styles.itemMeta}>₹{rate} / {unit}</Text>
                      {isUnavail && (
                        <View style={styles.unavailBadge}>
                          <Text style={styles.unavailBadgeText}>Unavailable</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.itemQty, isUnavail && styles.strikeText]}>
                    {qty} {unit}
                  </Text>
                  <Text style={[styles.itemAmt, isUnavail && styles.strikeText]}>
                    ₹{(Number(amt) || 0).toFixed(2)}
                  </Text>
                </View>
              );
            })}

            {/* Bill Summary */}
            <View style={styles.billingSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotalAmt.toFixed(2)}</Text>
              </View>

              {discountAmt > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount Applied</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>-₹{discountAmt.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Payable Amount</Text>
                <Text style={styles.totalVal}>₹{finalPayableAmt.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={styles.paymentMetaLabel}>Payment Mode</Text>
                <Text style={styles.paymentMetaVal}>{paymentMethod}</Text>
              </View>
            </View>
          </View>

          {/* Download Receipt Banner Action */}
          <View style={styles.downloadReceiptBanner}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.downloadBannerTitle}>Printable Receipt (PDF)</Text>
              <Text style={styles.downloadBannerSub}>Available for both customer & shopkeeper</Text>
            </View>
            <TouchableOpacity
              style={styles.downloadReceiptBigBtn}
              onPress={handleDownloadReceipt}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Download size={16} color="#ffffff" />
                  <Text style={styles.downloadReceiptBigBtnText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Complete Order Journey Timeline */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Complete Order Journey</Text>
          <View style={styles.timelineCard}>
            {displayTimeline.map((step, index) => {
              const formattedTime = step.timestamp
                ? new Date(step.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '';
              const isLast = index === displayTimeline.length - 1;

              return (
                <View key={index} style={styles.stepContainer}>
                  {!isLast && <View style={styles.timelineLine} />}
                  <View style={[styles.stepIconDot, isLast && styles.stepIconDotLast]}>
                    {getStepIcon(step.status)}
                  </View>
                  <View style={styles.stepBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepTime}>{formattedTime}</Text>
                    </View>
                    {step.description ? (
                      <Text style={styles.stepDesc}>{step.description}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Customer Card explicitly at the last with pickup note */}
          <View style={styles.customerPickupCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <User size={18} color="#059669" />
              <Text style={styles.customerPickupTitle}>CUSTOMER PICKUP INFORMATION</Text>
            </View>

            <View style={styles.customerFieldRow}>
              <Text style={styles.customerFieldLabel}>Customer Name:</Text>
              <Text style={styles.customerFieldVal}>
                {customerName} {customerShortId ? `(${customerShortId})` : ''}
              </Text>
            </View>

            {customerPhone ? (
              <View style={styles.customerFieldRow}>
                <Text style={styles.customerFieldLabel}>Contact Number:</Text>
                <Text style={styles.customerFieldVal}>{customerPhone}</Text>
              </View>
            ) : null}

            <View style={styles.pickupHighlightBox}>
              <ShoppingBag size={16} color="#15803d" />
              <Text style={styles.pickupHighlightText}>
                (Customer will pick up the order)
              </Text>
            </View>
          </View>

          {/* Shopkeeper Action Buttons if status is PENDING */}
          {order.status === 'PENDING' && (onAccept || onDecline) && (
            <View style={styles.actionButtonsRow}>
              {onDecline && (
                <TouchableOpacity
                  style={[styles.bottomBtn, styles.declineBtn]}
                  onPress={onDecline}
                  activeOpacity={0.8}
                >
                  <Text style={styles.declineBtnText}>Decline Order</Text>
                </TouchableOpacity>
              )}
              {onAccept && (
                <TouchableOpacity
                  style={[styles.bottomBtn, styles.acceptBtn]}
                  onPress={onAccept}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptBtnText}>Accept & Pack</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Close Order Details View */}
          <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeFullBtnText}>Close Order Details</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullPageContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...shadowMedium,
    zIndex: 10,
  },
  navBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  navSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  headerReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerReceiptText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  shopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    ...shadowMedium,
  },
  shopIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  shopAddress: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
    flex: 1,
  },
  shopPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 10,
  },
  phoneLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  phoneNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  callShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callShopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  itemsCountText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...shadowMedium,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemRowUnavail: {
    backgroundColor: '#fef2f2',
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  strikeText: {
    textDecorationLine: 'line-through',
    color: '#dc2626',
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  unavailBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unavailBadgeText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '800',
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    width: 60,
    textAlign: 'center',
  },
  itemAmt: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    width: 75,
    textAlign: 'right',
  },
  billingSummaryBox: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  paymentMetaLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  paymentMetaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  downloadReceiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    ...shadowMedium,
  },
  downloadBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  downloadBannerSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  downloadReceiptBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  downloadReceiptBigBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 8,
    ...shadowMedium,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
    paddingBottom: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 28,
    bottom: 0,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  stepIconDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepIconDotLast: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  stepBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  stepTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    lineHeight: 15,
  },
  customerPickupCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    ...shadowMedium,
  },
  customerPickupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  customerFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  customerFieldLabel: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  customerFieldVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickupHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  pickupHighlightText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  declineBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  closeFullBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  closeFullBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
