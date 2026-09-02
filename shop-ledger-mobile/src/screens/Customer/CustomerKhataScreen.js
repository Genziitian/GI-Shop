import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Phone,
  MessageCircle,
  Plus,
  X,
  FileText,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Store,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getCustomerKhata, getCustomerShopKhata } from '../../api/client';
import Header from '../../components/Header';
import ReceiptModal from '../../components/ReceiptModal';
import CustomerProfileModal from '../../components/CustomerProfileModal';

export default function CustomerKhataScreen({ navigation }) {
  const { user } = useAuth();
  const [khataOverview, setKhataOverview] = useState({ overallDue: 0, stores: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Specific Store Statement Modal
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeStatement, setStoreStatement] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('All');

  // Digital Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const loadKhata = useCallback(async () => {
    try {
      const data = await getCustomerKhata();
      setKhataOverview(data || { overallDue: 0, stores: [] });
    } catch (e) {
      console.error('Failed to load customer khata:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKhata();
  }, [loadKhata]);

  const openStoreStatement = async (store) => {
    setSelectedStore(store);
    setStatementLoading(true);
    try {
      const data = await getCustomerShopKhata(store.shopId || store.id);
      setStoreStatement(data);
    } catch (e) {
      console.error('Failed to load statement:', e);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleStartNewOrder = (store) => {
    setSelectedStore(null);
    navigation.navigate('CustomerExplore', { openShopId: store.shopId || store.id });
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

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="GI SHOP"
        subtitle="My Khata & Store Credits"
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Loading your store ledgers...</Text>
        </View>
      ) : (
        <FlatList
          data={khataOverview.stores}
          keyExtractor={(item) => `khata-store-${item.shopId}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadKhata();
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {/* Customer Identity Card */}
              <TouchableOpacity
                style={styles.profileCard}
                onPress={() => setShowProfileModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarIconBox}>
                  <User size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.profileName}>{user?.name || 'Customer'}</Text>
                    <View style={styles.editProfileBadge}>
                      <Text style={styles.editProfileBadgeText}>✏️ Edit Profile</Text>
                    </View>
                  </View>
                  <Text style={styles.profileSub}>
                    Short ID: <Text style={{ color: colors.primary, fontWeight: '700' }}>{user?.shortId || 'N/A'}</Text> • {user?.phone}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Total Due Banner */}
              <View style={styles.totalDueCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.totalDueLabel}>Total Store Credit Due</Text>
                  <Text
                    style={[
                      styles.totalDueValue,
                      { color: khataOverview.overallDue > 0 ? '#ef4444' : '#22c55e' },
                    ]}
                  >
                    ₹{khataOverview.overallDue.toFixed(2)}
                  </Text>
                  <Text style={styles.totalDueSub}>
                    {khataOverview.stores.length} Enrolled Stores •{' '}
                    {khataOverview.stores.filter((s) => s.totalDue > 0).length} with Due
                  </Text>
                </View>
                <View style={styles.totalDueIconBox}>
                  <BookOpen size={24} color="#38bdf8" />
                </View>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Enrolled Stores</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{khataOverview.stores.length} Stores</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <BookOpen size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Khata Records Found</Text>
              <Text style={styles.emptySub}>
                When local shopkeepers bill your purchases with "Add to Book" or when you place orders, your store credit ledger will appear here.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('CustomerExplore')}
              >
                <Store size={16} color="#fff" />
                <Text style={styles.exploreBtnText}>Explore Local Shops</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: st }) => (
            <View
              style={[
                styles.storeCard,
                { borderLeftColor: st.totalDue > 0 ? '#ef4444' : '#22c55e' },
              ]}
            >
              <View style={styles.storeHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.storeName}>{st.shopName}</Text>
                    <View style={styles.shortIdBadge}>
                      <Text style={styles.shortIdBadgeText}>ID: {st.shortId || `shp${st.shopId}`}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                      {st.isOpen ? '• 🟢 Open' : '• 🔴 Closed'}
                    </Text>
                  </View>
                  <Text style={styles.storeLoc}>{st.shopAddress || st.city}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.dueAmountText,
                      { color: st.totalDue > 0 ? '#ef4444' : '#15803d' },
                    ]}
                  >
                    {st.totalDue > 0 ? `₹${st.totalDue.toFixed(2)}` : '₹0.00'}
                  </Text>
                  <Text
                    style={[
                      styles.dueSubStatus,
                      { color: st.totalDue > 0 ? '#ef4444' : '#15803d' },
                    ]}
                  >
                    {st.totalDue > 0 ? 'Due to Pay' : 'No Due ✓'}
                  </Text>
                </View>
              </View>

              {/* Store Card Footer Actions */}
              <View style={styles.storeFooterRow}>
                <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                  <TouchableOpacity
                    style={styles.newOrderBtn}
                    onPress={() => handleStartNewOrder(st)}
                    activeOpacity={0.8}
                  >
                    <Plus size={13} color="#fff" />
                    <Text style={styles.newOrderBtnText}>New Order +</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewHistoryBtn}
                    onPress={() => openStoreStatement(st)}
                    activeOpacity={0.8}
                  >
                    <BookOpen size={13} color={colors.primary} />
                    <Text style={styles.viewHistoryBtnText}>View History →</Text>
                  </TouchableOpacity>
                </View>

                {st.shopPhone ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.circleIconBtn}
                      onPress={() => Linking.openURL(`tel:${st.shopPhone}`)}
                    >
                      <Phone size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.circleIconBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/91${st.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hi ${st.shopName}, I am reviewing my khata statement.`
                          )}`
                        )
                      }
                    >
                      <MessageCircle size={13} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* STORE DETAILED STATEMENT MODAL */}
      <Modal visible={!!selectedStore} animationType="slide" onRequestClose={() => setSelectedStore(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {selectedStore && (
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.statementHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStore(null)}>
                  <Text style={styles.backBtnText}>← Back to All Stores</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementShopName}>{selectedStore.shopName}</Text>
                    <Text style={styles.statementShopSub}>
                      ID: <Text style={{ color: colors.primary, fontWeight: '700' }}>{selectedStore.shortId}</Text> • {selectedStore.city}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.statementDueText,
                        {
                          color:
                            (storeStatement?.totalDue ?? selectedStore.totalDue ?? 0) > 0
                              ? '#ef4444'
                              : '#15803d',
                        },
                      ]}
                    >
                      ₹{(storeStatement?.totalDue ?? selectedStore.totalDue ?? 0).toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Current Due</Text>
                  </View>
                </View>

                {/* Actions & Verified Banner */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.statementNewOrderBtn}
                    onPress={() => handleStartNewOrder(selectedStore)}
                  >
                    <Plus size={14} color="#fff" />
                    <Text style={styles.statementNewOrderText}>+ New Order +</Text>
                  </TouchableOpacity>

                  {selectedStore.shopPhone ? (
                    <TouchableOpacity
                      style={styles.statementActionBtn}
                      onPress={() => Linking.openURL(`tel:${selectedStore.shopPhone}`)}
                    >
                      <Phone size={13} color={colors.primary} />
                      <Text style={styles.statementActionText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}

                  {selectedStore.shopPhone ? (
                    <TouchableOpacity
                      style={[styles.statementActionBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/91${selectedStore.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hi ${selectedStore.shopName}, I am reviewing my khata statement.`
                          )}`
                        )
                      }
                    >
                      <MessageCircle size={13} color="#16a34a" />
                      <Text style={[styles.statementActionText, { color: '#16a34a' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Filter Pills */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
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
              </View>

              {/* Statement Timeline List */}
              {statementLoading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={{ marginTop: 8, color: colors.textMuted }}>Loading statement entries...</Text>
                </View>
              ) : (
                <FlatList
                  data={(storeStatement?.timeline || []).filter((e) => isDateMatch(e.date))}
                  keyExtractor={(item, idx) => `stmt-${item.type}-${item.id}-${idx}`}
                  contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
                  ListEmptyComponent={
                    <View style={styles.emptyCard}>
                      <FileText size={36} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>No transactions found</Text>
                      <Text style={styles.emptySub}>No sales or settlements match selected date filter.</Text>
                    </View>
                  }
                  renderItem={({ item: entry }) => {
                    const isSale = entry.type === 'SALE';
                    const isSettlement = entry.type === 'SETTLEMENT';
                    const isOrder = entry.type === 'ORDER';

                    return (
                      <View style={styles.timelineCard}>
                        <View style={styles.timelineHeaderRow}>
                          <View style={styles.timelineIconBadge}>
                            {isSale ? (
                              <ArrowUpRight size={16} color={colors.danger} />
                            ) : isSettlement ? (
                              <ArrowDownLeft size={16} color={colors.success} />
                            ) : (
                              <Store size={16} color={colors.primary} />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.timelineTitle}>
                              {isSale
                                ? `Bill #${entry.id} (${entry.paymentMethod})`
                                : isSettlement
                                ? `Repayment Received (${entry.method})`
                                : `Order #${entry.orderNumber}`}
                            </Text>
                            <Text style={styles.timelineDate}>
                              {new Date(entry.date).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={[
                                styles.timelineAmount,
                                isSale && entry.paymentMethod === 'Add to Book'
                                  ? { color: colors.danger }
                                  : isSettlement
                                  ? { color: colors.success }
                                  : { color: colors.textSecondary },
                              ]}
                            >
                              {isSale && entry.paymentMethod === 'Add to Book'
                                ? `+₹${entry.total.toFixed(2)}`
                                : isSettlement
                                ? `-₹${entry.amount.toFixed(2)}`
                                : `₹${(entry.total || entry.estimatedTotal || 0).toFixed(2)}`}
                            </Text>
                            {isSale && (
                              <TouchableOpacity
                                onPress={() =>
                                  setSelectedReceipt({
                                    ...entry,
                                    shopName: selectedStore.shopName,
                                    shopAddress: selectedStore.shopAddress,
                                  })
                                }
                              >
                                <Text style={styles.receiptLink}>Receipt →</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* DIGITAL RECEIPT MODAL */}
      <ReceiptModal visible={!!selectedReceipt} receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />

      {/* CUSTOMER PROFILE MODAL */}
      <CustomerProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  editProfileBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editProfileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  profileSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalDueCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  totalDueLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  totalDueValue: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 4,
  },
  totalDueSub: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  totalDueIconBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shortIdBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shortIdBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  storeLoc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dueAmountText: {
    fontSize: 16,
    fontWeight: '900',
  },
  dueSubStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  storeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
    paddingTop: 8,
  },
  newOrderBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newOrderBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  viewHistoryBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewHistoryBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  circleIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statementHeader: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 2,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  statementShopName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statementShopSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statementDueText: {
    fontSize: 18,
    fontWeight: '900',
  },
  statementNewOrderBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statementNewOrderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statementActionBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statementActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterChip: {
    paddingHorizontal: 10,
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
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: colors.border,
    borderWidth: 1,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  timelineAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  receiptLink: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
