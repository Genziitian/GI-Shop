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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  ShoppingCart,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Package,
  CreditCard,
  Banknote,
  BookOpen,
  X,
  Plus,
  Minus,
  ChevronUp,
  RefreshCw,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import { getItems, getCustomers, saveSale, saveCustomer, searchRegisteredCustomer } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import ProductUnitModal from '../../components/ProductUnitModal';
import ReceiptModal from '../../components/ReceiptModal';
import AddCustomerModal from '../../components/AddCustomerModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { showErrorAlert } from '../../utils/errorHandler';
import { useTranslation } from '../../context/LanguageContext';
import {
  loadCachedItems,
  saveCachedItems,
  loadCachedCustomers,
  saveCachedCustomers,
} from '../../utils/cache';

const PAYMENT_MODES = [
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'Online', label: 'Online / UPI', icon: CreditCard },
  { id: 'Add to Book', label: 'Add to Book', icon: BookOpen },
];

export default function POSScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const shopId = user?.shopId || user?.shop?.id || user?.staffRole?.shopId || 'default';

  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showCartModal, setShowCartModal] = useState(false);

  // Customer Selector State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [completingBill, setCompletingBill] = useState(false);

  // Background sync / fresh pull
  const loadData = useCallback(async (isUserRefresh = false) => {
    if (isUserRefresh) {
      setRefreshing(true);
    } else {
      setSyncing(true);
    }

    try {
      const [itemsData, customersData] = await Promise.all([
        getItems().catch((err) => {
          console.warn('[POS] getItems failed:', err);
          return null;
        }),
        getCustomers().catch((err) => {
          console.warn('[POS] getCustomers failed:', err);
          return null;
        }),
      ]);

      const safeItems = Array.isArray(itemsData)
        ? itemsData
        : (itemsData?.items || itemsData?.data || (Array.isArray(itemsData?.results) ? itemsData.results : null));

      const safeCustomers = Array.isArray(customersData)
        ? customersData
        : (customersData?.customers || customersData?.data || (Array.isArray(customersData?.results) ? customersData.results : null));

      if (safeItems && Array.isArray(safeItems)) {
        setItems(safeItems);
        setFetchError(null);
        if (safeItems.length > 0) {
          await saveCachedItems(shopId, safeItems);
        }
      } else {
        // Fallback to cached items
        const cached = await loadCachedItems(shopId);
        if (cached && cached.length > 0) {
          setItems(cached);
          setFetchError(null);
        } else if (itemsData === null) {
          setFetchError('Unable to refresh latest items. Working with saved catalog.');
        }
      }

      if (safeCustomers && Array.isArray(safeCustomers)) {
        setCustomers(safeCustomers);
        if (safeCustomers.length > 0) {
          await saveCachedCustomers(shopId, safeCustomers);
        }
      } else {
        const cachedCust = await loadCachedCustomers(shopId);
        if (cachedCust && cachedCust.length > 0) {
          setCustomers(cachedCust);
        }
      }
    } catch (e) {
      console.warn('POS load/sync error:', e);
      try {
        const cached = await loadCachedItems(shopId);
        if (cached && cached.length > 0) {
          setItems(cached);
          setFetchError(null);
        } else {
          setFetchError('Unable to refresh latest items. Working with saved catalog.');
        }
      } catch (cacheErr) {
        setFetchError('Unable to refresh latest items. Working with saved catalog.');
      }
    } finally {
      setLoading(false);
      setSyncing(false);
      setRefreshing(false);
    }
  }, [shopId]);

  // On mount: instantly display local cache, then revalidate in background
  useEffect(() => {
    let active = true;

    const initCacheAndRevalidate = async () => {
      try {
        const [cachedItems, cachedCustomers] = await Promise.all([
          loadCachedItems(shopId),
          loadCachedCustomers(shopId),
        ]);

        if (active) {
          if (cachedItems && cachedItems.length > 0) {
            setItems(cachedItems);
            setLoading(false);
          }
          if (cachedCustomers && cachedCustomers.length > 0) {
            setCustomers(cachedCustomers);
          }
        }
      } catch (cacheErr) {
        console.warn('[POS] Cache read error:', cacheErr);
      }

      if (active) {
        loadData(false);
      }
    };

    initCacheAndRevalidate();

    return () => {
      active = false;
    };
  }, [shopId, loadData]);

  const onRefresh = () => {
    loadData(true);
  };

  const filteredItems = items.filter((i) =>
    ((i?.name || i?.title || '') + '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const filteredCustomers = customers.filter((c) => {
    const p = c.phone || c.customerPhone || '';
    const n = c.name || '';
    return (
      p.includes(customerSearch) ||
      n.toLowerCase().includes(customerSearch.toLowerCase())
    );
  });

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.phone || c.customerPhone);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const handleForceSearch = async () => {
    const query = customerSearch.trim();
    if (!query) {
      Alert.alert(t('Search Customer'), t('Please enter a phone number or name to search.'));
      return;
    }
    const matches = customers.filter((c) => {
      const p = (c.phone || c.customerPhone || '').toLowerCase();
      const n = (c.name || '').toLowerCase();
      const q = query.toLowerCase();
      return p.includes(q) || n.includes(q);
    });
    if (matches.length === 1) {
      handleSelectCustomer(matches[0]);
      Alert.alert(t('Customer Found'), `${matches[0].name} (${matches[0].phone || matches[0].customerPhone})`);
      return;
    } else if (matches.length > 1) {
      setShowCustomerDropdown(true);
      return;
    }

    // Not found in local store list -> query central GI SHOP accounts directory!
    try {
      setSyncing(true);
      const appResults = await searchRegisteredCustomer(query);
      if (appResults && appResults.length > 0) {
        const found = appResults[0];
        const newCust = {
          name: found.name || 'Customer',
          phone: found.phone || query,
          customerPhone: found.phone || query,
          shortId: found.shortId,
          email: found.email,
        };
        // Auto-save to shop customers so future lookups are local and instantaneous
        try {
          await saveCustomer(newCust);
          loadData(false);
        } catch (saveErr) {
          console.warn('[POS] Auto-save customer error:', saveErr);
        }
        handleSelectCustomer(newCust);
        Alert.alert(
          t('Customer Found'),
          `${newCust.name} (${newCust.phone || newCust.shortId || ''})\n\n✓ Linked GI SHOP Account: ${newCust.shortId ? 'ID ' + newCust.shortId : ''}`
        );
        return;
      }
    } catch (searchErr) {
      console.warn('[POS] searchRegisteredCustomer error:', searchErr);
    } finally {
      setSyncing(false);
    }

    Alert.alert(t('Not Found'), t('No customer found with that phone or name.'));
  };

  const handleAddToCart = (cartItem) => {
    const existingIndex = cart.findIndex((c) => c.item.id === cartItem.item.id);
    let newCart = [...cart];
    if (existingIndex >= 0) {
      newCart[existingIndex].qty += cartItem.qty;
      newCart[existingIndex].amount += cartItem.amount;
    } else {
      newCart.push(cartItem);
    }
    setCart(newCart);
  };

  const updateCartItemQty = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const step = target.item.unit === 'Piece' ? 1 : 0.5;
      const newQty = target.qty + (delta * step);
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...target,
        qty: Number(newQty.toFixed(2)),
        amount: Number((newQty * target.rate).toFixed(2)),
      };
      return updated;
    });
  };

  const removeCartItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    if (updated.length === 0) {
      setShowCartModal(false);
    }
  };

  const subtotal = cart.reduce((sum, c) => sum + c.amount, 0);
  const discountNum = parseFloat(discount) || 0;
  const finalTotal = Math.max(0, subtotal - discountNum);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      return Alert.alert('Empty Cart', 'Please add items to cart before completing bill.');
    }
    if (paymentMethod === 'Add to Book') {
      if (!selectedCustomer) {
        Alert.alert(
          'Registered Customer Required',
          'Khata credit ("Add to Book") requires selecting a registered app customer with a Short ID / Email.',
          [{ text: 'Assign App Customer', onPress: () => setShowAddCustomerModal(true) }]
        );
        setShowAddCustomerModal(true);
        return;
      }
      if (!selectedCustomer.shortId && !selectedCustomer.customerShortId) {
        Alert.alert(
          'Khata Restriction',
          'Khata credit ("Add to Book") is strictly restricted to app-registered customers with a Short ID / Email. Walk-in customers without an app account cannot be added to Khata.\n\nPlease search and assign the customer by Email / Short ID.',
          [{ text: 'Search & Link Account', onPress: () => setShowAddCustomerModal(true) }]
        );
        return;
      }

      // Proactively ensure customer is enrolled in shop ledger database
      try {
        await saveCustomer({
          phone: selectedCustomer.phone || selectedCustomer.customerPhone,
          customerShortId: selectedCustomer.shortId || selectedCustomer.customerShortId,
          customerEmail: selectedCustomer.email || selectedCustomer.customerEmail,
          name: selectedCustomer.name,
        });
      } catch (saveCustErr) {
        console.warn('Auto-save customer on Add to Book:', saveCustErr);
      }
    }

    setCompletingBill(true);
    try {
      const salePayload = {
        customerPhone: selectedCustomer ? (selectedCustomer.phone || selectedCustomer.customerPhone) : '',
        customerShortId: selectedCustomer ? (selectedCustomer.shortId || selectedCustomer.customerShortId || '') : '',
        customerEmail: selectedCustomer ? (selectedCustomer.email || selectedCustomer.customerEmail || '') : '',
        customerName: selectedCustomer ? (selectedCustomer.name || '') : '',
        itemsJSON: JSON.stringify(cart),
        subtotal,
        discount: discountNum,
        total: finalTotal,
        paymentMethod,
      };

      const result = await saveSale(salePayload);
      setShowCartModal(false);
      setReceiptData({
        ...salePayload,
        id: result.id,
        date: result.date,
        items: cart,
        shopName: user?.shop?.shopName || 'GI SHOP',
        shopAddress: user?.shop?.shopAddress || '',
      });
    } catch (e) {
      showErrorAlert(e, 'Billing Error', 'Failed to complete transaction.');
    } finally {
      setCompletingBill(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setDiscount('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setPaymentMethod('Cash');
    setShowCartModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header subtitle={t('Point of Sale & Smart Billing')} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            cart.length > 0 && { paddingBottom: 110 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >


          {/* Product Search & Grid */}
          <View style={styles.sectionCard}>
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('Search products (e.g. Milk, Rice)...')}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Syncing Indicator Badge */}
            {syncing && items.length > 0 && (
              <View style={styles.syncBadge}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.syncText}>{t('Refreshing store catalog...')}</Text>
              </View>
            )}

            {/* Offline / Sync Notice Banner */}
            {fetchError && items.length > 0 && (
              <TouchableOpacity onPress={() => loadData(true)} style={styles.offlineBanner} activeOpacity={0.8}>
                <Text style={styles.offlineText}>{fetchError}</Text>
                <Text style={styles.offlineRetry}>↻ Retry</Text>
              </TouchableOpacity>
            )}

            {/* Product Grid */}
            {loading && items.length === 0 ? (
              <SkeletonLoader type="productGrid" count={6} />
            ) : (
              <View style={styles.productGrid}>
                {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productTile}
                  onPress={() => setSelectedProduct(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.productTileName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.productTileBadge}>
                    <Text style={styles.productTilePrice}>
                      ₹{item.price}/{item.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredItems.length === 0 && (
                <View style={styles.emptyProducts}>
                  <Package size={36} color={colors.textMuted} />
                  <Text style={styles.emptyProductsText}>
                    {searchQuery.length > 0
                      ? `No matching products for "${searchQuery}"`
                      : (fetchError ? t('Unable to load products from server') : t('No products in store yet'))}
                  </Text>
                  <Text style={styles.emptyProductsSub}>
                    {searchQuery.length > 0
                      ? t('Try searching with another keyword')
                      : (fetchError ? t('Please check your connection and tap to retry') : t('Add products from Inventory or More tab'))}
                  </Text>
                  {searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                      <Text style={styles.clearSearchText}>{t('Clear Search')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => loadData(true)} style={styles.refreshCatalogBtn}>
                      <RefreshCw size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.refreshCatalogText}>{t('Refresh Products')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Bottom Cart Banner (Sticky above Nav Bar) */}
      {cart.length > 0 && (
        <View style={styles.cartBannerWrapper}>
          <TouchableOpacity
            style={styles.cartBanner}
            onPress={() => setShowCartModal(true)}
            activeOpacity={0.9}
          >
            <View style={styles.cartBannerLeft}>
              <View style={styles.cartIconBadge}>
                <ShoppingCart size={20} color="#ffffff" />
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{cart.length}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cartBannerCount}>
                  {cart.length} {t('Items in Cart')}
                </Text>
                <Text style={styles.cartBannerTotal}>₹{finalTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.cartBannerRight}>
              <Text style={styles.viewCartText}>{t('View Cart')}</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full-Screen Interactive Cart & Checkout Modal */}
      <Modal
        visible={showCartModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCartModal(false)}
      >
        <SafeAreaView style={styles.fullCartContainer} edges={['top', 'bottom']}>
          {/* Top Header Bar */}
          <View style={styles.fullCartHeader}>
            <TouchableOpacity
              style={styles.fullCartBackBtn}
              onPress={() => setShowCartModal(false)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.fullCartTitle}>{t('Order Cart')}</Text>
              <Text style={styles.fullCartSubtitle}>
                {cart.length} {t('Items')} • ₹{finalTotal.toFixed(2)}
              </Text>
            </View>

            {cart.length > 0 && (
              <TouchableOpacity
                style={styles.fullCartClearBtn}
                onPress={() => {
                  Alert.alert(
                    t('Clear Cart'),
                    t('Are you sure you want to remove all items from cart?'),
                    [
                      { text: t('Cancel'), style: 'cancel' },
                      {
                        text: t('Clear All'),
                        style: 'destructive',
                        onPress: () => {
                          setCart([]);
                          setShowCartModal(false);
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.fullCartClearText}>{t('Clear All')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.fullCartScroll}
            contentContainerStyle={styles.fullCartScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Customer Account Section: Walk-in vs Search Customer Buttons */}
            <View style={styles.custSectionCard}>
              <Text style={styles.custSectionHeading}>{t('Billing Customer')}</Text>

              <View style={styles.custTypeButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.custTypeButton,
                    !selectedCustomer && styles.custTypeButtonActive,
                  ]}
                  onPress={() => setSelectedCustomer(null)}
                  activeOpacity={0.8}
                >
                  <User
                    size={18}
                    color={!selectedCustomer ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.custTypeButtonText,
                      !selectedCustomer && styles.custTypeButtonTextActive,
                    ]}
                  >
                    {t('Walk-in Customer')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.custTypeButton,
                    !!selectedCustomer && styles.custTypeButtonActive,
                  ]}
                  onPress={() => setShowAddCustomerModal(true)}
                  activeOpacity={0.8}
                >
                  <Search
                    size={18}
                    color={!!selectedCustomer ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.custTypeButtonText,
                      !!selectedCustomer && styles.custTypeButtonTextActive,
                    ]}
                  >
                    {t('Search Customer')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Active Customer Details or Walk-in Notice */}
              {selectedCustomer ? (
                <View style={styles.activeCustomerCard}>
                  <View style={styles.activeCustomerAvatar}>
                    <UserCheck size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.activeCustomerName} numberOfLines={1}>
                      {selectedCustomer.name || t('Customer Account')}
                    </Text>
                    <Text style={styles.activeCustomerMeta}>
                      {selectedCustomer.phone || selectedCustomer.customerPhone || ''}
                      {(selectedCustomer.shortId || selectedCustomer.customerShortId) ? ` • ID: ${selectedCustomer.shortId || selectedCustomer.customerShortId}` : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.custChangeBtn}
                      onPress={() => setShowAddCustomerModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.custChangeBtnText}>{t('Change')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.custRemoveBtn}
                      onPress={() => setSelectedCustomer(null)}
                      activeOpacity={0.7}
                    >
                      <X size={15} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.walkinInfoBadge}>
                  <View style={styles.walkinDot} />
                  <Text style={styles.walkinInfoText}>
                    {t('Walk-in customer selected. Cash & Online UPI payments supported.')}
                  </Text>
                </View>
              )}
            </View>

            {/* Cart Items List */}
            <View style={styles.cartItemsSection}>
              <View style={styles.cartItemsHeader}>
                <Text style={styles.cartItemsTitle}>{t('Items in Bill')}</Text>
                <Text style={styles.cartItemsCount}>{cart.length} {t('items')}</Text>
              </View>

              {cart.map((c, i) => (
                <View key={i} style={styles.fullCartItemCard}>
                  <View style={styles.cartItemTopRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.cartItemTitle}>{c.item.name}</Text>
                      <Text style={styles.cartItemSub}>
                        ₹{c.rate} / {c.item.unit}
                      </Text>
                    </View>
                    <Text style={styles.cartItemTotalPrice}>
                      ₹{c.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.cartItemBottomRow}>
                    {/* Stepper with comfortable tap targets */}
                    <View style={styles.spaciousStepper}>
                      <TouchableOpacity
                        style={styles.spaciousStepperBtn}
                        onPress={() => updateCartItemQty(i, -1)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Minus size={16} color={colors.text} />
                      </TouchableOpacity>
                      <View style={styles.spaciousStepperQtyWrap}>
                        <Text style={styles.spaciousStepperQty}>
                          {c.qty} {c.item.unit}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.spaciousStepperBtn}
                        onPress={() => updateCartItemQty(i, 1)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Plus size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    {/* Delete Item */}
                    <TouchableOpacity
                      onPress={() => removeCartItem(i)}
                      style={styles.spaciousTrashBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Bill Calculations Card */}
            <View style={styles.billSummaryCard}>
              <Text style={styles.summaryCardTitle}>{t('Bill Summary')}</Text>

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>{t('Items Subtotal')}</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <View>
                  <Text style={styles.summaryLabel}>{t('Special Discount')}</Text>
                  <Text style={styles.summarySubLabel}>{t('Flat discount in ₹')}</Text>
                </View>
                <View style={styles.discountInputWrap}>
                  <Text style={styles.discountCurrencySymbol}>₹</Text>
                  <TextInput
                    style={styles.spaciousDiscountInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={discount}
                    onChangeText={setDiscount}
                  />
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryTotalLine}>
                <View>
                  <Text style={styles.grandTotalLabel}>{t('TOTAL PAYABLE')}</Text>
                  <Text style={styles.grandTotalSub}>{t('Inclusive of all items')}</Text>
                </View>
                <Text style={styles.grandTotalValue}>₹{finalTotal.toFixed(2)}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.paymentSectionCard}>
              <Text style={styles.paymentSectionTitle}>{t('Payment Method')}</Text>
              <View style={styles.paymentMethodOptions}>
                {PAYMENT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = paymentMethod === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.paymentChoiceBtn,
                        active && styles.paymentChoiceBtnActive,
                      ]}
                      onPress={() => {
                        setPaymentMethod(mode.id);
                        if (mode.id === 'Add to Book' && !selectedCustomer) {
                          Alert.alert(
                            t('Customer Account Required'),
                            t('Khata credit ("Add to Book") requires linking a registered customer account. Please tap "Search Customer".'),
                            [
                              {
                                text: t('Search Customer'),
                                onPress: () => setShowAddCustomerModal(true),
                              },
                              { text: t('Cancel'), style: 'cancel' }
                            ]
                          );
                          setShowAddCustomerModal(true);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.paymentChoiceIconWrap, active && styles.paymentChoiceIconWrapActive]}>
                        <Icon
                          size={20}
                          color={active ? '#ffffff' : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.paymentChoiceText,
                          active && styles.paymentChoiceTextActive,
                        ]}
                      >
                        {t(mode.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Checkout Action Bar */}
          <View style={styles.fullCartFooter}>
            <TouchableOpacity
              style={[
                styles.fullCartCheckoutBtn,
                cart.length === 0 && styles.checkoutBtnDisabled,
              ]}
              onPress={handleCheckout}
              disabled={completingBill || cart.length === 0}
              activeOpacity={0.85}
            >
              {completingBill ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.fullCartCheckoutText}>
                    {t('Complete Bill')} • ₹{finalTotal.toFixed(2)}
                  </Text>
                  <ArrowRight size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Smart Unit Modal */}
      <ProductUnitModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        visible={!!receiptData}
        receipt={receiptData}
        onClose={() => setReceiptData(null)}
        onNewBill={resetPOS}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={async (custData) => {
          await saveCustomer(custData);
          await loadData();
          setSelectedCustomer(custData);
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  clearCustBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearCustText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  customerInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customerInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
  },
  customerInputSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    fontWeight: '600',
  },
  addCustomerBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownContainer: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 160,
    ...shadowStyle,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dropdownItemNew: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
  },
  dropdownNewText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productTile: {
    width: '31%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  productTileName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  productTileBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  productTilePrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    marginBottom: 10,
  },
  syncText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 10,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  offlineRetry: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyProducts: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyProductsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyProductsSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 240,
  },
  clearSearchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearSearchText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  refreshCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.primary,
    ...shadowStyle,
  },
  refreshCatalogText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },

  /* Floating Bottom Cart Banner */
  cartBannerWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    zIndex: 99,
  },
  cartBanner: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadowLarge,
    elevation: 8,
  },
  cartBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  cartBannerCount: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  cartBannerTotal: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  cartBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewCartText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Full-Screen Cart Modal Styles */
  fullCartContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullCartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  fullCartBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullCartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  fullCartSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  fullCartClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  fullCartClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  fullCartScroll: {
    flex: 1,
  },
  fullCartScrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },

  /* Customer Section */
  custSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowStyle,
  },
  custSectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  custTypeButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  custTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  custTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  custTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  custTypeButtonTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  activeCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
  },
  activeCustomerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCustomerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  activeCustomerMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    marginTop: 2,
  },
  custChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  custChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  custRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  walkinInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  walkinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  walkinInfoText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },

  /* Cart Items Section */
  cartItemsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowStyle,
  },
  cartItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartItemsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cartItemsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  fullCartItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cartItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cartItemSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  cartItemTotalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  cartItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spaciousStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 2,
  },
  spaciousStepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaciousStepperQtyWrap: {
    paddingHorizontal: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  spaciousStepperQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  spaciousTrashBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bill Summary Card */
  billSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowStyle,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summarySubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
  },
  discountCurrencySymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  spaciousDiscountInput: {
    width: 80,
    height: 36,
    textAlign: 'right',
    paddingHorizontal: 6,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },

  /* Payment Section */
  paymentSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowStyle,
  },
  paymentSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  paymentMethodOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentChoiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentChoiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  paymentChoiceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentChoiceIconWrapActive: {
    backgroundColor: colors.primary,
  },
  paymentChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentChoiceTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  /* Full Cart Sticky Footer */
  fullCartFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  fullCartCheckoutBtn: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadowLarge,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  fullCartCheckoutText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
});
