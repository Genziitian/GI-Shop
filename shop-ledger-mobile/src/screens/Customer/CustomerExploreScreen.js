import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
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
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getCities,
  getShops,
  getShopDetails,
  placeOrder,
  getCustomerInvites,
  respondToInvite,
} from '../../api/client';
import Header from '../../components/Header';
import ProductUnitModal from '../../components/ProductUnitModal';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';

export default function CustomerExploreScreen({ navigation, route }) {
  const { user, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Pune', 'Jaipur']);
  const [selectedCity, setSelectedCity] = useState(user?.city || 'Delhi');
  const [showCityModal, setShowCityModal] = useState(false);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
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
      Alert.alert('Error', e.message || 'Failed to load shop catalog');
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
      Alert.alert('Error', e.message || 'Failed to load shop catalog');
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

      Alert.alert(
        'Order Placed! 🎉',
        `Your order of ₹${totalAmount.toFixed(2)} was sent to ${activeCartShop.name}. Track live status under All Orders!`,
        [
          {
            text: 'View Orders',
            onPress: () => {
              setOrderList({});
              setActiveCartShop(null);
              setShowCartModal(false);
              navigation.navigate('CustomerOrders');
            },
          },
          {
            text: 'OK',
            onPress: () => {
              setOrderList({});
              setActiveCartShop(null);
              setShowCartModal(false);
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Order Failed', e.message || 'Failed to submit order.');
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
      Alert.alert('Error', e.message || 'Failed to update invite.');
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
      {/* Top Header with City Dropdown Selector */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.cityDropdownBtn}
          onPress={() => setShowCityModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.cityIconBadge}>
            <MapPin size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cityDropdownLabel}>Current City</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.cityDropdownText}>{selectedCity}</Text>
              <ChevronDown size={15} color={colors.text} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightBox}>
          {totalCartCount > 0 && (
            <TouchableOpacity
              style={styles.cartBadgeBtn}
              onPress={() => setShowCartModal(true)}
              activeOpacity={0.8}
            >
              <ShoppingCart size={15} color="#fff" />
              <Text style={styles.cartBadgeText}>₹{totalCartAmount.toFixed(0)}</Text>
            </TouchableOpacity>
          )}

          {/* Top Right Profile & Settings Button */}
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Settings size={14} color={colors.primaryDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.lockBtn}
            onPress={lock}
            activeOpacity={0.7}
          >
            <Lock size={14} color={colors.primaryDark} />
            <Text style={styles.lockBtnText}>Lock</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Staff Invites Banner */}
      {invites.map((inv) => (
        <View key={inv.id} style={styles.inviteBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteTitle}>🎉 Staff Invitation from {inv.shopName}</Text>
            <Text style={styles.inviteSub}>
              You have been invited to join as Cashier for {inv.shopName} ({inv.city}).
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.inviteActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => handleInviteAction(inv.id, 'ACCEPT')}
            >
              <Text style={styles.inviteActionText}>Accept & Join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteActionBtn, { backgroundColor: '#f1f5f9' }]}
              onPress={() => handleInviteAction(inv.id, 'DECLINE')}
            >
              <Text style={[styles.inviteActionText, { color: '#475569' }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search shops in ${selectedCity} by name or Short ID...`}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Shop List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Loading shops in {selectedCity}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => `shop-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Store size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No shops found in {selectedCity}</Text>
              <Text style={styles.emptySub}>Try selecting a different city from above.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.shopCard}>
              <View style={styles.shopHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.shopName}>{item.shopName}</Text>
                    <View style={styles.shortIdBadge}>
                      <Text style={styles.shortIdBadgeText}>ID: {item.shortId || `shp${item.id}`}</Text>
                    </View>
                  </View>
                  <Text style={styles.shopCity}>{item.city}</Text>
                </View>

                <View style={[styles.openStatusBadge, { backgroundColor: item.isOpen ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.openStatusText, { color: item.isOpen ? '#15803d' : '#b91c1c' }]}>
                    {item.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                  </Text>
                </View>
              </View>

              <View style={styles.shopInfoBlock}>
                <View style={styles.infoLine}>
                  <MapPin size={13} color={colors.textMuted} />
                  <Text style={styles.infoLineText} numberOfLines={1}>{item.shopAddress || 'Local Market'}</Text>
                </View>
                {item.timings ? (
                  <View style={styles.infoLine}>
                    <Clock size={13} color={colors.textMuted} />
                    <Text style={styles.infoLineText}>{item.timings}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.shopActionsRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, !item.isOpen && { backgroundColor: '#64748b' }]}
                  onPress={() => handleOpenShop(item)}
                  activeOpacity={0.8}
                >
                  <Store size={14} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>View Catalog & Order →</Text>
                </TouchableOpacity>

                {item.shopPhone ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => Linking.openURL(`tel:${item.shopPhone}`)}
                    >
                      <Phone size={14} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/91${item.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${item.shopName}, I found your shop on GI Shop and would like to ask about grocery items.`
                          )}`
                        )
                      }
                    >
                      <MessageCircle size={14} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* SHOP CATALOG MODAL */}
      <Modal visible={!!activeShop} animationType="slide" onRequestClose={() => setActiveShop(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {activeShop && (
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.catalogHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setActiveShop(null)}>
                  <Text style={styles.backBtnText}>← Back to Shops</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.catalogShopName}>{activeShop.shopName}</Text>
                      <View style={[styles.openStatusBadge, { backgroundColor: activeShop.isOpen ? '#dcfce7' : '#fee2e2' }]}>
                        <Text style={[styles.openStatusText, { color: activeShop.isOpen ? '#15803d' : '#b91c1c' }]}>
                          {activeShop.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.catalogShopSub}>
                      ID: <Text style={{ color: colors.primary, fontWeight: '700' }}>{activeShop.shortId}</Text> • {activeShop.city} • {activeShop.shopAddress}
                    </Text>
                  </View>
                </View>

                {/* Catalog Search */}
                <View style={[styles.searchBox, { marginHorizontal: 0, marginTop: 10 }]}>
                  <Search size={14} color={colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search grocery items in this shop..."
                    placeholderTextColor={colors.textMuted}
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                  />
                  {catalogSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogSearch('')}>
                      <X size={14} color={colors.textMuted} />
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
                          ₹{item.price.toFixed(2)}{' '}
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>/ {item.unit}</Text>
                        </Text>
                        {isInCart && (
                          <View style={styles.inCartChip}>
                            <Text style={styles.inCartChipText}>
                              In Cart: {cartEntry.qty} {item.unit} (₹{cartEntry.amount.toFixed(2)})
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.addBtn,
                          isInCart ? styles.addBtnActive : {},
                          !activeShop.isOpen ? { backgroundColor: '#cbd5e1' } : {},
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

      {/* SINGLE-SHOP CART CONFLICT MODAL */}
      <Modal visible={!!cartConflict} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.conflictCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={24} color="#f59e0b" />
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
                style={[styles.conflictBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setCartConflict(null)}
              >
                <Text style={[styles.conflictBtnText, { color: '#475569' }]}>Keep Cart</Text>
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  cityDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
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
    borderColor: '#bfdbfe',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityModalItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#bfdbfe',
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
    backgroundColor: '#f1f5f9',
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
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  shortIdBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortIdBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  shopCity: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  openStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  openStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  shopInfoBlock: {
    gap: 4,
    marginBottom: 12,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLineText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  shopActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    width: 36,
    height: 36,
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
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  inCartChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
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
    backgroundColor: '#eff6ff',
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cartItemRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cartItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cartDeleteBtn: {
    padding: 6,
  },
  cartSummaryBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
    fontSize: 16,
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
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendOrderBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
