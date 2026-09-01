import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
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
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import {
  getShopOrders,
  acceptShopOrder,
  declineShopOrder,
  completeShopOrder,
} from '../../api/client';
import Header from '../../components/Header';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // Modal State
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [orderActionType, setOrderActionType] = useState('ACCEPT'); // 'ACCEPT' | 'DECLINE'
  const [packingMinutes, setPackingMinutes] = useState(15);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadOrders = useCallback(async () => {
    try {
      const data = await getShopOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load orders:', e);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
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
      Alert.alert('Error', e.message || 'Failed to update order.');
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
      Alert.alert('Error', e.message || 'Failed to complete order.');
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header subtitle="Incoming Orders & Live Packing" />

      <View style={styles.content}>
        {/* Order Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={[styles.statBox, { borderLeftColor: colors.warning }]}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'PENDING').length}
            </Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: colors.primary }]}>
            <Text style={styles.statLabel}>Packing</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PACKING').length}
            </Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: colors.success }]}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>
              {safeOrders.filter((o) => o.status === 'READY' || o.status === 'COMPLETED').length}
            </Text>
          </View>
        </View>

        {/* Orders List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={safeOrders}
            keyExtractor={(item) => item.id?.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: ord }) => {
              const orderItems = typeof ord.itemsJSON === 'string'
                ? JSON.parse(ord.itemsJSON || '[]')
                : (ord.items || []);
              const dateStr = new Date(ord.createdAt || ord.date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <View style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderNumText}>Order #{ord.orderNumber || ord.id}</Text>
                      <Text style={styles.orderCustName}>
                        {ord.customerName} ({ord.customerPhone})
                      </Text>
                      <Text style={styles.orderDateText}>{dateStr}</Text>
                    </View>

                    <View
                      style={[
                        styles.orderStatusPill,
                        ord.status === 'PENDING'
                          ? styles.statusPillPending
                          : (ord.status === 'ACCEPTED' || ord.status === 'PACKING')
                          ? styles.statusPillAccepted
                          : (ord.status === 'READY' || ord.status === 'COMPLETED')
                          ? { backgroundColor: '#e0f2fe' }
                          : ord.status === 'COLLECTED'
                          ? styles.statusPillCompleted
                          : styles.statusPillDeclined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderStatusPillText,
                          (ord.status === 'READY' || ord.status === 'COMPLETED') && { color: '#0369a1' },
                          ord.status === 'COLLECTED' && { color: '#15803d' },
                          (ord.status === 'NOT_COLLECTED' || ord.status === 'CANCELLED_BY_CUSTOMER' || ord.status === 'AUTO_CANCELLED_EXPIRED' || ord.status === 'DECLINED') && { color: '#b91c1c' },
                        ]}
                      >
                        {ord.status === 'PENDING'
                          ? `⏳ Pending (${getAutoCancelCountdown(ord.createdAt)})`
                          : ord.status === 'PACKING'
                          ? `⏳ Packing (${ord.packingMinutes}m)`
                          : (ord.status === 'READY' || ord.status === 'COMPLETED')
                          ? '📦 Ready (Waiting Customer)'
                          : ord.status === 'COLLECTED'
                          ? '✓ Customer Collected'
                          : ord.status === 'NOT_COLLECTED'
                          ? '✗ Marked Not Collected'
                          : ord.status === 'CANCELLED_BY_CUSTOMER'
                          ? '🚫 Cancelled by Customer'
                          : ord.status === 'AUTO_CANCELLED_EXPIRED'
                          ? '⛔ Auto-cancelled (45m Expired)'
                          : ord.status}
                      </Text>
                    </View>
                  </View>

                  {/* Auto-cancel warning banner for Shopkeeper */}
                  {ord.status === 'PENDING' && (
                    <View style={styles.autoCancelWarningBox}>
                      <Clock size={13} color="#b45309" />
                      <Text style={styles.autoCancelWarningText}>
                        ⚠️ <Text style={{ fontWeight: '700' }}>Accept within {getAutoCancelCountdown(ord.createdAt)}</Text> or order will be automatically cancelled.
                      </Text>
                    </View>
                  )}

                  {ord.status === 'AUTO_CANCELLED_EXPIRED' && (
                    <View style={styles.expiredWarningBox}>
                      <XCircle size={13} color="#b91c1c" />
                      <Text style={styles.expiredWarningText}>
                        Order automatically cancelled because 45 minutes elapsed without acceptance.
                      </Text>
                    </View>
                  )}

                  {/* Order Items */}
                  <View style={styles.orderItemsList}>
                    {orderItems.map((it, idx) => (
                      <View key={idx} style={styles.orderItemLine}>
                        <Text style={styles.orderItemName}>
                          • {it.item?.name || it.name} ({it.qty} {it.item?.unit || it.unit})
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          ₹{(it.amount || ((it.rate || it.price) * it.qty) || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalLabel}>Total Payable:</Text>
                    <Text style={styles.orderTotalValue}>₹{(ord.estimatedTotal || ord.total || 0).toFixed(2)}</Text>
                  </View>

                  {/* Action Buttons */}
                  {ord.status === 'PENDING' && (
                    <View style={styles.orderActionsRow}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleOpenOrderModal(ord, 'DECLINE')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleOpenOrderModal(ord, 'ACCEPT')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.acceptBtnText}>Accept &amp; Pack</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(ord.status === 'ACCEPTED' || ord.status === 'PACKING') && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteOrder(ord.id)}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={16} color="#ffffff" />
                      <Text style={styles.completeBtnText}>Mark as Ready / Packed</Text>
                    </TouchableOpacity>
                  )}

                  {(ord.status === 'READY' || ord.status === 'COMPLETED') && (
                    <View style={{ backgroundColor: '#f0f9ff', padding: 8, borderRadius: 8, marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#0369a1', fontWeight: '600' }}>
                        ⏳ Marked ready. Waiting for customer to confirm collection.
                      </Text>
                    </View>
                  )}

                  {ord.status === 'COLLECTED' && (
                    <View style={{ backgroundColor: '#f0fdf4', padding: 8, borderRadius: 8, marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>
                        ✓ Order finalized and collected by customer. (Locked)
                      </Text>
                    </View>
                  )}

                  {ord.status === 'NOT_COLLECTED' && (
                    <View style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#b91c1c', fontWeight: '700' }}>
                        ✗ Customer marked as not collected. (Locked)
                      </Text>
                    </View>
                  )}

                  {ord.status === 'CANCELLED_BY_CUSTOMER' && (
                    <View style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#b91c1c', fontWeight: '700' }}>
                        🚫 Customer cancelled / took back this order. (Locked)
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ShoppingBag size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Orders Yet</Text>
                <Text style={styles.emptySub}>
                  When customers in your city place grocery orders, they will appear here.
                </Text>
              </View>
            }
          />
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
    gap: 8,
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
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
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
  orderItemsList: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 8,
    gap: 4,
    marginBottom: 10,
  },
  orderItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderItemName: {
    fontSize: 12,
    color: colors.text,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  orderTotalValue: {
    fontSize: 16,
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
  orderActionsRow: {
    flexDirection: 'row',
    gap: 8,
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
