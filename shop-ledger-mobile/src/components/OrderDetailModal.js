import React, { useState, useEffect } from 'react';
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
  TextInput,
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
  XCircle,
  X,
  ChevronRight,
  Sparkles,
  Tag,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, shadowMedium, shadowLarge } from '../theme/colors';
import {
  updateShopOrderItems,
  acceptShopOrder,
  declineShopOrder,
  completeShopOrder,
  requestShopOrderPayment,
  verifyShopOrderOTP,
} from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export default function OrderDetailModal({
  visible,
  order,
  onClose,
  onAccept,
  onDecline,
  isShopkeeper = false,
  onRefresh,
  onOrderUpdated,
}) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [localOrder, setLocalOrder] = useState(order);
  const [updatingItems, setUpdatingItems] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Shopkeeper management state
  const [packingMinutes, setPackingMinutes] = useState(15);
  const [customDiscount, setCustomDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [otpValue, setOtpValue] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Item out of stock');
  const [customDeclineReason, setCustomDeclineReason] = useState('');

  useEffect(() => {
    if (order) {
      setLocalOrder(order);
      setCustomDiscount(order.requestedDiscount ? String(order.requestedDiscount) : '');
      setPackingMinutes(order.packingMinutes || 15);
      setPaymentMode(order.paymentMethod || 'Cash');
    }
  }, [order]);

  if (!visible || !order) return null;

  const currentOrder = localOrder || order;

  const items = Array.isArray(currentOrder.items)
    ? currentOrder.items
    : typeof currentOrder.itemsJSON === 'string'
    ? JSON.parse(currentOrder.itemsJSON || '[]')
    : [];

  const timeline = Array.isArray(currentOrder.timeline)
    ? currentOrder.timeline
    : typeof currentOrder.timelineJSON === 'string'
    ? JSON.parse(currentOrder.timelineJSON || '[]')
    : [];

  // Fallback timeline if timelineJSON is not populated yet
  const displayTimeline = timeline.length > 0 ? timeline : [
    {
      title: 'Order Created',
      timestamp: currentOrder.createdAt || new Date().toISOString(),
      description: 'Customer placed the order',
      status: 'CREATED',
    },
    {
      title: 'Order Received by Shop',
      timestamp: currentOrder.createdAt || new Date().toISOString(),
      description: 'Order received by shopkeeper',
      status: 'RECEIVED',
    },
    ...(currentOrder.acceptedAt ? [{
      title: 'Order Accepted & Preparing',
      timestamp: currentOrder.acceptedAt,
      description: `Estimated preparation time: ${currentOrder.packingMinutes || 15} mins`,
      status: 'ACCEPTED',
    }] : []),
    ...(currentOrder.status === 'READY' || currentOrder.status === 'COMPLETED' ? [{
      title: 'Order Ready for Pickup',
      timestamp: currentOrder.acceptedAt || currentOrder.createdAt,
      description: 'Order packed and ready for pickup',
      status: 'READY',
    }] : []),
    ...(currentOrder.paymentRequested ? [{
      title: 'Payment Requested',
      timestamp: currentOrder.acceptedAt || currentOrder.createdAt,
      description: `Requested ₹${(currentOrder.requestedAmount || currentOrder.estimatedTotal || 0).toFixed(2)} (${currentOrder.paymentMethod || 'Cash'})`,
      status: 'PAYMENT_REQUESTED',
    }] : []),
    ...(currentOrder.status === 'COMPLETED' ? [{
      title: 'Customer Verified (OTP)',
      timestamp: currentOrder.collectedAt || new Date().toISOString(),
      description: 'Customer 4-digit OTP successfully verified',
      status: 'VERIFIED',
    }, {
      title: 'Order Delivered & Completed',
      timestamp: currentOrder.collectedAt || new Date().toISOString(),
      description: 'Order handed over and sale recorded',
      status: 'COMPLETED',
    }] : []),
    ...(currentOrder.status === 'DECLINED' ? [{
      title: 'Order Declined',
      timestamp: currentOrder.updatedAt || new Date().toISOString(),
      description: currentOrder.declineReason || 'Shopkeeper declined this order',
      status: 'DECLINED',
    }] : []),
    ...(currentOrder.status === 'CANCELLED_BY_CUSTOMER' ? [{
      title: 'Order Cancelled by Customer',
      timestamp: currentOrder.updatedAt || new Date().toISOString(),
      description: 'Customer cancelled or took back this order',
      status: 'CANCELLED_BY_CUSTOMER',
    }] : []),
  ];

  const formattedCreatedDate = currentOrder.createdAt
    ? new Date(currentOrder.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const shopName = currentOrder.shopName || currentOrder.Shop?.name || 'GI SHOP Store';
  const shopPhone = currentOrder.shopPhone || currentOrder.Shop?.phone || currentOrder.shopContact || '';
  const shopAddress = [
    currentOrder.shopAddress || currentOrder.Shop?.address,
    currentOrder.shopCity || currentOrder.Shop?.city,
  ].filter(Boolean).join(', ');

  const customerName = currentOrder.customerName || currentOrder.User?.name || 'Customer';
  const customerPhone = currentOrder.customerPhone || currentOrder.User?.phone || '';
  const customerShortId = currentOrder.customerShortId || currentOrder.User?.shortId || '';
  const orderNumber = currentOrder.orderNumber || currentOrder.id || 'N/A';

  // Live dynamic subtotal based on non-unavailable items
  const calculatedSubtotal = items.reduce((sum, it) => {
    if (it.isUnavailable || it.unavailable) return sum;
    const rate = Number(it.rate || it.price || it.item?.price) || 0;
    const qty = Number(it.qty) || 1;
    return sum + (Number(it.amount || (rate * qty)) || 0);
  }, 0);

  const activeDiscount = currentOrder.paymentRequested
    ? Number(currentOrder.requestedDiscount || 0)
    : (customDiscount !== '' ? Math.max(0, Number(customDiscount) || 0) : Number(currentOrder.requestedDiscount || 0));

  const finalPayableAmt = currentOrder.paymentRequested
    ? Number(currentOrder.requestedAmount > 0 ? currentOrder.requestedAmount : (calculatedSubtotal - activeDiscount))
    : Math.max(0, calculatedSubtotal - activeDiscount);

  const subtotalAmt = calculatedSubtotal;
  const discountAmt = activeDiscount;
  const paymentMethod = currentOrder.paymentMethod || 'Pay at Counter';

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
    switch (currentOrder.status) {
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
        return {
          label: isShopkeeper ? t('New Order (Pending)') : t('Pending Confirmation'),
          bg: '#fef3c7',
          text: '#b45309',
        };
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

  // Handler: Toggle item availability for shopkeeper
  const handleToggleItemAvailability = async (index) => {
    if (!currentOrder || updatingItems) return;
    setUpdatingItems(true);
    try {
      const updatedItems = items.map((it, idx) => {
        if (idx === index) {
          return { ...it, isUnavailable: !it.isUnavailable };
        }
        return it;
      });

      let newSubtotal = 0;
      updatedItems.forEach((it) => {
        if (!it.isUnavailable && !it.unavailable) {
          const rate = Number(it.rate || it.price || it.item?.price) || 0;
          const qty = Number(it.qty) || 1;
          newSubtotal += Number(it.amount || (rate * qty)) || 0;
        }
      });

      setLocalOrder((prev) => ({
        ...prev,
        itemsJSON: JSON.stringify(updatedItems),
        items: updatedItems,
        estimatedTotal: newSubtotal,
      }));

      await updateShopOrderItems(currentOrder.id, updatedItems);
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update item availability.');
      setLocalOrder(order);
    } finally {
      setUpdatingItems(false);
    }
  };

  // Handler: Accept order with packing time
  const handleAcceptOrderAction = async () => {
    if (onAccept) {
      onAccept();
      return;
    }
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await acceptShopOrder(currentOrder.id, packingMinutes);
      Alert.alert('Order Accepted', `Order #${orderNumber} accepted with ~${packingMinutes}m packing time.`);
      setLocalOrder((prev) => ({ ...prev, status: 'PACKING', packingMinutes }));
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to accept order.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Decline order with reason
  const handleDeclineOrderAction = async () => {
    if (onDecline && !showDeclineModal) {
      onDecline();
      return;
    }
    const finalReason = (declineReason === 'Other' ? customDeclineReason : declineReason) || 'Item out of stock';
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await declineShopOrder(currentOrder.id, finalReason.trim());
      Alert.alert('Order Declined', `Order #${orderNumber} has been declined.`);
      setShowDeclineModal(false);
      setLocalOrder((prev) => ({ ...prev, status: 'DECLINED', declineReason: finalReason.trim() }));
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to decline order.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Mark ready for pickup
  const handleMarkReadyAction = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await completeShopOrder(currentOrder.id);
      Alert.alert('Success', `Order #${orderNumber} marked ready for pickup!`);
      setLocalOrder((prev) => ({ ...prev, status: 'READY' }));
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to mark order ready.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Send payment request with discount and payment mode
  const handleSendPaymentRequestAction = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const discVal = customDiscount !== '' ? Number(customDiscount) || 0 : 0;
      await requestShopOrderPayment(currentOrder.id, discVal, paymentMode);
      Alert.alert('Payment Requested', `Requested ₹${(calculatedSubtotal - discVal).toFixed(2)} (${paymentMode}).`);
      setLocalOrder((prev) => ({
        ...prev,
        paymentRequested: 1,
        requestedDiscount: discVal,
        requestedAmount: Math.max(0, calculatedSubtotal - discVal),
        paymentMethod: paymentMode,
      }));
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send payment request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Verify customer OTP
  const handleVerifyOtpAction = async () => {
    const cleanOtp = (otpValue || '').trim();
    if (cleanOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit OTP provided by the customer.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await verifyShopOrderOTP(currentOrder.id, cleanOtp);
      Alert.alert('Order Completed', `OTP verified! Order #${orderNumber} handed over and recorded.`);
      setLocalOrder((prev) => ({ ...prev, status: 'COMPLETED', collectionStatus: 'COLLECTED' }));
      if (onOrderUpdated) onOrderUpdated();
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Verification Failed', err?.message || 'Incorrect OTP code.');
    } finally {
      setIsProcessingAction(false);
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
          
          {/* Customer Details Card (for Shopkeeper) OR Shop Details Card (for Customer) */}
          {isShopkeeper ? (
            <View style={styles.shopCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={[styles.shopIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <User size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeaderSmall}>{t('CUSTOMER DETAILS')}</Text>
                  <Text style={styles.shopName}>{customerName}</Text>
                  {customerShortId ? (
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {t('Short ID:')} #{customerShortId}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <ShoppingBag size={11} color="#15803d" />
                    <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600' }}>
                      {t('Self-Pickup Order')}
                    </Text>
                  </View>
                </View>
              </View>

              {customerPhone ? (
                <View style={styles.shopPhoneRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phoneLabel}>{t('Customer Contact Phone')}</Text>
                    <Text style={styles.phoneNumber}>{customerPhone}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.callShopBtn, { backgroundColor: colors.primary }]}
                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#ffffff" />
                    <Text style={styles.callShopBtnText}>{t('Call Customer')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.shopCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={styles.shopIconCircle}>
                  <Store size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeaderSmall}>{t('SHOP DETAILS')}</Text>
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
                    <Text style={styles.phoneLabel}>{t('Shop Contact Phone')}</Text>
                    <Text style={styles.phoneNumber}>{shopPhone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callShopBtn}
                    onPress={() => Linking.openURL(`tel:${shopPhone}`)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#ffffff" />
                    <Text style={styles.callShopBtnText}>{t('Call Shop')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {/* Ordered Items Breakdown */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Ordered Items & Billing</Text>
              {isShopkeeper && (currentOrder.status === 'PENDING' || currentOrder.status === 'PACKING') && (
                <Text style={styles.sectionHint}>Tap "Mark Out" if any item is not available in stock</Text>
              )}
            </View>
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
                          <Text style={styles.unavailBadgeText}>UNAVAILABLE</Text>
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

                  {/* Shopkeeper Mark Out / Restore Toggle */}
                  {isShopkeeper && (currentOrder.status === 'PENDING' || currentOrder.status === 'PACKING') && (
                    <TouchableOpacity
                      style={[
                        styles.itemAvailabilityToggleBtn,
                        isUnavail ? styles.restoreItemBtn : styles.markOutItemBtn,
                      ]}
                      onPress={() => handleToggleItemAvailability(idx)}
                      disabled={updatingItems}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.itemAvailabilityToggleText,
                        isUnavail ? styles.restoreItemText : styles.markOutItemText,
                      ]}>
                        {isUnavail ? t('Restore') : t('Mark Out')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Bill Summary */}
            <View style={styles.billingSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotalAmt.toFixed(2)}</Text>
              </View>

              {/* Shopkeeper Discount Controls - Direct numeric input only */}
              {isShopkeeper && !['COMPLETED', 'COLLECTED', 'DECLINED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED'].includes(currentOrder.status) && !currentOrder.paymentRequested ? (
                <View style={styles.discountControlContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Tag size={14} color={colors.primary} />
                      <Text style={styles.discountControlLabel}>{t('Give Extra Discount:')}</Text>
                    </View>
                    <View style={styles.customDiscountInputWrapper}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>₹</Text>
                      <TextInput
                        style={styles.customDiscountInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={customDiscount}
                        onChangeText={(val) => setCustomDiscount(val.replace(/\D/g, ''))}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                discountAmt > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount Applied</Text>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>-₹{discountAmt.toFixed(2)}</Text>
                  </View>
                )
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

          {/* Shopkeeper Interactive Action Controls */}
          {isShopkeeper && (
            <View style={styles.shopkeeperActionCard}>
              {/* Status: PENDING */}
              {currentOrder.status === 'PENDING' && (
                <View>
                  <Text style={styles.actionCardSectionTitle}>Manage & Accept Order</Text>
                  <Text style={styles.actionCardSub}>
                    Select estimated packing time before accepting:
                  </Text>
                  
                  {/* Packing Minutes Chips */}
                  <View style={styles.packingChipsRow}>
                    {[10, 15, 20, 30, 45].map((m) => {
                      const isSelected = packingMinutes === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.packingChip,
                            isSelected && styles.packingChipActive,
                          ]}
                          onPress={() => setPackingMinutes(m)}
                        >
                          <Clock size={12} color={isSelected ? '#ffffff' : colors.text} />
                          <Text
                            style={[
                              styles.packingChipText,
                              isSelected && styles.packingChipTextActive,
                            ]}
                          >
                            {m} mins
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Accept and Decline Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.bottomBtn, styles.declineOutlineBtn]}
                      onPress={() => setShowDeclineModal(true)}
                      disabled={isProcessingAction}
                      activeOpacity={0.8}
                    >
                      <XCircle size={16} color={colors.danger} />
                      <Text style={styles.declineOutlineBtnText}>Decline Order</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bottomBtn, styles.acceptBigBtn]}
                      onPress={handleAcceptOrderAction}
                      disabled={isProcessingAction}
                      activeOpacity={0.8}
                    >
                      {isProcessingAction ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#ffffff" />
                          <Text style={styles.acceptBigBtnText}>Accept Order (~{packingMinutes}m)</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Status: PACKING */}
              {currentOrder.status === 'PACKING' && (
                <View>
                  <View style={styles.statusNoticeBox}>
                    <Clock size={18} color="#b45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusNoticeTitle}>Order is Being Packed (~{currentOrder.packingMinutes || 15}m)</Text>
                      <Text style={styles.statusNoticeSub}>
                        Once packed and ready on the counter, mark it ready for customer pickup.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.markReadyBtn}
                    onPress={handleMarkReadyAction}
                    disabled={isProcessingAction}
                    activeOpacity={0.8}
                  >
                    {isProcessingAction ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <PackageCheck size={18} color="#ffffff" />
                        <Text style={styles.markReadyBtnText}>Mark Ready for Pickup</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Status: READY */}
              {currentOrder.status === 'READY' && (
                <View>
                  {!currentOrder.paymentRequested ? (
                    <View>
                      <View style={[styles.statusNoticeBox, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                        <PackageCheck size={18} color="#0369a1" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.statusNoticeTitle, { color: '#0369a1' }]}>Order Ready for Pickup</Text>
                          <Text style={[styles.statusNoticeSub, { color: '#0284c7' }]}>
                            Customer will arrive to pick up. Choose payment method and send payment request:
                          </Text>
                        </View>
                      </View>

                      {/* Payment Mode Selector */}
                      <View style={styles.paymentModeChipsRow}>
                        {['Cash', 'Online / UPI', 'Add to Book'].map((mode) => {
                          const isSelected = paymentMode === mode;
                          return (
                            <TouchableOpacity
                              key={mode}
                              style={[
                                styles.paymentModeChip,
                                isSelected && styles.paymentModeChipActive,
                              ]}
                              onPress={() => setPaymentMode(mode)}
                            >
                              <Text
                                style={[
                                  styles.paymentModeChipText,
                                  isSelected && styles.paymentModeChipTextActive,
                                ]}
                              >
                                {mode}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <TouchableOpacity
                        style={styles.requestPaymentBtn}
                        onPress={handleSendPaymentRequestAction}
                        disabled={isProcessingAction}
                        activeOpacity={0.8}
                      >
                        {isProcessingAction ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <>
                            <CreditCard size={18} color="#ffffff" />
                            <Text style={styles.requestPaymentBtnText}>
                              Send Payment Request (₹{finalPayableAmt.toFixed(2)})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.otpVerifyCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <ShieldCheck size={18} color="#15803d" />
                        <Text style={styles.otpVerifyTitle}>Customer Handover & OTP Verification</Text>
                      </View>
                      <Text style={styles.otpVerifySub}>
                        Payment Requested: <Text style={{ fontWeight: '800' }}>₹{Number(currentOrder.requestedAmount || finalPayableAmt).toFixed(2)}</Text> ({currentOrder.paymentMethod || 'Cash'})
                      </Text>

                      <View style={styles.otpInputContainer}>
                        <TextInput
                          style={styles.otpLargeInput}
                          keyboardType="number-pad"
                          maxLength={4}
                          placeholder="[ _ _ _ _ ]"
                          placeholderTextColor={colors.textMuted}
                          value={otpValue}
                          onChangeText={(val) => setOtpValue(val.replace(/\D/g, ''))}
                        />
                        <TouchableOpacity
                          style={styles.verifyOtpBtn}
                          onPress={handleVerifyOtpAction}
                          disabled={isProcessingAction}
                          activeOpacity={0.8}
                        >
                          {isProcessingAction ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <CheckCircle2 size={16} color="#ffffff" />
                              <Text style={styles.verifyOtpBtnText}>Verify OTP & Complete</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

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

          {/* Customer Card explicitly at the last with pickup note (for customer view only, shopkeeper has it at top) */}
          {!isShopkeeper && (
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
          )}

          {/* Fallback Non-shopkeeper Action Buttons if status is PENDING */}
          {!isShopkeeper && currentOrder.status === 'PENDING' && (onAccept || onDecline) && (
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

        {/* Decline Order Reason Modal */}
        <Modal visible={showDeclineModal} transparent animationType="fade" onRequestClose={() => setShowDeclineModal(false)}>
          <View style={styles.declineModalOverlay}>
            <View style={styles.declineModalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.declineModalTitle}>Decline Order #{orderNumber}</Text>
                <TouchableOpacity onPress={() => setShowDeclineModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.declineModalSub}>Please select a reason for declining:</Text>
              {[
                'Item out of stock',
                'Shop closing soon',
                'Too busy right now',
                'Other',
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.declineReasonOption,
                    declineReason === reason && styles.declineReasonOptionSelected,
                  ]}
                  onPress={() => setDeclineReason(reason)}
                >
                  <View style={[
                    styles.declineRadioCircle,
                    declineReason === reason && styles.declineRadioCircleSelected,
                  ]} />
                  <Text style={[
                    styles.declineReasonText,
                    declineReason === reason && styles.declineReasonTextSelected,
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {declineReason === 'Other' && (
                <TextInput
                  style={styles.declineReasonInput}
                  placeholder="Enter custom reason..."
                  placeholderTextColor={colors.textMuted}
                  value={customDeclineReason}
                  onChangeText={setCustomDeclineReason}
                />
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.declineCancelBtn}
                  onPress={() => setShowDeclineModal(false)}
                >
                  <Text style={styles.declineCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineConfirmBtn}
                  onPress={handleDeclineOrderAction}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.declineConfirmBtnText}>Confirm Decline</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  sectionHint: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemAvailabilityToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOutItemBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  markOutItemText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '800',
  },
  restoreItemBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  restoreItemText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
  },
  discountControlContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  discountControlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  customDiscountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customDiscountInput: {
    width: 65,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    padding: 2,
  },

  shopkeeperActionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    ...shadowMedium,
  },
  actionCardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  actionCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 10,
  },
  packingChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  packingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  packingChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  packingChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  packingChipTextActive: {
    color: '#ffffff',
  },
  declineOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: '#ffffff',
  },
  declineOutlineBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  acceptBigBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.success,
  },
  acceptBigBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  statusNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
  },
  statusNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
  },
  statusNoticeSub: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  markReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 10,
  },
  markReadyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentModeChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  paymentModeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  paymentModeChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: colors.primary,
  },
  paymentModeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  paymentModeChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  requestPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 4,
  },
  requestPaymentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  otpVerifyCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
  },
  otpVerifyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  otpVerifySub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  otpInputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  otpLargeInput: {
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 110,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 3,
    color: '#0f172a',
  },
  verifyOtpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 11,
    borderRadius: 8,
  },
  verifyOtpBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  declineModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  declineModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    ...shadowLarge,
  },
  declineModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  declineModalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  declineReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  declineReasonOptionSelected: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
  },
  declineRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  declineRadioCircleSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },
  declineReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  declineReasonTextSelected: {
    color: colors.danger,
    fontWeight: '700',
  },
  declineReasonInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    marginBottom: 8,
  },
  declineCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  declineCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  declineConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  declineConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
