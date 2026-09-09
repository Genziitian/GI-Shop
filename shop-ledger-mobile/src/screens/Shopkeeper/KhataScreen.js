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
  MoreVertical,
  Link2,
  Lock,
  ShieldCheck,
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
import LinkCustomerModal from '../../components/LinkCustomerModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { showErrorAlert } from '../../utils/errorHandler';
import {
  loadCachedCustomers,
  saveCachedCustomers,
} from '../../utils/cache';

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
  const shopId = user?.shopId || user?.shop?.id || user?.staffRole?.shopId || 'default';
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

  // Settlement, Add Customer & Link Account Modals
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [linkTargetCustomer, setLinkTargetCustomer] = useState(null);

  const handleLinkSuccess = (updatedCustomer) => {
    if (!updatedCustomer) return;
    const newShortId = updatedCustomer.customerShortId || updatedCustomer.shortId;
    const newEmail = updatedCustomer.customerEmail || updatedCustomer.email;
    const cleanP = normalizePhone(updatedCustomer.phone || updatedCustomer.customerPhone);

    setCustomers((prev) => {
      const updatedList = (prev || []).map((c) => {
        const cP = normalizePhone(c.phone || c.customerPhone);
        if (cP === cleanP) {
          return {
            ...c,
            shortId: newShortId,
            customerShortId: newShortId,
            email: newEmail,
            customerEmail: newEmail,
            name: updatedCustomer.name || c.name,
          };
        }
        return c;
      });
      saveCachedCustomers(shopId, updatedList).catch(() => {});
      return updatedList;
    });

    if (selectedCustomer) {
      const selP = normalizePhone(selectedCustomer.phone || selectedCustomer.customerPhone);
      if (selP === cleanP) {
        setSelectedCustomer((prev) => ({
          ...prev,
          shortId: newShortId,
          customerShortId: newShortId,
          email: newEmail,
          customerEmail: newEmail,
          name: updatedCustomer.name || prev.name,
        }));
      }
    }

    loadCustomers();
  };

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

      // 0. Seed from local cache so offline or newly enrolled customers are always preserved
      try {
        const cached = await loadCachedCustomers(shopId);
        if (Array.isArray(cached)) {
          cached.forEach((c) => {
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
                totalDue: Number(c.totalDue) || 0,
              });
            }
          });
        }
      } catch (cacheErr) {}

      // 1. Merge server registered shop customers (data contains server-computed totalDue, totalBook, totalPaid)
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
            totalDue: typeof c.totalDue === 'number' ? c.totalDue : (Number(c.totalDue) || 0),
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

      // 3. Format customer list with cleaned names and guaranteed accurate totalDue
      const custsWithDue = custList.map((c) => {
        const phone = (c.phone || c.customerPhone || '').trim();
        const cleanPhone = normalizePhone(phone);
        const shortId = (c.shortId || c.customerShortId || '').trim().toLowerCase();
        const finalClean = cleanCustomerDisplayName(c.name, shortId);

        let finalDue = typeof c.totalDue === 'number' ? c.totalDue : undefined;
        if (finalDue === undefined) {
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
          finalDue = matchingSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        }

        return {
          ...c,
          name: finalClean || 'Customer',
          totalDue: Math.max(0, Number(finalDue) || 0),
          phone: phone || shortId,
          shortId: shortId || '',
        };
      });

      // Sort with highest due first, then alphabetically by name
      custsWithDue.sort((a, b) => b.totalDue - a.totalDue || (a.name || '').localeCompare(b.name || ''));
      setCustomers(custsWithDue);
      saveCachedCustomers(shopId, custsWithDue).catch(() => {});
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    let active = true;

    // Load from cache immediately for fast render
    loadCachedCustomers(shopId)
      .then((cached) => {
        if (active && Array.isArray(cached) && cached.length > 0) {
          setCustomers(cached);
          setLoading(false);
        }
      })
      .catch(() => {});

    // Refresh from network
    loadCustomers();

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
  }, [shopId, loadCustomers]);

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
            {/* Top Bar: Back to List on left, 3-dot & Link options on right */}
            <View style={styles.profileTopNav}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleCloseLedger}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color={colors.primary} />
                <Text style={styles.backBtnText}>{t('Back to List')}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!profileShortId && (
                  <TouchableOpacity
                    style={styles.linkHeaderBtn}
                    onPress={() => setLinkTargetCustomer(selectedCustomer)}
                    activeOpacity={0.8}
                  >
                    <Link2 size={12} color="#0284c7" />
                    <Text style={styles.linkHeaderBtnText}>{t('Link App')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.profile3DotBtn}
                  onPress={() => {
                    Alert.alert(
                      profileDisplayName,
                      `${t('Customer Phone:')} ${selectedCustomer.phone || t('Not set')}\n${profileShortId ? `${t('Linked ID:')} #${profileShortId}` : t('Not linked to app')}`,
                      [
                        ...(!profileShortId ? [{
                          text: t('Link to App Account'),
                          onPress: () => setLinkTargetCustomer(selectedCustomer),
                        }] : []),
                        {
                          text: t('Call Customer'),
                          onPress: () => handleCallCustomer(selectedCustomer),
                        },
                        ...(selectedCustomer.totalDue > 0 ? [{
                          text: t('Send WhatsApp Reminder'),
                          onPress: () => handleRemindCustomer(selectedCustomer),
                        }, {
                          text: t('Settle Due'),
                          onPress: () => setSettleCustomer(selectedCustomer),
                        }] : []),
                        { text: t('Cancel'), style: 'cancel' },
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <MoreVertical size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Details Row & Outstanding Due Badge */}
            <View style={styles.profileMainInfoRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.profileName} numberOfLines={1}>{profileDisplayName}</Text>
                  {profileShortId ? (
                    <View style={styles.shortIdBadge}>
                      <Lock size={9} color={colors.primary} />
                      <Text style={styles.shortIdText}>#{profileShortId}</Text>
                    </View>
                  ) : (
                    <View style={styles.unlinkedPill}>
                      <Text style={styles.unlinkedPillText}>{t('Offline Customer')}</Text>
                    </View>
                  )}
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
                      <Text style={styles.profilePhone}>
                        {selectedCustomer.shortId ? `#${selectedCustomer.shortId}` : t('App Account')}
                      </Text>
                    </>
                  )}
                </View>

                {selectedCustomer.address ? (
                  <View style={styles.metaIconRow}>
                    <MapPin size={13} color={colors.textMuted} />
                    <Text style={styles.profileAddress} numberOfLines={1}>
                      {selectedCustomer.address}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={[
                styles.profileDueBox,
                selectedCustomer.totalDue > 0 ? styles.profileDueBoxRed : styles.profileDueBoxGreen,
              ]}>
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
              </View>
            </View>

            {/* Dedicated Full-Width Action Buttons Row */}
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                style={styles.profileCallBtn}
                onPress={() => handleCallCustomer(selectedCustomer)}
                activeOpacity={0.8}
              >
                <Phone size={14} color="#334155" />
                <Text style={styles.profileCallBtnText}>{t('Call')}</Text>
              </TouchableOpacity>

              {selectedCustomer.totalDue > 0 && (
                <TouchableOpacity
                  style={styles.profileRemindBtn}
                  onPress={() => handleRemindCustomer(selectedCustomer)}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={14} color="#15803d" />
                  <Text style={styles.profileRemindBtnText}>{t('Remind')}</Text>
                </TouchableOpacity>
              )}

              {selectedCustomer.totalDue > 0 ? (
                <TouchableOpacity
                  style={styles.profileSettleBtn}
                  onPress={() => setSettleCustomer(selectedCustomer)}
                  activeOpacity={0.8}
                >
                  <DollarSign size={14} color="#ffffff" />
                  <Text style={styles.profileSettleBtnText}>{t('Settle Due')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.profileAllClearBadge}>
                  <Check size={14} color={colors.success} />
                  <Text style={styles.profileAllClearText}>{t('All Settled')}</Text>
                </View>
              )}
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

        {/* Link Customer Modal */}
        <LinkCustomerModal
          visible={!!linkTargetCustomer}
          customer={linkTargetCustomer}
          onClose={() => setLinkTargetCustomer(null)}
          onLinkSuccess={handleLinkSuccess}
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
                            <Lock size={9} color={colors.primary} />
                            <Text style={styles.shortIdText}>#{shortId}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.unlinkedPill}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setLinkTargetCustomer(item);
                            }}
                            activeOpacity={0.8}
                          >
                            <Link2 size={10} color="#ea580c" />
                            <Text style={styles.unlinkedPillText}>{t('Link App')}</Text>
                          </TouchableOpacity>
                        )}
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
                              {item.shortId ? `#${item.shortId}` : t('App Account')}
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

                  {/* Clean Bottom Action Strip (Call, Remind & 3-dot options are inside customer view) */}
                  <View style={styles.cardActionStrip}>
                    <View style={styles.viewLedgerHint}>
                      <Text style={styles.viewLedgerText}>{t('View Ledger & Khata')}</Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>

                    {hasDue ? (
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
                    ) : (
                      <View style={styles.settledCheckBadge}>
                        <Check size={12} color={colors.success} />
                        <Text style={styles.settledCheckText}>{t('All Clear')}</Text>
                      </View>
                    )}
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
          const newCust = {
            id: 'local_' + Date.now(),
            name: custData.name,
            phone: custData.phone,
            customerPhone: custData.phone,
            customerShortId: custData.customerShortId || '',
            shortId: custData.customerShortId || '',
            email: custData.customerEmail || '',
            customerEmail: custData.customerEmail || '',
            address: custData.address || '',
            totalDue: 0,
            totalBook: 0,
            totalPaid: 0,
            status: 'ACTIVE',
          };

          // Optimistically show newly enrolled customer at the top immediately
          setCustomers((prev) => {
            const cleanPhone = normalizePhone(custData.phone);
            const filtered = (prev || []).filter(
              (c) => normalizePhone(c.phone || c.customerPhone) !== cleanPhone
            );
            const updated = [newCust, ...filtered];
            saveCachedCustomers(shopId, updated).catch(() => {});
            return updated;
          });

          // Reset search and filter to ensure new customer is visible
          setSearch('');
          setFilter('All');

          try {
            await saveCustomer(custData);
            await loadCustomers();
          } catch (err) {
            console.error('Error saving customer:', err);
          }
        }}
      />

      {/* Link Customer Modal */}
      <LinkCustomerModal
        visible={!!linkTargetCustomer}
        customer={linkTargetCustomer}
        onClose={() => setLinkTargetCustomer(null)}
        onLinkSuccess={handleLinkSuccess}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  linkPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  linkPromptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  unlinkedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  unlinkedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
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
  moreBtnClean: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  profileTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  linkHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  linkHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  profile3DotBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  profileDueBoxRed: {
    backgroundColor: '#fef2f2',
  },
  profileDueBoxGreen: {
    backgroundColor: '#f0fdf4',
  },
  profileDueLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  profileDueValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  profileCallBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
  },
  profileCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  profileRemindBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
  },
  profileRemindBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  profileSettleBtn: {
    flex: 1.2,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  profileSettleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileAllClearBadge: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
  },
  profileAllClearText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
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
