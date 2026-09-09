import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  X,
  ChevronRight,
  ArrowRight,
  Search,
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  Eye,
  User,
  Package,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import {
  getShopOrders,
  acceptShopOrder,
  declineShopOrder,
  completeShopOrder,
  updateShopOrderItems,
  requestShopOrderPayment,
  verifyShopOrderOTP,
} from '../../api/client';
import Header from '../../components/Header';
import OrderDetailModal from '../../components/OrderDetailModal';
import { showErrorAlert } from '../../utils/errorHandler';
import { useTranslation } from '../../context/LanguageContext';

const DATE_OPTIONS = [
  { id: 'All', label: 'All Dates' },
  { id: 'Today', label: 'Today' },
  { id: 'Yesterday', label: 'Yesterday' },
  { id: 'Older (>24h)', label: 'Older (>24h)' },
];

const STATUS_OPTIONS = [
  { id: 'All', label: 'All Status' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Packing', label: 'Packing' },
  { id: 'Ready', label: 'Ready' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Cancelled', label: 'Cancelled' },
];

export default function OrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // Modal State
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
  const [orderActionType, setOrderActionType] = useState('ACCEPT'); // 'ACCEPT' | 'DECLINE'
  const [packingMinutes, setPackingMinutes] = useState(15);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get Payment & OTP state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentDiscount, setPaymentDiscount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [otpInputs, setOtpInputs] = useState({});
  const [otpSubmitting, setOtpSubmitting] = useState({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'Older (>24h)'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Packing' | 'Ready' | 'Completed' | 'Cancelled'
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isPastOrdersExpanded, setIsPastOrdersExpanded] = useState(false);

  const handleToggleItemUnavailable = async (ord, itemIndex) => {
    try {
      const items = typeof ord.itemsJSON === 'string'
        ? JSON.parse(ord.itemsJSON || '[]')
        : (ord.items || []);
      items[itemIndex].isUnavailable = !items[itemIndex].isUnavailable;
      await updateShopOrderItems(ord.id, items);
      loadOrders();
    } catch (e) {
      showErrorAlert(e, 'Item Availability');
    }
  };

  const handleOpenPaymentModal = (ord) => {
    setPaymentOrder(ord);
    setPaymentDiscount('0');
    setPaymentMode('Cash');
    setPaymentModalVisible(true);
  };

  const handleConfirmSendPayment = async () => {
    if (!paymentOrder) return;
    setPaymentSubmitting(true);
    try {
      await requestShopOrderPayment(paymentOrder.id, paymentDiscount, paymentMode);
      setPaymentModalVisible(false);
      loadOrders();
    } catch (e) {
      showErrorAlert(e, 'Payment Request');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleVerifyOtpHandover = async (orderId) => {
    const enteredOtp = (otpInputs[orderId] || '').trim();
    if (!enteredOtp || enteredOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit OTP code.');
      return;
    }

    setOtpSubmitting(prev => ({ ...prev, [orderId]: true }));
    try {
      await verifyShopOrderOTP(orderId, enteredOtp);
      // Immediately clear OTP input and optimistically mark as COMPLETED
      setOtpInputs(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', collectionStatus: 'COLLECTED', otpCode: null } : o));
      Alert.alert('Success', 'OTP Verified! Order completed and sale recorded.');
      loadOrders();
    } catch (e) {
      showErrorAlert(e, 'OTP Verification');
    } finally {
      setOtpSubmitting(prev => ({ ...prev, [orderId]: false }));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getAutoCancelCountdown = (createdAt) => {
    if (!createdAt) return null;
    const createdTime = new Date(createdAt).getTime();
    const expiryTime = createdTime + 45 * 60 * 1000;
    const diffMs = expiryTime - Date.now();
    if (diffMs <= 0) return 'Expired';
    const totalSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent && !orders.length) {
        setLoading(true);
      }
      const data = await getShopOrders();
      const validOrders = Array.isArray(data) ? data : [];
      setOrders(validOrders);
      setSelectedDetailOrder((prevSelected) => {
        if (!prevSelected) return null;
        const updated = validOrders.find((o) => o.id === prevSelected.id);
        return updated || prevSelected;
      });
    } catch (e) {
      console.error('Failed to load orders:', e);
      if (!silent) setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orders.length]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => {
      loadOrders(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOpenOrderModal = (order, type) => {
    setSelectedOrderForAction(order);
    setOrderActionType(type);
    setPackingMinutes(15);
    setDeclineReason('');
  };

  const handleConfirmOrderAction = async () => {
    if (!selectedOrderForAction) return;
    setSubmitting(true);
    try {
      if (orderActionType === 'ACCEPT') {
        await acceptShopOrder(selectedOrderForAction.id, packingMinutes);
      } else {
        await declineShopOrder(selectedOrderForAction.id, declineReason || 'Item out of stock');
      }
      setSelectedOrderForAction(null);
      await loadOrders();
    } catch (e) {
      showErrorAlert(e, 'Order Update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeShopOrder(orderId);
      Alert.alert('Success', 'Order marked as completed!');
      await loadOrders();
    } catch (e) {
      showErrorAlert(e, 'Complete Order');
    }
  };
  const handleMarkReady = handleCompleteOrder;

  const isDateMatch = (dateStr) => {
    if (!dateStr || dateFilter === 'All') return true;
    const itemDate = new Date(dateStr);
    const now = new Date();
    if (dateFilter === 'Today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'Yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      return itemDate.toDateString() === yest.toDateString();
    }
    if (dateFilter === 'Older (>24h)') {
      return Date.now() - itemDate.getTime() >= 24 * 60 * 60 * 1000;
    }
    return true;
  };

  const isStatusMatch = (status) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending') return status === 'PENDING';
    if (statusFilter === 'Packing') return status === 'ACCEPTED' || status === 'PACKING';
    if (statusFilter === 'Ready') return status === 'READY';
    if (statusFilter === 'Completed') return status === 'COMPLETED' || status === 'COLLECTED';
    if (statusFilter === 'Cancelled') {
      return ['CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED', 'NOT_COLLECTED'].includes(status);
    }
    return true;
  };

  const isTextMatch = (ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const ordNum = String(ord.orderNumber || ord.id || '').toLowerCase();
    const cName = String(ord.customerName || '').toLowerCase();
    const cPhone = String(ord.customerPhone || '').toLowerCase();
    const cShortId = String(ord.customerShortId || '').toLowerCase();
    return ordNum.includes(q) || cName.includes(q) || cPhone.includes(q) || cShortId.includes(q);
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const nowMs = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  const filteredOrders = safeOrders.filter((o) => {
    return isDateMatch(o.createdAt || o.date) && isStatusMatch(o.status) && isTextMatch(o);
  });

  const recentOrders = filteredOrders.filter(
    (o) => nowMs - new Date(o.createdAt || o.date).getTime() < twentyFourHoursMs && !['COLLECTED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED'].includes(o.status)
  );

  const pastOrders = filteredOrders.filter(
    (o) => nowMs - new Date(o.createdAt || o.date).getTime() >= twentyFourHoursMs || ['COLLECTED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED'].includes(o.status)
  );

  const renderOrderCard = (ord, isPast = false) => {
    const orderItems = Array.isArray(ord.itemsJSON)
      ? ord.itemsJSON
      : (() => { try { return JSON.parse(ord.itemsJSON || '[]'); } catch (e) { return Array.isArray(ord.items) ? ord.items : []; } })();

    const computedTotal = Number(
      ord.totalAmount ?? ord.total ?? ord.estimatedTotal ??
      orderItems.reduce((s, it) => s + (Number(it.amount || ((it.rate || it.price) * it.qty)) || 0), 0)
    ) || 0;

    const dateStr = new Date(ord.createdAt || ord.date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const orderAgeMs = nowMs - new Date(ord.createdAt || ord.date).getTime();
    const isOlderThan24h = orderAgeMs >= twentyFourHoursMs;

    const totalUnits = orderItems.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    const autoCancelCountdown = ord.status === 'PENDING' ? getAutoCancelCountdown(ord.createdAt) : null;

    return (
      <TouchableOpacity
        key={ord.id}
        style={styles.orderCard}
        onPress={() => setSelectedDetailOrder(ord)}
        activeOpacity={0.88}
      >
        {/* Card Header: Order #, Customer Info, Timestamp & Status */}
        <View style={styles.orderCardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.orderNumText}>{t('Order')} #{ord.orderNumber || ord.id}</Text>
              {ord.status === 'PENDING' && (
                <View style={styles.newOrderTag}>
                  <Text style={styles.newOrderTagText}>{t('NEW ORDER')}</Text>
                </View>
              )}
              {isOlderThan24h && (
                <View style={styles.historyBadge}>
                  <Clock size={10} color="#64748b" />
                  <Text style={styles.historyBadgeText}>{t('Past 24h')}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <User size={13} color={colors.textMuted} />
              <Text style={styles.orderCustName} numberOfLines={1}>
                {ord.customerName} ({ord.customerPhone})
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.orderDateText}>{dateStr}</Text>
            </View>

            {autoCancelCountdown && autoCancelCountdown !== 'Expired' && (
              <View style={styles.autoCancelPill}>
                <Clock size={10} color="#b45309" />
                <Text style={styles.autoCancelPillText}>Auto-cancels in: {autoCancelCountdown}</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.orderStatusPill,
              ord.status === 'PENDING'
                ? styles.statusPillPending
                : (ord.status === 'ACCEPTED' || ord.status === 'PACKING')
                ? styles.statusPillAccepted
                : ord.status === 'READY'
                ? { backgroundColor: '#e0f2fe' }
                : (ord.status === 'COMPLETED' || ord.status === 'COLLECTED')
                ? styles.statusPillCompleted
                : styles.statusPillDeclined,
            ]}
          >
            <Text
              style={[
                styles.orderStatusPillText,
                ord.status === 'PENDING' && { color: '#b45309' },
                ord.status === 'READY' && { color: '#0369a1' },
                (ord.status === 'COMPLETED' || ord.status === 'COLLECTED') && { color: '#15803d' },
                (ord.status === 'NOT_COLLECTED' || ord.status === 'CANCELLED_BY_CUSTOMER' || ord.status === 'AUTO_CANCELLED_EXPIRED' || ord.status === 'DECLINED') && { color: '#b91c1c' },
              ]}
            >
              {ord.status === 'PENDING'
                ? t('New Order')
                : ord.status === 'PACKING'
                ? `${t('Packing')} (${ord.packingMinutes}m)`
                : ord.status === 'READY'
                ? t('Ready (Waiting Customer)')
                : ord.status === 'COMPLETED'
                ? t('Order Completed')
                : ord.status === 'COLLECTED'
                ? t('Customer Collected')
                : ord.status === 'NOT_COLLECTED'
                ? t('Marked Not Collected')
                : ord.status === 'CANCELLED_BY_CUSTOMER'
                ? t('Cancelled by Customer')
                : ord.status === 'AUTO_CANCELLED_EXPIRED'
                ? t('Auto-cancelled (Expired)')
                : ord.status}
            </Text>
          </View>
        </View>

        {ord.status === 'AUTO_CANCELLED_EXPIRED' && (
          <View style={styles.expiredWarningBox}>
            <XCircle size={13} color="#b91c1c" />
            <Text style={styles.expiredWarningText}>
              {t('Order automatically cancelled because 45 minutes elapsed without acceptance.')}
            </Text>
          </View>
        )}

        {/* Clean Items Count & Total Summary Row (Items only shown inside View Order modal) */}
        <View style={styles.orderSummaryRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Package size={15} color={colors.textSecondary} />
            <Text style={styles.orderSummaryText}>
              {orderItems.length} {orderItems.length === 1 ? t('Item') : t('Items')} • {totalUnits} {t('Units')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Text style={styles.orderTotalLabel}>{t('Total Payable:')}</Text>
            <Text style={styles.orderTotalValue}>₹{(Number(computedTotal) || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Finalized Status Indicators if applicable */}
        {ord.status === 'COMPLETED' && (
          <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} color="#15803d" />
            <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '700' }}>
              {t('✓ Order Completed & Handed Over')}
            </Text>
          </View>
        )}

        {ord.status === 'COLLECTED' && (
          <View style={{ backgroundColor: '#f0fdf4', padding: 7, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>
              {t('Order finalized and collected by customer. (Locked)')}
            </Text>
          </View>
        )}

        {ord.status === 'NOT_COLLECTED' && (
          <View style={{ backgroundColor: '#fef2f2', padding: 7, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#b91c1c', fontWeight: '700' }}>
              Customer marked as not collected. (Locked)
            </Text>
          </View>
        )}

        {ord.status === 'CANCELLED_BY_CUSTOMER' && (
          <View style={{ backgroundColor: '#fef2f2', padding: 7, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#b91c1c', fontWeight: '700' }}>
              Customer cancelled / took back this order. (Locked)
            </Text>
          </View>
        )}

        {/* Clean, Full-Width "View Order" Action Button */}
        <TouchableOpacity
          style={styles.viewOrderFullBtn}
          onPress={() => setSelectedDetailOrder(ord)}
          activeOpacity={0.8}
        >
          <Eye size={16} color="#ffffff" />
          <Text style={styles.viewOrderFullBtnText}>{t('View Order')}</Text>
          <ChevronRight size={16} color="#ffffff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header subtitle={t('Incoming Orders & Live Packing')} />

      <View style={styles.content}>
        {/* Order Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={[styles.statBox, { borderLeftColor: colors.warning }]}>
            <Text style={styles.statLabel}>{t('Pending')}</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'PENDING').length}
            </Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: colors.primary }]}>
            <Text style={styles.statLabel}>{t('Packing')}</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PACKING').length}
            </Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: colors.success }]}>
            <Text style={styles.statLabel}>{t('Completed')}</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'READY' || o.status === 'COMPLETED').length}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search order #, customer, phone...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Date & Status Filters in Same Row */}
        <View style={{ position: 'relative', zIndex: 50, marginBottom: 10 }}>
          <View style={styles.dropdownsRow}>
            {/* Date Filter Dropdown */}
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                (showDateDropdown || dateFilter !== 'All') && styles.dropdownTriggerActive,
              ]}
              onPress={() => {
                setShowDateDropdown((prev) => !prev);
                setShowStatusDropdown(false);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 4 }}>
                <Calendar size={14} color={dateFilter !== 'All' ? colors.primary : colors.textSecondary} />
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    dateFilter !== 'All' && styles.dropdownTriggerTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t(dateFilter === 'All' ? 'All Dates' : dateFilter)}
                </Text>
              </View>
              <ChevronDown
                size={14}
                color={dateFilter !== 'All' ? colors.primary : colors.textMuted}
                style={{ transform: [{ rotate: showDateDropdown ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {/* Status Filter Dropdown */}
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                (showStatusDropdown || statusFilter !== 'All') && styles.dropdownTriggerActive,
              ]}
              onPress={() => {
                setShowStatusDropdown((prev) => !prev);
                setShowDateDropdown(false);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 4 }}>
                <Filter size={14} color={statusFilter !== 'All' ? colors.primary : colors.textSecondary} />
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    statusFilter !== 'All' && styles.dropdownTriggerTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t(statusFilter === 'All' ? 'All Status' : statusFilter)}
                </Text>
              </View>
              <ChevronDown
                size={14}
                color={statusFilter !== 'All' ? colors.primary : colors.textMuted}
                style={{ transform: [{ rotate: showStatusDropdown ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </View>

          {/* Date Dropdown Menu */}
          {showDateDropdown && (
            <View style={[styles.dropdownMenu, { left: 0, width: '48%' }]}>
              {DATE_OPTIONS.map((opt) => {
                const isSelected = dateFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setDateFilter(opt.id);
                      setShowDateDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownMenuItemText,
                        isSelected && styles.dropdownMenuItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t(opt.label)}
                    </Text>
                    {isSelected && <Check size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <View style={[styles.dropdownMenu, { right: 0, width: '48%' }]}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = statusFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setStatusFilter(opt.id);
                      setShowStatusDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownMenuItemText,
                        isSelected && styles.dropdownMenuItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t(opt.label)}
                    </Text>
                    {isSelected && <Check size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Dismiss Backdrop when dropdown is open */}
        {(showDateDropdown || showStatusDropdown) && (
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowDateDropdown(false);
              setShowStatusDropdown(false);
            }}
          />
        )}

        {/* Orders ScrollView */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Section 1: Active Orders (<24h) */}
            {dateFilter !== 'Older (>24h)' && (
              <View style={{ marginBottom: 14 }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('Active Orders (<24h)')}</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#e0f2fe' }]}>
                    <Text style={[styles.countBadgeText, { color: '#0369a1' }]}>
                      {recentOrders.length} {t('Active')}
                    </Text>
                  </View>
                </View>
                {recentOrders.length === 0 ? (
                  <View style={styles.sectionEmptyBox}>
                    <Text style={styles.sectionEmptyText}>{t('No active orders under 24 hours.')}</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {recentOrders.map((ord) => renderOrderCard(ord, false))}
                  </View>
                )}
              </View>
            )}

            {/* Section 2: Past Orders (>24h & Finalized) - Collapsible Group */}
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={[
                  styles.sectionHeaderClickable,
                  isPastOrdersExpanded && styles.sectionHeaderExpanded,
                ]}
                onPress={() => setIsPastOrdersExpanded(!isPastOrdersExpanded)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sectionTitle}>{t('Past Orders (>24h & Finalized)')}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {pastOrders.length} {t('History')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sectionSub}>
                    {isPastOrdersExpanded
                      ? t('Tap to collapse past orders')
                      : t('Tap to view grouped past orders')}
                  </Text>
                </View>
                <View style={styles.chevronToggleBox}>
                  {isPastOrdersExpanded ? (
                    <ChevronUp size={20} color={colors.primary} />
                  ) : (
                    <ChevronDown size={20} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              {isPastOrdersExpanded && (
                <View style={{ marginTop: 10 }}>
                  {pastOrders.length === 0 ? (
                    <View style={styles.sectionEmptyBox}>
                      <Text style={styles.sectionEmptyText}>{t('No past orders matching filters.')}</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {pastOrders.map((ord) => renderOrderCard(ord, true))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {recentOrders.length === 0 && pastOrders.length === 0 && (
              <View style={styles.emptyContainer}>
                <ShoppingBag size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptySub}>
                  No orders match your selected search or filter criteria.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Accept / Decline Modal */}
      <Modal
        visible={!!selectedOrderForAction}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOrderForAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {orderActionType === 'ACCEPT' ? 'Accept Order & Set Packing Time' : 'Decline Order'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOrderForAction(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {orderActionType === 'ACCEPT' ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.modalLabel}>Estimated Packing Time (Minutes):</Text>
                <View style={styles.packingTimesRow}>
                  {[10, 15, 20, 30].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.packingTimeBtn,
                        packingMinutes === m && styles.packingTimeBtnActive,
                      ]}
                      onPress={() => setPackingMinutes(m)}
                    >
                      <Text
                        style={[
                          styles.packingTimeBtnText,
                          packingMinutes === m && styles.packingTimeBtnTextActive,
                        ]}
                      >
                        {m}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.modalLabel}>Reason for declining:</Text>
                <TextInput
                  style={styles.declineInput}
                  placeholder="e.g. Item out of stock"
                  value={declineReason}
                  onChangeText={setDeclineReason}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedOrderForAction(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  orderActionType === 'ACCEPT' ? styles.btnSuccess : styles.btnDanger,
                ]}
                onPress={handleConfirmOrderAction}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {submitting
                    ? 'Saving...'
                    : orderActionType === 'ACCEPT'
                    ? 'Confirm & Pack'
                    : 'Decline Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Get Payment Modal */}
      <Modal
        visible={paymentModalVisible && !!paymentOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Request Payment #{paymentOrder?.orderNumber}
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Order Total:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700' }}>₹{(Number(paymentOrder?.estimatedTotal) || 0).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Discount:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>-₹{(parseFloat(paymentDiscount) || 0).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800' }}>Final Amount:</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.success }}>
                  ₹{Math.max(0, (Number(paymentOrder?.estimatedTotal) || 0) - (parseFloat(paymentDiscount) || 0)).toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>Discount (₹):</Text>
            <TextInput
              style={styles.declineInput}
              keyboardType="numeric"
              placeholder="0"
              value={paymentDiscount}
              onChangeText={setPaymentDiscount}
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Payment Mode:</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {['Cash', 'Online / UPI', 'Add to Book'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: paymentMode === mode ? 2 : 1,
                    borderColor: paymentMode === mode ? colors.primary : colors.border,
                    backgroundColor: paymentMode === mode ? '#eff6ff' : '#fff',
                  }}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={{ fontSize: 13, fontWeight: paymentMode === mode ? '700' : '400', color: colors.text }}>
                    {mode === 'Add to Book' ? 'Add to Book (Khata Credit)' : mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.btnSuccess]}
                onPress={handleConfirmSendPayment}
                disabled={paymentSubmitting}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {paymentSubmitting ? 'Sending...' : 'Confirm Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Details & Timestamped Journey Modal */}
      <OrderDetailModal
        visible={!!selectedDetailOrder}
        order={selectedDetailOrder}
        isShopkeeper={true}
        onClose={() => setSelectedDetailOrder(null)}
        onRefresh={loadOrders}
        onOrderUpdated={loadOrders}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadowStyle,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  dropdownsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 38,
    ...shadowStyle,
  },
  dropdownTriggerActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dropdownTriggerTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    zIndex: 100,
    elevation: 10,
    ...shadowLarge,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownMenuItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownMenuItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  dropdownMenuItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  sectionHeaderExpanded: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderColor: colors.primary,
  },
  chevronToggleBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  sectionEmptyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  sectionEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  historyBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  orderCustName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderDateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  newOrderTag: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newOrderTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusPillAccepted: {
    backgroundColor: '#eff6ff',
  },
  statusPillCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusPillDeclined: {
    backgroundColor: '#fee2e2',
  },
  orderStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  orderSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  orderTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  orderTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  autoCancelWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  autoCancelWarningText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
  },
  expiredWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  expiredWarningText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  autoCancelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  autoCancelPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  viewOrderFullBtn: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 14,
  },
  viewOrderFullBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  orderActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  declineBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    ...shadowLarge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  modalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  packingTimesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  packingTimeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packingTimeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packingTimeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  packingTimeBtnTextActive: {
    color: '#ffffff',
  },
  declineInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSuccess: {
    backgroundColor: colors.success,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  modalConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
