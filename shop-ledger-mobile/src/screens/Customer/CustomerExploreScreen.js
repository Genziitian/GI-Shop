import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { TouchableOpacity } from '../../components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Store,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Check,
  Lock,
  Settings,
  User,
  ArrowLeft,
  ChevronLeft,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { FadeInView } from '../../components/ui/Motion';
import { useAuth } from '../../context/AuthContext';
import {
  getCities,
  getShops,
  getShopDetails,
  placeOrder,
  getCustomerInvites,
  respondToInvite,
} from '../../api/client';
import { useTranslation } from '../../context/LanguageContext';
import Header from '../../components/Header';
import OrderSuccessModal from '../../components/OrderSuccessModal';
import ProductUnitModal from '../../components/ProductUnitModal';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { showErrorAlert } from '../../utils/errorHandler';

export default function CustomerExploreScreen({ navigation, route }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const { t } = useTranslation();
  const { user, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Pune', 'Jaipur']);
  const [selectedCity, setSelectedCity] = useState(user?.city || 'Delhi');
  const [showCityModal, setShowCityModal] = useState(false);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [invites, setInvites] = useState([]);

  // Shop Catalog View Modal
  const [activeShop, setActiveShop] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Cart & Order State (Single Shop Rule)
  const [orderList, setOrderList] = useState({}); // { [productId]: { item, qty, rate, amount } }
  const [activeCartShop, setActiveCartShop] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [cartConflict, setCartConflict] = useState(null); // { pendingItem, pendingShop }

  // Smart Quantity Modal
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);
  const [selectedModalShop, setSelectedModalShop] = useState(null);

  // Check if route requested opening a specific shop catalog (e.g. from My Khata)
  useEffect(() => {
    if (route.params?.openShopId) {
      handleOpenShopById(route.params.openShopId);
    }
  }, [route.params?.openShopId]);

  const loadData = useCallback(async () => {
    try {
      const [cList, sList, inv] = await Promise.all([
        getCities().catch(() => ['Delhi', 'Mumbai', 'Bangalore']),
        getShops(selectedCity).catch(() => []),
        getCustomerInvites().catch(() => []),
      ]);
      if (Array.isArray(cList) && cList.length > 0) setCities(cList);
      setShops(Array.isArray(sList) ? sList : []);
      setInvites(Array.isArray(inv) ? inv : []);
    } catch (e) {
      console.error('Failed to load explore data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenShop = async (shop) => {
    setCatalogLoading(true);
    try {
      const details = await getShopDetails(shop.id || shop.shopId);
      setActiveShop(details);
    } catch (e) {
      showErrorAlert(e, 'Shop Catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleOpenShopById = async (shopId) => {
    setCatalogLoading(true);
    try {
      const details = await getShopDetails(shopId);
      setActiveShop(details);
    } catch (e) {
      showErrorAlert(e, 'Shop Catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const openItemModal = (product, shop) => {
    if (!shop.isOpen) {
      Alert.alert('Shop Closed', 'This shop is currently closed. Orders cannot be placed right now.');
      return;
    }
    if (activeCartShop && activeCartShop.id !== shop.id && Object.keys(orderList).length > 0) {
      setCartConflict({ pendingItem: product, pendingShop: shop });
      return;
    }
    setSelectedModalProduct(product);
    setSelectedModalShop(shop);
  };

  const handleConfirmAddModalItem = (param1, param2, param3) => {
    let product, qty, finalAmount;
    if (param1 && param1.item) {
      product = param1.item;
      qty = param1.qty;
      finalAmount = param1.amount;
    } else {
      product = param1;
      qty = param2;
      finalAmount = param3;
    }

    if (!product || !product.id) return;

    const shopToSet = selectedModalShop || activeShop;
    if (shopToSet && (!activeCartShop || activeCartShop.id !== shopToSet.id)) {
      setActiveCartShop({
        id: shopToSet.id,
        name: shopToSet.shopName,
        shortId: shopToSet.shortId,
        phone: shopToSet.shopPhone,
      });
    }

    setOrderList((prev) => ({
      ...prev,
      [product.id]: {
        item: product,
        qty: qty,
        rate: product.price,
        amount: finalAmount,
      },
    }));

    setSelectedModalProduct(null);
    setSelectedModalShop(null);
  };

  const handleResolveCartConflict = () => {
    if (!cartConflict) return;
    const { pendingItem, pendingShop } = cartConflict;
    setOrderList({});
    setActiveCartShop({
      id: pendingShop.id,
      name: pendingShop.shopName,
      shortId: pendingShop.shortId,
      phone: pendingShop.shopPhone,
    });
    setCartConflict(null);
    setSelectedModalProduct(pendingItem);
    setSelectedModalShop(pendingShop);
  };

  const handleSendOrder = async () => {
    if (!activeCartShop || Object.keys(orderList).length === 0) return;
    setOrderSubmitting(true);
    try {
      const itemsPayload = Object.values(orderList).map((e) => ({
        item: e.item,
        qty: e.qty,
        rate: e.rate,
        amount: e.amount,
      }));
      const totalAmount = Object.values(orderList).reduce((sum, e) => sum + e.amount, 0);

      await placeOrder({
        shopId: activeCartShop.id,
        items: itemsPayload,
        estimatedTotal: totalAmount,
        deliveryAddress: user?.address || 'Customer Profile Address',
      });

      setOrderSuccess({ total: totalAmount, shopName: activeCartShop.name });
    } catch (e) {
      showErrorAlert(e, 'Order Submission');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      await respondToInvite(inviteId, action);
      Alert.alert('Success', `Invitation ${action === 'ACCEPT' ? 'accepted' : 'declined'}.`);
      loadData();
    } catch (e) {
      showErrorAlert(e, 'Store Invitation');
    }
  };

  const filteredShops = shops.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.shopName || '').toLowerCase().includes(q) ||
      (s.shortId || '').toLowerCase().includes(q) ||
      (s.shopAddress || '').toLowerCase().includes(q)
    );
  });

  const totalCartCount = Object.values(orderList).reduce((sum, e) => sum + e.qty, 0);
  const totalCartAmount = Object.values(orderList).reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Uniform Top Header with App Name, Icon & Lock Button */}
      <Header
        title="GI SHOP"
        subtitle={t('Smart Grocery Discovery')}
        rightComponent={
          totalCartCount > 0 ? (
            <TouchableOpacity
              style={styles.cartBadgeBtn}
              onPress={() => setShowCartModal(true)}
              activeOpacity={0.8}
            >
              <ShoppingCart size={15} color="#fff" />
              <Text style={styles.cartBadgeText}>₹{totalCartAmount.toFixed(0)}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filter Row: Compact City Selector & Search Bar in 1 Single Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.compactCityBtn}
          onPress={() => setShowCityModal(true)}
          activeOpacity={0.7}
        >
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.compactCityLabel}>{t('City:')}</Text>
          <Text style={styles.compactCityText}>{selectedCity}</Text>
          <ChevronDown size={13} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.searchBoxInline}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInputInline}
            placeholder={`Search shops in ${selectedCity}...`}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Shop List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonLoader type="shopCard" count={4} />
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => `shop-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadData();
                setRefreshing(false);
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Store size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('No shops found')}</Text>
              <Text style={styles.emptySub}>{t('Try selecting a different city from above.')}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <FadeInView index={index} style={styles.shopCard}>
              <View style={styles.shopHeaderRow}>
                <View style={styles.shopCardAvatar}>
                  <Store size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName} numberOfLines={1}>{item.shopName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={styles.shortIdBadge}>
                      <Text style={styles.shortIdBadgeText}>{String(item.shortId || `shp${item.id}`).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.shopCity}>{item.city}</Text>
                  </View>
                </View>

                <View style={[styles.openStatusBadge, { backgroundColor: item.isOpen ? '#dff3e6' : '#fee2e2' }]}>
                  <View style={[styles.statusDotSmall, { backgroundColor: item.isOpen ? '#1f9d5a' : '#d93a2f' }]} />
                  <Text style={[styles.openStatusText, { color: item.isOpen ? '#0b5e33' : '#b91c1c' }]}>
                    {item.isOpen ? t('OPEN') : t('CLOSED')}
                  </Text>
                </View>
              </View>

              <View style={styles.shopInfoBlock}>
                <View style={styles.infoLine}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.infoLineText} numberOfLines={1}>{item.shopAddress || 'Local Market'}</Text>
                </View>
                {item.timings ? (
                  <View style={styles.infoLine}>
                    <Clock size={14} color={colors.primary} />
                    <Text style={styles.infoLineText}>{item.timings}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.shopActionsRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, !item.isOpen && { backgroundColor: '#667085' }]}
                  onPress={() => handleOpenShop(item)}
                  activeOpacity={0.8}
                >
                  <Store size={16} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>{t('View Catalog & Order →')}</Text>
                </TouchableOpacity>

                {item.shopPhone ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => Linking.openURL(`tel:${item.shopPhone}`)}
                    >
                      <Phone size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#eef8f1', borderColor: '#c4e8d1' }]}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/91${item.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${item.shopName}, I found your shop on GI Shop and would like to ask about grocery items.`
                          )}`
                        )
                      }
                    >
                      <MessageCircle size={18} color="#1f9d5a" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </FadeInView>
          )}
        />
      )}

      {/* CATALOG LOADING SPINNER */}
      <Modal visible={catalogLoading} transparent animationType="fade" onRequestClose={() => setCatalogLoading(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(16, 24, 40, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Loading Shop Catalog...</Text>
          </View>
        </View>
      </Modal>

      {/* SHOP CATALOG MODAL */}
      <Modal
        visible={!!activeShop}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveShop(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f8fa' }}>
          {activeShop && (
            <View style={{ flex: 1 }}>
              {/* Shop Hero Header */}
              <View style={styles.shopHero}>
                <View style={styles.shopHeroTop}>
                  <TouchableOpacity
                    style={styles.shopHeroBack}
                    onPress={() => setActiveShop(null)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <ArrowLeft size={18} color="#ffffff" />
                    <Text style={styles.shopHeroBackText}>Shops</Text>
                  </TouchableOpacity>
                  <View style={[styles.shopHeroStatus, { backgroundColor: activeShop.isOpen ? '#dff3e6' : '#fee2e2' }]}>
                    <View style={[styles.shopHeroDot, { backgroundColor: activeShop.isOpen ? '#1f9d5a' : '#d93a2f' }]} />
                    <Text style={[styles.shopHeroStatusText, { color: activeShop.isOpen ? '#0b5e33' : '#b91c1c' }]}>
                      {activeShop.isOpen ? 'OPEN NOW' : 'CLOSED'}
                    </Text>
                  </View>
                </View>

                <View style={styles.shopHeroIdentity}>
                  <View style={styles.shopHeroAvatar}>
                    <Store size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopHeroName} numberOfLines={2}>{activeShop.shopName}</Text>
                    <Text style={styles.shopHeroId}>
                      Shop ID: <Text style={{ color: '#ffd37a', fontWeight: '800' }}>{String(activeShop.shortId || '').toUpperCase()}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.shopHeroChips}>
                  <View style={styles.shopHeroChip}>
                    <MapPin size={13} color="#ffffff" />
                    <Text style={styles.shopHeroChipText} numberOfLines={1}>
                      {activeShop.city ? `${activeShop.city} • ` : ''}{activeShop.shopAddress || 'Local Store Location'}
                    </Text>
                  </View>
                  {activeShop.timings ? (
                    <View style={[styles.shopHeroChip, { alignSelf: 'flex-start' }]}>
                      <Clock size={13} color="#ffffff" />
                      <Text style={styles.shopHeroChipText}>{activeShop.timings}</Text>
                    </View>
                  ) : null}
                </View>

                {activeShop.shopPhone ? (
                  <View style={styles.catalogActionRow}>
                    <TouchableOpacity
                      style={styles.heroCallBtn}
                      activeOpacity={0.85}
                      onPress={() => Linking.openURL(`tel:${activeShop.shopPhone}`)}
                    >
                      <Phone size={17} color="#101828" />
                      <Text style={styles.heroCallText}>Call Shop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.heroWaBtn}
                      activeOpacity={0.85}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/91${String(activeShop.shopPhone).replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${activeShop.shopName}, I found your shop on GI Shop and would like to ask about grocery items.`
                          )}`
                        )
                      }
                    >
                      <MessageCircle size={17} color="#1f9d5a" />
                      <Text style={styles.heroWaText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Search Input Box */}
              <View style={styles.shopSearchWrap}>
                <View style={[styles.catalogSearchContainer, { marginTop: 0 }, searchFocused && styles.catalogSearchFocused]}>
                  <Search size={18} color={searchFocused ? colors.primary : colors.textMuted} />
                  <TextInput
                    style={styles.catalogSearchInput}
                    placeholder="Search products in this shop..."
                    placeholderTextColor={colors.textMuted}
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  {catalogSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Items List */}
              <FlatList
                data={(activeShop.items || []).filter((i) =>
                  (i.name || '').toLowerCase().includes(catalogSearch.toLowerCase())
                )}
                keyExtractor={(item) => `cat-item-${item.id}`}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No items found</Text>
                    <Text style={styles.emptySub}>This shop has not listed matching products yet.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const cartEntry = orderList[item.id];
                  const isInCart = !!cartEntry;

                  return (
                    <View style={styles.productCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productRate}>
                          ₹{(Number(item?.price ?? item?.rate) || 0).toFixed(2)}{' '}
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>/ {item?.unit || 'unit'}</Text>
                        </Text>
                        {isInCart && (
                          <View style={styles.inCartChip}>
                            <Text style={styles.inCartChipText}>
                              In Cart: {cartEntry.qty} {item?.unit || 'unit'} (₹{(Number(cartEntry?.amount) || 0).toFixed(2)})
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.addBtn,
                          isInCart ? styles.addBtnActive : {},
                          !activeShop.isOpen ? { backgroundColor: '#d0d5dd' } : {},
                        ]}
                        disabled={!activeShop.isOpen}
                        onPress={() => openItemModal(item, activeShop)}
                        activeOpacity={0.8}
                      >
                        <Plus size={14} color={isInCart ? colors.primary : '#fff'} />
                        <Text style={[styles.addBtnText, isInCart ? { color: colors.primary } : {}]}>
                          {isInCart ? 'Update' : '+ Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />

              {/* Floating Bottom Cart Bar */}
              {totalCartCount > 0 && activeCartShop && activeCartShop.id === activeShop.id && (
                <View style={styles.catalogCartFooter}>
                  <TouchableOpacity
                    style={styles.cartFooterBar}
                    onPress={() => setShowCartModal(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ShoppingCart size={18} color="#fff" />
                      <View>
                        <Text style={styles.cartFooterTitle}>
                          {totalCartCount} Items in List
                        </Text>
                        <Text style={styles.cartFooterSub}>Tap to review & send order</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.cartFooterPrice}>₹{totalCartAmount.toFixed(2)}</Text>
                      <ArrowRight size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* CART & SEND ORDER MODAL */}
      <Modal visible={showCartModal} animationType="slide" onRequestClose={() => setShowCartModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1, padding: 16 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order List for {activeCartShop?.name}</Text>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Object.values(orderList)}
              keyExtractor={(item) => `cart-${item.item.id}`}
              contentContainerStyle={{ paddingVertical: 12 }}
              renderItem={({ item: entry }) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{entry.item.name}</Text>
                    <Text style={styles.cartItemRate}>
                      {entry.qty} {entry.item.unit} @ ₹{entry.rate} / {entry.item.unit}
                    </Text>
                  </View>
                  <Text style={styles.cartItemAmount}>₹{entry.amount.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.cartDeleteBtn}
                    onPress={() => {
                      const updated = { ...orderList };
                      delete updated[entry.item.id];
                      setOrderList(updated);
                      if (Object.keys(updated).length === 0) {
                        setActiveCartShop(null);
                        setShowCartModal(false);
                      }
                    }}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            />

            <View style={styles.cartSummaryBox}>
              <View style={styles.flexBetween}>
                <Text style={styles.summaryLabel}>Total Payable Amount:</Text>
                <Text style={styles.summaryTotal}>₹{totalCartAmount.toFixed(2)}</Text>
              </View>
              <Text style={styles.summaryDelivery}>
                Delivery Address: {user?.address || 'Customer Profile Address'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.sendOrderBtn, orderSubmitting && { opacity: 0.7 }]}
              disabled={orderSubmitting}
              onPress={handleSendOrder}
              activeOpacity={0.8}
            >
              {orderSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendOrderBtnText}>
                  Send Order to {activeCartShop?.name || 'Shopkeeper'} (₹{totalCartAmount.toFixed(2)})
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearCartBtn}
              onPress={() => {
                setOrderList({});
                setActiveCartShop(null);
                setShowCartModal(false);
              }}
            >
              <Text style={styles.clearCartBtnText}>Clear Cart</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <OrderSuccessModal
        visible={!!orderSuccess}
        amount={orderSuccess?.total}
        shopName={orderSuccess?.shopName}
        onClose={() => {
          setOrderSuccess(null);
          setOrderList({});
          setActiveCartShop(null);
          setShowCartModal(false);
        }}
        onViewOrders={() => {
          setOrderSuccess(null);
          setOrderList({});
          setActiveCartShop(null);
          setShowCartModal(false);
          navigation.navigate('CustomerOrders');
        }}
      />

      {/* SINGLE-SHOP CART CONFLICT MODAL */}
      <Modal visible={!!cartConflict} transparent animationType="fade" onRequestClose={() => setCartConflict(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.conflictCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={24} color="#f2a516" />
              <Text style={styles.conflictTitle}>Clear Current Cart?</Text>
            </View>
            <Text style={styles.conflictDesc}>
              Your cart currently contains items from <Text style={{ fontWeight: '700' }}>{activeCartShop?.name}</Text>.
              An order can only contain items from one store at a time.{'\n\n'}
              Would you like to clear your current cart and start an order with{' '}
              <Text style={{ fontWeight: '700' }}>{cartConflict?.pendingShop?.shopName}</Text>?
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.conflictBtn, { backgroundColor: '#eff1f4' }]}
                onPress={() => setCartConflict(null)}
              >
                <Text style={[styles.conflictBtnText, { color: '#475467' }]}>Keep Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.conflictBtn, { backgroundColor: colors.danger }]}
                onPress={handleResolveCartConflict}
              >
                <Text style={[styles.conflictBtnText, { color: '#fff' }]}>Clear & Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SMART QUANTITY MODAL */}
      <ProductUnitModal
        visible={!!selectedModalProduct}
        product={selectedModalProduct}
        onClose={() => {
          setSelectedModalProduct(null);
          setSelectedModalShop(null);
        }}
        onConfirm={handleConfirmAddModalItem}
      />

      {/* CITY SELECTION DROPDOWN MODAL */}
      <Modal visible={showCityModal} transparent animationType="fade" onRequestClose={() => setShowCityModal(false)}>
        <View style={styles.cityModalOverlay}>
          <View style={styles.cityModalCard}>
            <View style={styles.cityModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color={colors.primary} />
                <Text style={styles.cityModalTitle}>Select Your City</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cityModalSub}>Choose a city to explore local kirana & grocery stores</Text>
            
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {cities.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityModalItem, isSelected && styles.cityModalItemActive]}
                    onPress={() => {
                      setSelectedCity(city);
                      setActiveShop(null);
                      setShowCityModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cityModalItemText, isSelected && styles.cityModalItemTextActive]}>
                      {city}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PROFILE & SETTINGS MODAL */}
      <ProfileSettingsModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#eff1f4',
    borderWidth: 1,
    borderColor: '#e4e7ec',
    gap: 4,
  },
  profileAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  compactCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e9f6ee',
    borderColor: '#bfe3cb',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
  },
  compactCityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  compactCityText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  searchBoxInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputInline: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    paddingVertical: 0,
  },
  cityDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f8fa',
    borderColor: '#d0d5dd',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cityIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityDropdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  cityDropdownText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  headerRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#bfe3cb',
    gap: 4,
  },
  lockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cityModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  cityModalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  cityModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityModalItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#bfe3cb',
  },
  cityModalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cityModalItemTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteBanner: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  inviteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b21b6',
  },
  inviteSub: {
    fontSize: 11,
    color: '#6d28d9',
    marginTop: 2,
  },
  inviteActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  cityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#eff1f4',
    borderColor: colors.border,
    borderWidth: 1,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  shopCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  shopCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#e9f6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotSmall: { width: 7, height: 7, borderRadius: 4 },
  shopName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  shortIdBadge: {
    backgroundColor: '#e9f6ee',
    borderColor: '#bfe3cb',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  shortIdBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  shopCity: {
    fontSize: 12,
    color: colors.textMuted,
  },
  openStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  openStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  shopInfoBlock: {
    gap: 8,
    marginBottom: 14,
    backgroundColor: '#f7f8fa',
    borderRadius: 14,
    padding: 12,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLineText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  shopActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e9f6ee',
    borderColor: '#bfe3cb',
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  catalogNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catalogNavBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catalogNavBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  catalogNavTitleBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  catalogNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  shopHero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 52,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  shopHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shopHeroBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shopHeroBackText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  shopHeroStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  shopHeroDot: { width: 8, height: 8, borderRadius: 4 },
  shopHeroStatusText: { fontSize: 11.5, fontWeight: '900', letterSpacing: 0.5 },
  shopHeroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  shopHeroAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  shopHeroName: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: -0.3 },
  shopHeroId: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  shopHeroChips: { marginTop: 14, gap: 8 },
  shopHeroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  shopHeroChipText: { color: '#ffffff', fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  heroCallBtn: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, backgroundColor: '#f2a516' },
  heroCallText: { color: '#101828', fontSize: 14.5, fontWeight: '800' },
  heroWaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, backgroundColor: '#ffffff' },
  heroWaText: { color: '#0b5e33', fontSize: 14.5, fontWeight: '800' },
  shopSearchWrap: { paddingHorizontal: 16, marginTop: -26, zIndex: 2 },
  catalogHeroHeader: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shopAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e9f6ee',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#bfe3cb',
    borderWidth: 1,
  },
  catalogShortIdText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  catalogInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  catalogInfoText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  catalogSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  catalogSearchFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
  },
  catalogActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  catalogCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  catalogCallText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  catalogWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef8f1',
    borderWidth: 1,
    borderColor: '#c4e8d1',
  },
  catalogWaText: { color: '#0b5e33', fontSize: 14, fontWeight: '800' },
  catalogSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  catalogHeader: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  catalogShopName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  catalogShopSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  productRate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  inCartChip: {
    backgroundColor: '#eef8f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  inCartChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f7a43',
  },
  addBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnActive: {
    backgroundColor: '#e9f6ee',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogCartFooter: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  cartFooterBar: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cartFooterTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cartFooterSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  cartFooterPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cartItemRate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cartItemAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  cartDeleteBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
  },
  cartSummaryBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
  },
  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.success,
  },
  summaryDelivery: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  sendOrderBtn: {
    backgroundColor: colors.primary,
    height: 56,
    justifyContent: 'center',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  sendOrderBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  clearCartBtn: {
    padding: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  clearCartBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  conflictCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    width: '100%',
    maxWidth: 360,
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  conflictDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  conflictBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  conflictBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
