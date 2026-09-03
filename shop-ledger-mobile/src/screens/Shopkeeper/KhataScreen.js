import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  UserX,
  CreditCard,
  Banknote,
  DollarSign,
  Phone,
  MapPin,
  FileText,
  Clock,
  MessageCircle,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import {
  getCustomers,
  getCustomerLedger,
  saveCustomer,
  saveSettlement,
  terminateCustomer,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import SettleDueModal from '../../components/SettleDueModal';
import AddCustomerModal from '../../components/AddCustomerModal';
import SkeletonLoader from '../../components/SkeletonLoader';

const FILTERS = ['All', 'Highest', 'Lowest', 'No Due'];

export default function KhataScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  // Customer Profile / Ledger State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [timelineDateFilter, setTimelineDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'Month'

  // Settlement & Add Customer Modals
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      // Calculate totalDue for each customer
      const custsWithDue = await Promise.all(
        data.map(async (c) => {
          const phone = c.phone || c.customerPhone;
          try {
            const led = await getCustomerLedger(phone);
            let due = 0;
            (led.sales || [])
              .filter((s) => s.paymentMethod === 'Add to Book')
              .forEach((s) => (due += (Number(s.total) || 0)));
            (led.settlements || []).forEach((s) => (due -= (Number(s.amount) || 0)));
            return { ...c, totalDue: Math.max(0, due), phone };
          } catch (e) {
            return { ...c, totalDue: 0, phone };
          }
        })
      );
      setCustomers(custsWithDue);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const handleOpenLedger = async (customer) => {
    setSelectedCustomer(customer);
    setLedgerLoading(true);
    try {
      const led = await getCustomerLedger(customer.phone);
      const sales = (led.sales || []).map((s) => ({
        ...s,
        entryType: 'SALE',
        parsedItems: JSON.parse(s.itemsJSON || '[]'),
      }));
      const settlements = (led.settlements || []).map((s) => ({
        ...s,
        entryType: 'SETTLEMENT',
      }));

      const combined = [...sales, ...settlements].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      let running = 0;
      const finalLedger = combined.map((entry) => {
        if (entry.entryType === 'SALE' && entry.paymentMethod === 'Add to Book') {
          running += (Number(entry.total) || 0);
        } else if (entry.entryType === 'SETTLEMENT') {
          running -= (Number(entry.amount) || 0);
        }
        return { ...entry, runningDue: Math.max(0, running) };
      });

      // Reverse so newest appears on top in timeline
      setLedgerEntries(finalLedger.reverse());
    } catch (e) {
      Alert.alert('Error', 'Failed to load customer transactions.');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleTerminate = () => {
    Alert.alert(
      'Terminate Relationship',
      `Are you sure you want to terminate relationship with ${selectedCustomer.name}? Past sales and receipts will be kept, but the customer will no longer appear in active lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              await terminateCustomer(selectedCustomer.phone);
              setSelectedCustomer(null);
              loadCustomers();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to terminate customer.');
            }
          },
        },
      ]
    );
  };

  const handleRemindCustomer = (customer) => {
    const cust = customer || selectedCustomer;
    if (!cust || !cust.phone) {
      Alert.alert('Missing Number', 'Customer phone number is not available.');
      return;
    }
    const cleanPhone = cust.phone.replace(/\D/g, '');
    const dueAmt = (Number(cust?.totalDue) || 0).toFixed(2);
    const shopTitle = user?.shopName || 'our store';
    const message = encodeURIComponent(
      `Hello ${cust.name || 'Customer'},\n\nThis is a gentle payment reminder from *${shopTitle}*.\n\nYou have an outstanding khata due of *₹${dueAmt}*.\nPlease submit/clear your payment at your earliest convenience.\n\nThank you!`
    );
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${message}`);
  };

  // Filter & Search Logic
  let displayed = customers.filter((c) => {
    const p = c.phone || c.customerPhone || '';
    const n = c.name || '';
    return p.includes(search) || n.toLowerCase().includes(search.toLowerCase());
  });

  if (filter === 'Highest') displayed.sort((a, b) => b.totalDue - a.totalDue);
  if (filter === 'Lowest') displayed.sort((a, b) => a.totalDue - b.totalDue);
  if (filter === 'No Due') displayed = displayed.filter((c) => c.totalDue <= 0);

  const totalOutstandingAll = customers.reduce((sum, c) => sum + Math.max(0, Number(c.totalDue) || 0), 0);

  // -------------------------------------------------------------
  // CUSTOMER PROFILE / LEDGER TIMELINE VIEW
  // -------------------------------------------------------------
  if (selectedCustomer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header subtitle="Customer Khata Timeline" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back & Profile Header */}
          <View style={styles.profileHeaderCard}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedCustomer(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Back to List</Text>
            </TouchableOpacity>

            <View style={styles.profileInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{selectedCustomer.name}</Text>
                <View style={styles.metaIconRow}>
                  <Phone size={13} color={colors.textMuted} />
                  <Text style={styles.profilePhone}>{selectedCustomer.phone}</Text>
                </View>
                {selectedCustomer.address ? (
                  <View style={styles.metaIconRow}>
                    <MapPin size={13} color={colors.textMuted} />
                    <Text style={styles.profileAddress}>
                      {selectedCustomer.address}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.profileDueBox}>
                <Text style={styles.profileDueLabel}>Current Due</Text>
                <Text
                  style={[
                    styles.profileDueValue,
                    selectedCustomer.totalDue > 0
                      ? { color: colors.danger }
                      : { color: colors.success },
                  ]}
                >
                  ₹{(Number(selectedCustomer?.totalDue) || 0).toFixed(2)}
                </Text>

                {selectedCustomer.totalDue > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.profileSettleBtn, { backgroundColor: '#25D366', flexDirection: 'row', gap: 4 }]}
                      onPress={() => handleRemindCustomer(selectedCustomer)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={14} color="#ffffff" />
                      <Text style={styles.profileSettleBtnText}>Remind</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.profileSettleBtn}
                      onPress={() => setSettleCustomer(selectedCustomer)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.profileSettleBtnText}>Settle Due</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Timeline Transactions */}
          <View style={styles.timelineSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.timelineTitle}>Ledger Timeline</Text>
            </View>

            {/* Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['All', 'Today', 'Yesterday', 'Month'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    timelineDateFilter === f && styles.filterChipActive,
                    { paddingHorizontal: 10, paddingVertical: 4 },
                  ]}
                  onPress={() => setTimelineDateFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      timelineDateFilter === f && styles.filterChipTextActive,
                      { fontSize: 11 },
                    ]}
                  >
                    {f === 'Month' ? 'This Month' : f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {ledgerLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (() => {
              const isDateMatch = (dateStr) => {
                if (!dateStr || timelineDateFilter === 'All') return true;
                const itemDate = new Date(dateStr);
                const now = new Date();
                if (timelineDateFilter === 'Today') {
                  return itemDate.toDateString() === now.toDateString();
                }
                if (timelineDateFilter === 'Yesterday') {
                  const yest = new Date(now);
                  yest.setDate(now.getDate() - 1);
                  return itemDate.toDateString() === yest.toDateString();
                }
                if (timelineDateFilter === 'Month') {
                  return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
                }
                return true;
              };

              const filtered = ledgerEntries.filter((e) => isDateMatch(e.date));

              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyCard}>
                    <FileText size={32} color={colors.textMuted} />
                    <Text style={styles.emptyCardText}>
                      {ledgerEntries.length === 0 ? 'No transactions recorded yet.' : 'No transactions match selected date filter.'}
                    </Text>
                  </View>
                );
              }

              return filtered.map((entry, idx) => {
                const isSale = entry.entryType === 'SALE';
                const isCreditBook = isSale && entry.paymentMethod === 'Add to Book';
                const dateStr = new Date(entry.date).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });

                return (
                  <View key={idx} style={styles.timelineCard}>
                    <View style={styles.timelineHeaderRow}>
                      <View style={styles.timelineIconBadge}>
                        {isSale ? (
                          <ArrowUpRight size={16} color={colors.danger} />
                        ) : (
                          <ArrowDownLeft size={16} color={colors.success} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineEntryTitle}>
                          {isSale
                            ? `Bill #${entry.id} (${entry.paymentMethod})`
                            : `Payment Received (${entry.method})`}
                        </Text>
                        <Text style={styles.timelineDate}>{dateStr}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.timelineAmount,
                            isCreditBook
                              ? { color: colors.danger }
                              : !isSale
                              ? { color: colors.success }
                              : { color: colors.textSecondary },
                          ]}
                        >
                          {isCreditBook
                            ? `+₹${(Number(entry?.total) || 0).toFixed(2)}`
                            : !isSale
                            ? `-₹${(Number(entry?.amount) || 0).toFixed(2)}`
                            : `₹${(Number(entry?.total) || 0).toFixed(2)}`}
                        </Text>
                        <Text style={styles.runningBalanceText}>
                          Balance: ₹{(Number(entry?.runningDue) || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Show Itemized list if Sale */}
                    {isSale && entry.parsedItems?.length > 0 && (
                      <View style={styles.itemsSubTable}>
                        {entry.parsedItems.map((pi, pidx) => (
                          <View key={pidx} style={styles.itemsSubRow}>
                            <Text style={styles.subItemName}>
                              • {pi.item?.name}
                            </Text>
                            <Text style={styles.subItemDetails}>
                              {pi.qty} {pi.item?.unit} @ ₹{pi.rate} = ₹
                              {(Number(pi.amount || pi.qty * pi.rate) || 0).toFixed(2)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>

          {/* Terminate Action */}
          <TouchableOpacity
            style={styles.terminateBtn}
            onPress={handleTerminate}
            activeOpacity={0.7}
          >
            <UserX size={16} color={colors.danger} />
            <Text style={styles.terminateBtnText}>Terminate Relationship</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Settlement Modal */}
        <SettleDueModal
          visible={!!settleCustomer}
          customer={settleCustomer}
          onClose={() => setSettleCustomer(null)}
          onSettleSuccess={async (settlePayload) => {
            await saveSettlement(settlePayload);
            await loadCustomers();
            await handleOpenLedger(selectedCustomer);
          }}
        />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // CUSTOMER LIST VIEW
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header subtitle="Khata & Udhar Ledger" />

      <View style={styles.content}>
        {/* Total Outstanding Hero Card */}
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Total Outstanding Khata</Text>
            <Text style={styles.heroValue}>₹{(Number(totalOutstandingAll) || 0).toFixed(2)}</Text>
            <Text style={styles.heroSub}>{customers.length} Enrolled Customers</Text>
          </View>

          <TouchableOpacity
            style={styles.addCustomerHeroBtn}
            onPress={() => setShowAddCustomerModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.addCustomerHeroBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer phone or name..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === f && styles.filterPillTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Customer List */}
        {loading ? (
          <SkeletonLoader type="customerItem" count={5} />
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(item) => item.phone || item.customerPhone}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerCard}
                onPress={() => handleOpenLedger(item)}
                activeOpacity={0.7}
              >
                <View style={styles.custLeft}>
                  <Text style={styles.custName}>{item.name}</Text>
                  <Text style={styles.custPhone}>{item.phone || item.customerPhone}</Text>
                  {item.address ? (
                    <Text style={styles.custAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.custRight}>
                  <Text style={styles.custDueLabel}>Due</Text>
                  <Text
                    style={[
                      styles.custDueValue,
                      item.totalDue > 0
                        ? { color: colors.danger }
                        : { color: colors.success },
                    ]}
                  >
                    ₹{(Number(item?.totalDue) || 0).toFixed(2)}
                  </Text>

                  {item.totalDue > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[styles.quickSettleBtn, { backgroundColor: '#25D366', paddingHorizontal: 8 }]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleRemindCustomer(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <MessageCircle size={12} color="#ffffff" />
                        <Text style={[styles.quickSettleBtnText, { marginLeft: 3 }]}>Remind</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickSettleBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setSettleCustomer(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickSettleBtnText}>Settle</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Customers Found</Text>
                <Text style={styles.emptySub}>
                  Add your first customer to track udhar ledger.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Settle Modal */}
      <SettleDueModal
        visible={!!settleCustomer}
        customer={settleCustomer}
        onClose={() => setSettleCustomer(null)}
        onSettleSuccess={async (settlePayload) => {
          await saveSettlement(settlePayload);
          await loadCustomers();
        }}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={async (custData) => {
          await saveCustomer(custData);
          await loadCustomers();
        }}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadowStyle,
  },
  heroLabel: {
    fontSize: 12,
    color: '#dbeafe',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 2,
  },
  heroSub: {
    fontSize: 11,
    color: '#bfdbfe',
  },
  addCustomerHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addCustomerHeroBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    gap: 8,
    paddingBottom: 20,
  },
  customerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  custLeft: {
    flex: 1,
    marginRight: 10,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  custPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  custAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  custRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  custDueLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  custDueValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  quickSettleBtn: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  quickSettleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
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
  },
  profileHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  metaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  profilePhone: {
    fontSize: 13,
    color: colors.textMuted,
  },
  profileAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  profileDueBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  profileDueLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  profileDueValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  profileSettleBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileSettleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  timelineSection: {
    gap: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 4,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEntryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  timelineAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  runningBalanceText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  itemsSubTable: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.badgeBg,
    gap: 3,
  },
  itemsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subItemName: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  subItemDetails: {
    fontSize: 11,
    color: colors.textMuted,
  },
  terminateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 6,
    marginTop: 8,
  },
  terminateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    paddingVertical: 30,
    alignItems: 'center',
    borderRadius: 14,
    gap: 6,
  },
  emptyCardText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
