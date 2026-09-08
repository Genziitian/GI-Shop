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
  Modal,
  BackHandler,
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
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import {
  getCustomers,
  getCustomerLedger,
  saveCustomer,
  saveSettlement,
  terminateCustomer,
  getShopSales,
  searchRegisteredCustomer,
} from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import Header from '../../components/Header';
import SettleDueModal from '../../components/SettleDueModal';
import AddCustomerModal from '../../components/AddCustomerModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { showErrorAlert } from '../../utils/errorHandler';

const FILTERS = ['All', 'Highest', 'Lowest', 'No Due'];

const AVATAR_THEMES = [
  { bg: '#e0f2fe', text: '#0284c7' }, // Blue
  { bg: '#fef3c7', text: '#d97706' }, // Amber
  { bg: '#dcfce7', text: '#16a34a' }, // Emerald
  { bg: '#f3e8ff', text: '#9333ea' }, // Purple
  { bg: '#ffe4e6', text: '#e11d48' }, // Rose
  { bg: '#ffedd5', text: '#ea580c' }, // Orange
  { bg: '#ccfbf1', text: '#0d9488' }, // Teal
];

function getAvatarTheme(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
}

function getInitials(name = '') {
  if (!name) return 'CU';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function cleanCustomerDisplayName(name, shortId) {
  if (!name) return '';
  let clean = String(name);
  if (shortId) {
    clean = clean.replace(new RegExp(`\\s*\\(?#?${shortId}\\)?`, 'gi'), '').trim();
  }
  clean = clean.replace(/\s*\([a-z0-9_-]+\)\s*$/i, '').trim();
  clean = clean.replace(/^Customer\s*[:\-_]?\s*/i, '').trim();
  return clean;
}

export default function KhataScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Customer Profile / Ledger State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [timelineDateFilter, setTimelineDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'Month'

  // Settlement & Add Customer Modals
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const normalizePhone = (p) => {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  const loadCustomers = useCallback(async () => {
    try {
      const [customersRes, salesRes] = await Promise.allSettled([
        getCustomers(),
        getShopSales(),
      ]);

      const data = customersRes.status === 'fulfilled' && Array.isArray(customersRes.value) ? customersRes.value : [];
      const salesRaw = salesRes.status === 'fulfilled' ? (Array.isArray(salesRes.value) ? salesRes.value : (salesRes.value?.sales || [])) : [];

      const customerMap = new Map();

      // Helper to find existing customer key
      const findExistingKey = (phone, shortId) => {
        const cleanP = normalizePhone(phone);
        const sId = (shortId || '').trim().toLowerCase();
        for (const [k, c] of customerMap.entries()) {
          const cCleanP = normalizePhone(c.phone || c.customerPhone);
          const cSId = (c.shortId || c.customerShortId || '').trim().toLowerCase();
          if (sId && cSId && sId === cSId) return k;
          if (cleanP && cCleanP && cleanP === cCleanP) return k;
        }
        return null;
      };

      // 1. Seed with registered shop customers
      data.forEach((c) => {
        const phone = (c.phone || c.customerPhone || '').trim();
        const shortId = (c.shortId || c.customerShortId || '').trim();
        const key = (normalizePhone(phone) || shortId).toLowerCase();
        if (key) {
          customerMap.set(key, {
            ...c,
            phone: phone || shortId,
            customerPhone: phone || shortId,
            shortId: shortId || '',
            customerShortId: shortId || '',
            name: c.name || 'Customer',
          });
        }
      });

      // 2. Discover any customers with "Add to Book" credit sales in store sales history
      salesRaw.forEach((s) => {
        const isBook = s.paymentMethod === 'Add to Book' || (s.paymentMethod && s.paymentMethod.includes('Book'));
        if (isBook) {
          const sPhone = (s.customerPhone || '').trim();
          const sShortId = (s.customerShortId || '').trim();
          const existingKey = findExistingKey(sPhone, sShortId);

          if (!existingKey && (sPhone || sShortId)) {
            const primaryKey = (normalizePhone(sPhone) || sShortId).toLowerCase();
            const fallbackName = s.customerName || 'Customer';
            const synthesizedCust = {
              phone: sPhone || sShortId,
              customerPhone: sPhone || sShortId,
              shortId: sShortId || '',
              customerShortId: sShortId || '',
              name: fallbackName,
              totalDue: Number(s.total) || 0,
            };
            customerMap.set(primaryKey, synthesizedCust);

            // Synchronize to backend database asynchronously so it is permanently enrolled
            saveCustomer({
              phone: sPhone,
              customerShortId: sShortId,
              name: fallbackName,
            }).catch(() => {});
          }
        }
      });

      const custList = Array.from(customerMap.values());

      // Enrich customer names and phone numbers via registered account search
      await Promise.all(
        custList.map(async (c) => {
          const sId = (c.shortId || c.customerShortId || '').trim();
          const p = (c.phone || c.customerPhone || '').trim();
          const isPlaceholderName = !c.name || /^Customer(\s|\(|$)/i.test(c.name.trim());
          const isPlaceholderPhone = !p || !/\d{5,}/.test(p) || p.toLowerCase() === sId.toLowerCase();

          if ((isPlaceholderName || isPlaceholderPhone) && (sId || p)) {
            try {
              const searchRes = await searchRegisteredCustomer(sId || p);
              if (Array.isArray(searchRes) && searchRes.length > 0) {
                const matched = searchRes.find(
                  (r) => (sId && (r.shortId || '').toLowerCase() === sId.toLowerCase()) || (p && r.phone === p)
                ) || searchRes[0];

                if (matched) {
                  const cleanedFoundName = cleanCustomerDisplayName(matched.name, sId);
                  if (cleanedFoundName && cleanedFoundName.toLowerCase() !== 'customer') {
                    c.name = cleanedFoundName;
                  }
                  if (matched.phone && /\d{5,}/.test(matched.phone)) {
                    c.phone = matched.phone;
                    c.customerPhone = matched.phone;
                  }
                  if (matched.email && !c.email) {
                    c.email = matched.email;
                  }
                }
              }
            } catch (err) {
              // Silently ignore search lookup error
            }
          }

          // Clean any parenthesized shortId from customer name
          const finalClean = cleanCustomerDisplayName(c.name, sId);
          c.name = finalClean || 'Customer';
        })
      );

      // 3. Compute live dues for each customer
      const custsWithDue = await Promise.all(
        custList.map(async (c) => {
          const phone = (c.phone || c.customerPhone || '').trim();
          const cleanPhone = normalizePhone(phone);
          const shortId = (c.shortId || c.customerShortId || '').trim().toLowerCase();
          const idOrPhone = phone || shortId;

          // Compute due from sales history directly to ensure 100% accuracy
          const matchingSales = salesRaw.filter((s) => {
            const sPhone = (s.customerPhone || '').trim();
            const sClean = normalizePhone(sPhone);
            const sShort = (s.customerShortId || '').trim().toLowerCase();
            const isBook = s.paymentMethod === 'Add to Book' || (s.paymentMethod && s.paymentMethod.includes('Book'));
            if (!isBook) return false;

            if (shortId && sShort && shortId === sShort) return true;
            if (phone && sPhone && phone === sPhone) return true;
            if (cleanPhone && sClean && cleanPhone === sClean) return true;
            return false;
          });

          const bookSalesTotal = matchingSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

          try {
            const led = await getCustomerLedger(idOrPhone);
            let finalDue = 0;
            if (led && typeof led.totalDue === 'number') {
              finalDue = led.totalDue;
            } else if (led) {
              let calculatedDue = 0;
              (led.sales || [])
                .filter((s) => s.paymentMethod === 'Add to Book' || (s.paymentMethod && s.paymentMethod.includes('Book')))
                .forEach((s) => (calculatedDue += (Number(s.total) || 0)));
              (led.settlements || []).forEach((s) => (calculatedDue -= (Number(s.amount) || 0)));
              finalDue = Math.max(0, calculatedDue);
            } else {
              finalDue = Math.max(0, bookSalesTotal || Number(c.totalDue) || 0);
            }
            return {
              ...c,
              totalDue: finalDue,
              phone: phone || shortId,
              shortId: shortId || '',
            };
          } catch (e) {
            return {
              ...c,
              totalDue: Math.max(0, bookSalesTotal || Number(c.totalDue) || 0),
              phone: phone || shortId,
              shortId: shortId || '',
            };
          }
        })
      );

      // Sort with highest due first
      custsWithDue.sort((a, b) => b.totalDue - a.totalDue || (a.name || '').localeCompare(b.name || ''));
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
    let active = true;
    AsyncStorage.getItem('@shop_ledger_active_khata_customer').then((saved) => {
      if (active && saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            handleOpenLedger(parsed);
          }
        } catch (e) {}
      }
    });
    return () => {
      active = false;
    };
  }, [loadCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const handleCloseLedger = useCallback(() => {
    setSelectedCustomer(null);
    AsyncStorage.removeItem('@shop_ledger_active_khata_customer').catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedCustomer) {
          handleCloseLedger();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [selectedCustomer, handleCloseLedger])
  );

  const handleOpenLedger = async (customer) => {
    setSelectedCustomer(customer);
    if (customer) {
      AsyncStorage.setItem('@shop_ledger_active_khata_customer', JSON.stringify(customer)).catch(() => {});
    }
    setLedgerLoading(true);
    try {
      const idOrPhone = customer.phone || customer.customerPhone || customer.shortId || customer.customerShortId;
      let led = null;
      try {
        led = await getCustomerLedger(idOrPhone);
      } catch (err) {
        console.warn('getCustomerLedger error, will fallback to sales list:', err);
      }

      let sales = (led?.sales || []).map((s) => {
        let parsedItems = [];
        try {
          parsedItems = typeof s.itemsJSON === 'string' ? JSON.parse(s.itemsJSON || '[]') : (s.itemsJSON || []);
        } catch (err) {
          parsedItems = [];
        }
        return {
          ...s,
          entryType: 'SALE',
          parsedItems,
        };
      });

      // If backend ledger returned no sales, synthesize from shop sales dynamically
      if (sales.length === 0) {
        try {
          const shopSalesRes = await getShopSales();
          const shopSalesRaw = Array.isArray(shopSalesRes) ? shopSalesRes : (shopSalesRes?.sales || []);
          const cleanCustPhone = normalizePhone(customer.phone || customer.customerPhone);
          const custShort = (customer.shortId || customer.customerShortId || '').toLowerCase();

          sales = shopSalesRaw
            .filter((s) => {
              const sClean = normalizePhone(s.customerPhone);
              const sShort = (s.customerShortId || '').toLowerCase();
              const isMatch = (cleanCustPhone && sClean && cleanCustPhone === sClean) || (custShort && sShort && custShort === sShort);
              return isMatch;
            })
            .map((s) => {
              let parsedItems = [];
              try {
                parsedItems = typeof s.itemsJSON === 'string' ? JSON.parse(s.itemsJSON || '[]') : (s.itemsJSON || []);
              } catch (err) {
                parsedItems = [];
              }
              return {
                ...s,
                entryType: 'SALE',
                parsedItems,
              };
            });
        } catch (e) {}
      }

      const settlements = (led?.settlements || []).map((s) => ({
        ...s,
        entryType: 'SETTLEMENT',
      }));

      const combined = [...sales, ...settlements].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      let running = 0;
      const finalLedger = combined.map((entry) => {
        if (entry.entryType === 'SALE' && (entry.paymentMethod === 'Add to Book' || (entry.paymentMethod && entry.paymentMethod.includes('Book')))) {
          running += (Number(entry.total) || 0);
        } else if (entry.entryType === 'SETTLEMENT') {
          running -= (Number(entry.amount) || 0);
        }
        return { ...entry, runningDue: Math.max(0, running) };
      });

      // Update selected customer due if returned from ledger or running balance
      if (led?.totalDue !== undefined) {
        setSelectedCustomer((prev) => prev ? { ...prev, totalDue: led.totalDue } : prev);
      } else if (finalLedger.length > 0) {
        const lastRunning = finalLedger[finalLedger.length - 1]?.runningDue || 0;
        setSelectedCustomer((prev) => prev ? { ...prev, totalDue: lastRunning } : prev);
      }

      // Reverse so newest appears on top in timeline
      setLedgerEntries(finalLedger.reverse());
    } catch (e) {
      showErrorAlert(e, 'Customer Ledger');
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
              handleCloseLedger();
              loadCustomers();
            } catch (e) {
              showErrorAlert(e, 'Terminate Customer');
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = (customer) => {
    const cust = customer || selectedCustomer;
    const phone = cust?.phone || cust?.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 5) {
      Alert.alert(
        t('No Phone Number'),
        t('A valid phone number is not available for this customer.')
      );
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      showErrorAlert('Could not initiate phone call.', 'Call Error');
    });
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
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${message}`).catch(() => {
      showErrorAlert('Could not launch WhatsApp. Please ensure WhatsApp is installed on your device.', 'WhatsApp Not Available');
    });
  };

  // Filter & Search Logic
  let displayed = customers.filter((c) => {
    const p = c.phone || c.customerPhone || '';
    const n = c.name || '';
    const s = c.shortId || c.customerShortId || '';
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.toLowerCase().includes(q) || n.toLowerCase().includes(q) || s.toLowerCase().includes(q);
  });

  if (filter === 'Highest') displayed.sort((a, b) => b.totalDue - a.totalDue);
  if (filter === 'Lowest') displayed.sort((a, b) => a.totalDue - b.totalDue);
  if (filter === 'No Due') displayed = displayed.filter((c) => c.totalDue <= 0);

  const totalOutstandingAll = customers.reduce((sum, c) => sum + Math.max(0, Number(c.totalDue) || 0), 0);

  // -------------------------------------------------------------
  // CUSTOMER PROFILE / LEDGER TIMELINE VIEW
  // -------------------------------------------------------------
  if (selectedCustomer) {
    const profileShortId = selectedCustomer.shortId || selectedCustomer.customerShortId;
    const profileDisplayName = cleanCustomerDisplayName(selectedCustomer.name, profileShortId) || t('Customer');
    const hasRealProfilePhone = selectedCustomer.phone && /\d{5,}/.test(selectedCustomer.phone) && selectedCustomer.phone !== profileShortId;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header subtitle={t('Customer Khata Timeline')} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back & Profile Header */}
          <View style={styles.profileHeaderCard}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleCloseLedger}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>{t('Back to List')}</Text>
            </TouchableOpacity>

            <View style={styles.profileInfoRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.profileName}>{profileDisplayName}</Text>
                  {profileShortId ? (
                    <View style={styles.shortIdBadge}>
                      <Text style={styles.shortIdText}>#{profileShortId}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metaIconRow}>
                  {hasRealProfilePhone ? (
                    <>
                      <Phone size={13} color={colors.textMuted} />
                      <Text style={styles.profilePhone}>{selectedCustomer.phone}</Text>
                    </>
                  ) : (
                    <>
                      <Users size={13} color={colors.textMuted} />
                      <Text style={styles.profilePhone}>{selectedCustomer.email || t('App Account')}</Text>
                    </>
                  )}
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
                <Text style={styles.profileDueLabel}>{t('Current Due')}</Text>
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

                <View style={styles.profileActionRow}>
                  <TouchableOpacity
                    style={styles.profileCallBtn}
                    onPress={() => handleCallCustomer(selectedCustomer)}
                    activeOpacity={0.8}
                  >
                    <Phone size={13} color="#334155" />
                    <Text style={styles.profileCallBtnText}>{t('Call')}</Text>
                  </TouchableOpacity>

                  {selectedCustomer.totalDue > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.profileRemindBtn}
                        onPress={() => handleRemindCustomer(selectedCustomer)}
                        activeOpacity={0.8}
                      >
                        <MessageCircle size={13} color="#15803d" />
                        <Text style={styles.profileRemindBtnText}>{t('Remind')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.profileSettleBtn}
                        onPress={() => setSettleCustomer(selectedCustomer)}
                        activeOpacity={0.8}
                      >
                        <DollarSign size={13} color="#ffffff" />
                        <Text style={styles.profileSettleBtnText}>{t('Settle Due')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Timeline Transactions */}
          <View style={styles.timelineSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.timelineTitle}>{t('Ledger Timeline')}</Text>
            </View>

            {/* Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['All', 'Today', 'Yesterday', 'Month'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    timelineDateFilter === f && styles.filterChipActive,
                  ]}
                  onPress={() => setTimelineDateFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      timelineDateFilter === f && styles.filterChipTextActive,
                    ]}
                  >
                    {f === 'Month' ? t('This Month') : t(f)}
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
                      {ledgerEntries.length === 0 ? t('No transactions recorded yet.') : t('No transactions match selected date filter.')}
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
                            ? `${t('Bill')} #${entry.id} (${t(entry.paymentMethod)})`
                            : `${t('Payment Received')} (${entry.method})`}
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
                          {t('Balance:')} ₹{(Number(entry?.runningDue) || 0).toFixed(2)}
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

                    {/* Note row if present */}
                    {entry.note ? (
                      <View style={styles.timelineNoteRow}>
                        <FileText size={12} color={colors.textSecondary} />
                        <Text style={styles.timelineNoteText}>
                          {t('Note:')} {entry.note}
                        </Text>
                      </View>
                    ) : null}
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
            <Text style={styles.terminateBtnText}>{t('Terminate Relationship')}</Text>
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
      <Header subtitle={t('Khata & Udhar Ledger')} />

      <View style={styles.content}>
        {/* Total Outstanding Hero Card */}
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>{t('Total Outstanding Khata')}</Text>
            <Text style={styles.heroValue}>₹{(Number(totalOutstandingAll) || 0).toFixed(2)}</Text>
            <Text style={styles.heroSub}>{customers.length} {t('Enrolled Customers')}</Text>
          </View>

          <TouchableOpacity
            style={styles.addCustomerHeroBtn}
            onPress={() => setShowAddCustomerModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.addCustomerHeroBtnText}>{t('Add')}</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Dropdown in Same Row */}
        <View style={styles.searchAndFilterRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('Search by customer phone or name...')}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterDropdownBtn, filter !== 'All' && styles.filterDropdownBtnActive]}
            onPress={() => setShowFilterDropdown(true)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={14} color={filter !== 'All' ? colors.primary : colors.textSecondary} />
            <Text
              style={[styles.filterDropdownText, filter !== 'All' && styles.filterDropdownTextActive]}
              numberOfLines={1}
            >
              {t(filter)}
            </Text>
            <ChevronDown size={14} color={filter !== 'All' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown Modal */}
        <Modal
          visible={showFilterDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterDropdown(false)}
          >
            <View style={styles.dropdownModalCard}>
              <View style={styles.dropdownModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <SlidersHorizontal size={16} color={colors.primary} />
                  <Text style={styles.dropdownModalTitle}>{t('Filter Khata By')}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilterDropdown(false)}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.dropdownMenuItem, filter === f && styles.dropdownMenuItemActive]}
                  onPress={() => {
                    setFilter(f);
                    setShowFilterDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      filter === f && styles.dropdownMenuItemTextActive,
                    ]}
                  >
                    {t(f)}
                  </Text>
                  {filter === f && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Customer List */}
        {loading ? (
          <SkeletonLoader type="customerItem" count={5} />
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(item, index) => item.phone || item.customerPhone || item.shortId || item.customerShortId || String(index)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const shortId = item.shortId || item.customerShortId;
              const displayName = cleanCustomerDisplayName(item.name, shortId) || t('Customer');
              const avatarTheme = getAvatarTheme(displayName || item.phone || '');
              const initials = getInitials(displayName || '');
              const hasDue = Number(item.totalDue) > 0;
              const hasRealPhone = item.phone && /\d{5,}/.test(item.phone) && item.phone !== shortId;

              return (
                <TouchableOpacity
                  style={styles.customerCard}
                  onPress={() => handleOpenLedger(item)}
                  activeOpacity={0.8}
                >
                  {/* Top Row: Avatar, Info, Due Amount */}
                  <View style={styles.cardHeaderRow}>
                    {/* Avatar */}
                    <View style={[styles.custAvatar, { backgroundColor: avatarTheme.bg }]}>
                      <Text style={[styles.custAvatarText, { color: avatarTheme.text }]}>
                        {initials}
                      </Text>
                    </View>

                    {/* Customer Identity */}
                    <View style={styles.custDetailsCol}>
                      <View style={styles.custNameRow}>
                        <Text style={styles.custName} numberOfLines={1}>
                          {displayName}
                        </Text>
                        {shortId ? (
                          <View style={styles.shortIdBadge}>
                            <Text style={styles.shortIdText}>#{shortId}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.custContactRow}>
                        {hasRealPhone ? (
                          <>
                            <Phone size={12} color={colors.textMuted} />
                            <Text style={styles.custPhone}>
                              {item.phone}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Users size={12} color={colors.textMuted} />
                            <Text style={styles.custPhone}>
                              {item.email || t('App Account')}
                            </Text>
                          </>
                        )}
                      </View>

                      {item.address ? (
                        <View style={styles.custAddressRow}>
                          <MapPin size={11} color={colors.textMuted} />
                          <Text style={styles.custAddress} numberOfLines={1}>
                            {item.address}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Due Amount Block */}
                    <View style={styles.dueBlock}>
                      <Text
                        style={[
                          styles.dueBadgeLabel,
                          hasDue ? styles.dueLabelRed : styles.dueLabelGreen,
                        ]}
                      >
                        {hasDue ? t('DUE AMOUNT') : t('STATUS')}
                      </Text>
                      <Text
                        style={[
                          styles.dueAmountVal,
                          hasDue ? styles.dueValRed : styles.dueValGreen,
                        ]}
                      >
                        {hasDue ? `₹${(Number(item.totalDue) || 0).toFixed(2)}` : t('All Clear')}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Bottom Action Strip */}
                  <View style={styles.cardActionStrip}>
                    <View style={styles.viewLedgerHint}>
                      <Text style={styles.viewLedgerText}>{t('View Ledger')}</Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>

                    <View style={styles.cardActionBtns}>
                      <TouchableOpacity
                        style={styles.callBtnClean}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleCallCustomer(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <Phone size={12} color="#334155" />
                        <Text style={styles.callBtnCleanText}>{t('Call')}</Text>
                      </TouchableOpacity>

                      {hasDue ? (
                        <>
                          <TouchableOpacity
                            style={styles.remindBtnClean}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleRemindCustomer(item);
                            }}
                            activeOpacity={0.8}
                          >
                            <MessageCircle size={12} color="#15803d" />
                            <Text style={styles.remindBtnCleanText}>{t('Remind')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.settleBtnClean}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setSettleCustomer(item);
                            }}
                            activeOpacity={0.8}
                          >
                            <DollarSign size={12} color="#ffffff" />
                            <Text style={styles.settleBtnCleanText}>{t('Settle')}</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.settledCheckBadge}>
                          <Check size={13} color={colors.success} />
                          <Text style={styles.settledCheckText}>{t('No Pending Udhar')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('No Customers Found')}</Text>
                <Text style={styles.emptySub}>
                  {t('Add your first customer to track udhar ledger.')}
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
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    gap: 6,
    justifyContent: 'center',
  },
  filterDropdownBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  filterDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    maxWidth: 95,
  },
  filterDropdownTextActive: {
    color: colors.primary,
  },
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadowLarge,
    elevation: 8,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownMenuItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownMenuItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    gap: 8,
    paddingBottom: 20,
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowStyle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  custDetailsCol: {
    flex: 1,
    gap: 2,
  },
  custNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  custName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  shortIdBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  shortIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  custContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  custPhone: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  custAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  custAddress: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dueBlock: {
    alignItems: 'flex-end',
  },
  dueBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dueLabelRed: {
    color: colors.danger,
  },
  dueLabelGreen: {
    color: colors.success,
  },
  dueAmountVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  dueValRed: {
    color: colors.danger,
  },
  dueValGreen: {
    color: colors.success,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  cardActionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewLedgerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLedgerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  cardActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callBtnClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callBtnCleanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  remindBtnClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  remindBtnCleanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  settleBtnClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleBtnCleanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  settledCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  settledCheckText: {
    fontSize: 11,
    fontWeight: '600',
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
  profileActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  profileCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  profileRemindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileRemindBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  profileSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileSettleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStyle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
  timelineNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timelineNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
