import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Store,
  MapPin,
  TrendingUp,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerOrders,
  getCustomerHistory,
  cancelCustomerOrder,
  updateOrderCollection,
} from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../components/Header';
import ReceiptModal from '../../components/ReceiptModal';
import OrderDetailModal from '../../components/OrderDetailModal';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function CustomerOrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('All');
  const [nowTick, setNowTick] = useState(Date.now());

  // Digital Receipt & Timeline Order Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);

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

  const loadData = useCallback(async () => {
    try {
      const [ordersData, historyData] = await Promise.all([
        getCustomerOrders().catch((e) => {
          console.warn('Orders fetch error:', e);
          return [];
        }),
        getCustomerHistory().catch(() => ({ sales: [] })),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setSales(Array.isArray(historyData?.sales) ? historyData.sales : []);
    } catch (e) {
      console.error('Failed to load orders data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order / Take Back',
      'Are you sure you want to cancel / take back this order? Once cancelled, this action is final and locked.',
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelCustomerOrder(orderId);
              Alert.alert('Success', 'Order cancelled successfully.');
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to cancel order.');
            }
          },
        },
      ]
    );
  };

  const handleCollectionStatus = async (orderId, collectionStatus) => {
    const isCollected = collectionStatus === 'COLLECTED';
    Alert.alert(
      isCollected ? 'Confirm Collection' : 'Mark Not Collected',
      isCollected
        ? 'Confirm that you have collected this order? Once marked, this action is permanently locked.'
        : 'Confirm that this order was NOT collected? Once marked, this action is permanently locked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateOrderCollection(orderId, collectionStatus);
              Alert.alert('Success', 'Collection status recorded.');
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to update collection status.');
            }
          },
        },
      ]
    );
  };

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
    if (dateFilter === 'Month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Split orders
  const nowMs = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const recentOrders = orders.filter(
    (o) => nowMs - new Date(o.createdAt || o.date).getTime() < twentyFourHoursMs
  );
  const pastOrders = orders.filter(
    (o) => nowMs - new Date(o.createdAt || o.date).getTime() >= twentyFourHoursMs
  );

  const totalSpent = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const filteredSales = sales.filter((s) => isDateMatch(s.date));
  const filteredPastOrders = pastOrders.filter((o) => isDateMatch(o.createdAt || o.date));
  const filteredRecentOrders = recentOrders.filter((o) => isDateMatch(o.createdAt || o.date));

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="GI SHOP"
        subtitle="All Orders & Receipts"
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Loading your orders & receipts...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        >
          {/* Lifetime Purchases Banner */}
          <View style={styles.lifetimeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lifetimeLabel}>Total Lifetime Purchases</Text>
              <Text style={styles.lifetimeValue}>₹{(Number(totalSpent) || 0).toFixed(2)}</Text>
              <Text style={styles.lifetimeSub}>
                {recentOrders.length} Active • {pastOrders.length + sales.length} Total in All Orders
              </Text>
            </View>
            <View style={styles.lifetimeIconBox}>
              <TrendingUp size={24} color="#fff" />
            </View>
          </View>

          {/* Date Filter Pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 12 }}>
            {['All', 'Today', 'Yesterday', 'Month'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  dateFilter === f && styles.filterChipActive,
                ]}
                onPress={() => setDateFilter(f)}
              >
                <Text style={[styles.filterChipText, dateFilter === f && styles.filterChipTextActive]}>
                  {f === 'Month' ? 'This Month' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <SkeletonLoader type="orderCard" count={3} />
          ) : (
            <>
              {/* SECTION 1: ACTIVE GROCERY REQUESTS (<24H) */}
          <View style={{ marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Grocery Requests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredRecentOrders.length} Active</Text>
              </View>
            </View>

            {filteredRecentOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No active orders placed in the last 24 hours.</Text>
              </View>
            ) : (
              filteredRecentOrders.map((order) => {
                const items = Array.isArray(order.itemsJSON)
                  ? order.itemsJSON
                  : (() => { try { return JSON.parse(order.itemsJSON || '[]'); } catch (e) { return []; } })();

                const computedTotal = Number(
                  order.totalAmount ?? order.total ?? order.estimatedTotal ??
                  items.reduce((s, it) => s + (Number(it.amount || (it.rate * it.qty)) || 0), 0)
                ) || 0;

                return (
                  <View key={`active-${order.id}`} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderShopName}>{order.shopName}</Text>
                        <Text style={styles.orderTime}>
                          Order #{order.orderNumber} •{' '}
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          order.status === 'PENDING'
                            ? { backgroundColor: '#fef3c7' }
                            : order.status === 'PACKING'
                            ? { backgroundColor: '#ffedd5' }
                            : order.status === 'READY'
                            ? { backgroundColor: '#dcfce7' }
                            : order.status === 'AUTO_CANCELLED_EXPIRED'
                            ? { backgroundColor: '#fee2e2' }
                            : { backgroundColor: '#f1f5f9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            order.status === 'PENDING'
                              ? { color: '#b45309' }
                              : order.status === 'PACKING'
                              ? { color: '#c2410c' }
                              : order.status === 'READY'
                              ? { color: '#15803d' }
                              : order.status === 'AUTO_CANCELLED_EXPIRED'
                              ? { color: '#b91c1c' }
                              : { color: '#475569' },
                          ]}
                        >
                          {order.status === 'PENDING' && `⏳ PENDING (${getAutoCancelCountdown(order.createdAt)})`}
                          {order.status === 'PACKING' && `⏳ PACKING (~${order.packingMinutes || 15}m)`}
                          {order.status === 'READY' && '✓ READY FOR PICKUP'}
                          {order.status === 'COLLECTED' && '✓ COLLECTED'}
                          {order.status === 'NOT_COLLECTED' && '✗ NOT COLLECTED'}
                          {order.status === 'CANCELLED_BY_CUSTOMER' && '🚫 CANCELLED'}
                          {order.status === 'AUTO_CANCELLED_EXPIRED' && '⛔ EXPIRED (45m)'}
                          {order.status === 'DECLINED' && '❌ DECLINED'}
                        </Text>
                      </View>
                    </View>

                    {/* Auto-cancel 45-min live timer banner */}
                    {order.status === 'PENDING' && (
                      <View style={styles.autoCancelBox}>
                        <Clock size={13} color="#b45309" />
                        <Text style={styles.autoCancelText}>
                          Acceptance Window: <Text style={{ fontWeight: '700' }}>Auto-cancels in {getAutoCancelCountdown(order.createdAt)}</Text> if not accepted by shopkeeper
                        </Text>
                      </View>
                    )}

                    {/* Auto-cancelled expired alert */}
                    {order.status === 'AUTO_CANCELLED_EXPIRED' && (
                      <View style={styles.expiredBox}>
                        <AlertTriangle size={13} color="#b91c1c" />
                        <Text style={styles.expiredText}>
                          Order auto-cancelled: Shopkeeper did not accept within 45 minutes.
                        </Text>
                      </View>
                    )}

                    {/* Items Box */}
                    <View style={styles.itemsBox}>
                      {items.map((it, idx) => {
                        const isUnavail = !!it.isUnavailable;
                        return (
                          <View key={idx} style={styles.itemLine}>
                            <Text style={[styles.itemName, isUnavail && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
                              {it.item?.name || it.name} x {it.qty} {it.item?.unit || ''} {isUnavail ? '(Unavailable)' : ''}
                            </Text>
                            <Text style={[styles.itemPrice, isUnavail && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
                              ₹{(it.amount || (it.rate * it.qty) || 0).toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Total Payable:</Text>
                        <Text style={styles.totalValue}>₹{(Number(computedTotal) || 0).toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Customer 4-Digit OTP Box when Ready */}
                    {(order.status === 'READY' || order.status === 'COMPLETED') && (
                      <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 2 }}>
                          🎉 Your Order is Ready for Pickup!
                        </Text>
                        <Text style={{ fontSize: 11, color: '#15803d', marginBottom: 6 }}>
                          Payment Mode: <Text style={{ fontWeight: '700' }}>{order.paymentMethod || 'Cash'}</Text> • Amount: <Text style={{ fontWeight: '700' }}>₹{(Number(order.requestedAmount || computedTotal) || 0).toFixed(2)}</Text>
                        </Text>

                        {/* 4-Digit OTP Display */}
                        <View style={{ backgroundColor: '#ffffff', borderColor: '#22c55e', borderWidth: 2, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Handover 4-Digit OTP</Text>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#15803d', letterSpacing: 4 }}>
                              {order.otpCode || '----'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: colors.textMuted, maxWidth: 130, textAlign: 'right' }}>
                            Share this 4-digit code with shopkeeper at pickup counter
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Timeline & Details Action */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#eff6ff',
                          borderColor: '#bfdbfe',
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => setSelectedDetailOrder(order)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}>
                          📜 View Timeline &amp; Details
                        </Text>
                      </TouchableOpacity>
                      {(order.status === 'PENDING' || order.status === 'PACKING') && (
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => handleCancelOrder(order.id)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel / Take Back Order</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* SECTION 2: PAST ORDERS & IN-STORE RECEIPTS */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past Orders & Receipts</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {filteredPastOrders.length + filteredSales.length} Total
                </Text>
              </View>
            </View>

            {filteredPastOrders.length === 0 && filteredSales.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No past orders or purchase receipts found.</Text>
              </View>
            ) : (
              <>
                {/* Past Sales Receipts */}
                {filteredSales.map((sale) => (
                  <View key={`sale-${sale.id}`} style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptShopName}>{sale.shopName}</Text>
                        <Text style={styles.receiptDate}>
                          Bill #{sale.id} • {new Date(sale.date).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.receiptTotal}>₹{(Number(sale?.total) || 0).toFixed(2)}</Text>
                        <Text style={styles.receiptMethod}>{sale.paymentMethod}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.viewReceiptBtn}
                      onPress={() => setSelectedReceipt(sale)}
                    >
                      <FileText size={13} color={colors.primary} />
                      <Text style={styles.viewReceiptBtnText}>View Digital Receipt</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Past Orders */}
                {filteredPastOrders.map((order) => {
                  const items = Array.isArray(order.itemsJSON)
                    ? order.itemsJSON
                    : (() => { try { return JSON.parse(order.itemsJSON || '[]'); } catch (e) { return []; } })();

                  const computedTotal = Number(
                    order.totalAmount ?? order.total ?? order.estimatedTotal ??
                    items.reduce((s, it) => s + (Number(it.amount || (it.rate * it.qty)) || 0), 0)
                  ) || 0;

                  return (
                    <View key={`past-order-${order.id}`} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderShopName}>{order.shopName}</Text>
                          <Text style={styles.orderTime}>
                            Order #{order.orderNumber} • {new Date(order.createdAt).toLocaleDateString('en-IN')}
                          </Text>
                        </View>
                        <Text style={styles.receiptTotal}>₹{(Number(computedTotal) || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
          </>
          )}
        </ScrollView>
      )}

      {/* DIGITAL RECEIPT MODAL */}
      <ReceiptModal visible={!!selectedReceipt} receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />

      {/* ORDER TIMELINE & DETAILS MODAL */}
      <OrderDetailModal visible={!!selectedDetailOrder} order={selectedDetailOrder} onClose={() => setSelectedDetailOrder(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifetimeBanner: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lifetimeLabel: {
    fontSize: 12,
    color: '#d1fae5',
    fontWeight: '600',
  },
  lifetimeValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginVertical: 2,
  },
  lifetimeSub: {
    fontSize: 11,
    color: '#a7f3d0',
  },
  lifetimeIconBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderColor: colors.border,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderColor: colors.border,
    borderWidth: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderShopName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  orderTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  autoCancelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    gap: 6,
  },
  autoCancelText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
  },
  expiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    gap: 6,
  },
  expiredText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  itemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.success,
  },
  confirmCollectBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  confirmCollectTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: colors.border,
    borderWidth: 1,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptShopName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  receiptDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  receiptTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  receiptMethod: {
    fontSize: 10,
    color: colors.textMuted,
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  viewReceiptBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  emptyCardText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
