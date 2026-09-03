import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart2,
  Calendar,
  CreditCard,
  Banknote,
  BookOpen,
  TrendingUp,
  Receipt,
  FileText,
  Edit2,
  Check,
  X,
  Clock,
  Phone,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import { getShopSales, updateSaleNote } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import ReceiptModal from '../../components/ReceiptModal';

const DATE_RANGES = ['Today', 'Yesterday', 'This Week', 'This Month', 'All Time'];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('Today');

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Note Modal
  const [selectedSaleForNote, setSelectedSaleForNote] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      const data = await getShopSales();
      const salesArray = Array.isArray(data) ? data : (data?.sales || []);
      setSales(salesArray);
    } catch (e) {
      console.error('Failed to load sales:', e);
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  // Filter sales by date range
  const salesList = Array.isArray(sales) ? sales : [];
  const filteredSales = salesList.filter((s) => {
    if (!s.date) return true;
    const saleDate = new Date(s.date);
    const now = new Date();

    if (dateRange === 'Today') {
      return saleDate.toDateString() === now.toDateString();
    } else if (dateRange === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return saleDate.toDateString() === yesterday.toDateString();
    } else if (dateRange === 'This Week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return saleDate >= startOfWeek;
    } else if (dateRange === 'This Month') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    return true; // 'All Time'
  });

  // Calculate Metrics
  const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const cashSales = filteredSales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const onlineSales = filteredSales
    .filter((s) => s.paymentMethod === 'Online')
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const khataSales = filteredSales
    .filter((s) => s.paymentMethod === 'Add to Book')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const handleOpenNoteModal = (sale) => {
    setSelectedSaleForNote(sale);
    setNoteInput(sale.note || '');
  };

  const handleSaveNote = async () => {
    if (!selectedSaleForNote) return;
    if (noteInput.length > 20) {
      Alert.alert('Limit Exceeded', 'Note cannot exceed 20 characters.');
      return;
    }

    setSavingNote(true);
    try {
      await updateSaleNote(selectedSaleForNote.id, noteInput.trim());
      await loadSales();
      setSelectedSaleForNote(null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleViewReceipt = (sale) => {
    const items = typeof sale.itemsJSON === 'string' ? JSON.parse(sale.itemsJSON || '[]') : (sale.items || []);
    setSelectedReceipt({
      id: sale.id,
      date: sale.date,
      customerPhone: sale.customerPhone,
      items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      shopName: user?.shop?.shopName || 'GI SHOP',
      shopAddress: user?.shop?.shopAddress || '',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header subtitle="Sales Analytics & Transactions" />

      <View style={styles.content}>
        {/* Date Filter Bar */}
        <View style={styles.dateFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {DATE_RANGES.map((range) => {
              const active = dateRange === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.dateFilterChip, active && styles.dateFilterChipActive]}
                  onPress={() => setDateRange(range)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateFilterChipText,
                      active && styles.dateFilterChipTextActive,
                    ]}
                  >
                    {range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Analytics Summary Cards (Grid of 4) */}
        <View style={styles.metricsGrid}>
          {/* Total Sales */}
          <View style={[styles.metricCard, { borderLeftColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Total Sales</Text>
              <TrendingUp size={16} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>₹{(Number(totalSales) || 0).toFixed(2)}</Text>
            <Text style={styles.metricSub}>{filteredSales.length} Transactions</Text>
          </View>

          {/* Cash Sales */}
          <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Cash Sales</Text>
              <Banknote size={16} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>₹{(Number(cashSales) || 0).toFixed(2)}</Text>
            <Text style={styles.metricSub}>Direct Cash</Text>
          </View>

          {/* Online / UPI Sales */}
          <View style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Online / UPI</Text>
              <CreditCard size={16} color={colors.warning} />
            </View>
            <Text style={styles.metricValue}>₹{(Number(onlineSales) || 0).toFixed(2)}</Text>
            <Text style={styles.metricSub}>Digital Payments</Text>
          </View>

          {/* Khata Sales */}
          <View style={[styles.metricCard, { borderLeftColor: colors.danger }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Khata (Credit)</Text>
              <BookOpen size={16} color={colors.danger} />
            </View>
            <Text style={styles.metricValue}>₹{(Number(khataSales) || 0).toFixed(2)}</Text>
            <Text style={styles.metricSub}>Added to Book</Text>
          </View>
        </View>

        {/* Transactions List Header */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>
            Transactions ({filteredSales.length})
          </Text>
          <Text style={styles.transactionsRange}>{dateRange}</Text>
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredSales}
            keyExtractor={(item) => item.id?.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const formattedDate = new Date(item.date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <TouchableOpacity
                  style={styles.saleCard}
                  onPress={() => handleViewReceipt(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.saleCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleBillId}>Bill #{item.id}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.saleDateText}>{formattedDate}</Text>
                      </View>
                      {item.customerPhone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Phone size={12} color={colors.primary} />
                          <Text style={styles.saleCustPhone}>{item.customerPhone}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.saleTotal}>₹{(Number(item?.total) || 0).toFixed(2)}</Text>
                      <View
                        style={[
                          styles.paymentTag,
                          item.paymentMethod === 'Cash'
                            ? styles.paymentTagCash
                            : item.paymentMethod === 'Online'
                            ? styles.paymentTagOnline
                            : styles.paymentTagKhata,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentTagText,
                            item.paymentMethod === 'Cash'
                              ? styles.paymentTagTextCash
                              : item.paymentMethod === 'Online'
                              ? styles.paymentTagTextOnline
                              : styles.paymentTagTextKhata,
                          ]}
                        >
                          {item.paymentMethod}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Memo Note Row */}
                  <View style={styles.noteRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} color={colors.textMuted} />
                      <Text style={styles.noteText} numberOfLines={1}>
                        {item.note ? item.note : 'No note added'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editNoteBtn}
                      onPress={() => handleOpenNoteModal(item)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={12} color={colors.primary} />
                      <Text style={styles.editNoteBtnText}>
                        {item.note ? 'Edit' : '+ Note'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Receipt size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Transactions Found</Text>
                <Text style={styles.emptySub}>
                  No sales recorded for the selected period "{dateRange}".
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Edit Note Modal */}
      <Modal
        visible={!!selectedSaleForNote}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSaleForNote(null)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContent}>
            <View style={styles.noteModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={18} color={colors.primary} />
                <Text style={styles.noteModalTitle}>
                  Memo Note for Bill #{selectedSaleForNote?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSaleForNote(null)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteModalSub}>
              Add a brief memo note (max 20 characters, e.g. "GPay to Ramesh"):
            </Text>

            <TextInput
              style={styles.noteModalInput}
              placeholder="e.g. Paid online, delivered"
              value={noteInput}
              onChangeText={setNoteInput}
              maxLength={20}
              autoFocus
            />
            <Text style={styles.charCount}>{noteInput.length} / 20 characters</Text>

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={styles.noteCancelBtn}
                onPress={() => setSelectedSaleForNote(null)}
              >
                <Text style={styles.noteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.noteSaveBtn}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={styles.noteSaveBtnText}>
                  {savingNote ? 'Saving...' : 'Save Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Details Modal */}
      <ReceiptModal
        visible={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
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
  dateFilterContainer: {
    marginBottom: 12,
  },
  dateFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateFilterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadowStyle,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  transactionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  transactionsRange: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  saleCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  saleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleBillId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  saleDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  saleCustPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  paymentTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  paymentTagCash: {
    backgroundColor: '#dcfce7',
  },
  paymentTagOnline: {
    backgroundColor: '#eff6ff',
  },
  paymentTagKhata: {
    backgroundColor: '#fee2e2',
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentTagTextCash: {
    color: '#15803d',
  },
  paymentTagTextOnline: {
    color: '#1d4ed8',
  },
  paymentTagTextKhata: {
    color: '#b91c1c',
  },
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  editNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  editNoteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
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
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  noteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    ...shadowLarge,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  noteModalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  noteModalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: colors.background,
    color: colors.text,
  },
  charCount: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 14,
  },
  noteModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  noteCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  noteCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  noteSaveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
