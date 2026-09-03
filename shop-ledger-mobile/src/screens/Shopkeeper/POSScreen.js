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
  UserCheck,
  UserPlus,
  ArrowRight,
  Package,
  CreditCard,
  Banknote,
  BookOpen,
  X,
  Plus,
  Minus,
  ChevronUp,
} from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import { getItems, getCustomers, saveSale, saveCustomer } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import ProductUnitModal from '../../components/ProductUnitModal';
import ReceiptModal from '../../components/ReceiptModal';
import AddCustomerModal from '../../components/AddCustomerModal';

const PAYMENT_MODES = [
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'Online', label: 'Online / UPI', icon: CreditCard },
  { id: 'Add to Book', label: 'Add to Book', icon: BookOpen },
];

export default function POSScreen({ navigation }) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadData = useCallback(async () => {
    try {
      const [itemsData, customersData] = await Promise.all([
        getItems(),
        getCustomers(),
      ]);
      setItems(itemsData || []);
      setCustomers(customersData || []);
    } catch (e) {
      console.error('POS load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    if (paymentMethod === 'Add to Book' && !selectedCustomer) {
      Alert.alert(
        'Customer Details Required',
        'Khata credit ("Add to Book") requires customer details. Please fill customer name & phone number.',
        [
          {
            text: 'Fill Customer Details',
            onPress: () => setShowAddCustomerModal(true),
          },
        ]
      );
      setShowAddCustomerModal(true);
      return;
    }

    setCompletingBill(true);
    try {
      const salePayload = {
        customerPhone: selectedCustomer ? (selectedCustomer.phone || selectedCustomer.customerPhone) : '',
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
      Alert.alert('Error', e.message || 'Failed to complete bill.');
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
      <Header subtitle="Point of Sale & Smart Billing" />

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
          {/* Customer Quick Selector Section */}
          <View style={styles.sectionCard}>
            <View style={styles.customerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UserCheck size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Customer Account</Text>
              </View>
              {selectedCustomer && (
                <TouchableOpacity onPress={handleClearCustomer} style={styles.clearCustBtn}>
                  <Text style={styles.clearCustText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.customerInputRow}>
              <View style={{ flex: 1, position: 'relative' }}>
                <TextInput
                  style={[
                    styles.customerInput,
                    selectedCustomer && styles.customerInputSelected,
                  ]}
                  placeholder="Enter Phone or Name (Optional)"
                  value={
                    selectedCustomer
                      ? `${selectedCustomer.name} (${selectedCustomer.phone || selectedCustomer.customerPhone})`
                      : customerSearch
                  }
                  onChangeText={(t) => {
                    setCustomerSearch(t);
                    setSelectedCustomer(null);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
              </View>

              <TouchableOpacity
                style={styles.addCustomerBtn}
                onPress={() => setShowAddCustomerModal(true)}
                activeOpacity={0.7}
              >
                <UserPlus size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Dropdown for customer search */}
            {showCustomerDropdown && customerSearch.length > 0 && !selectedCustomer && (
              <View style={styles.dropdownContainer}>
                {filteredCustomers.map((c) => (
                  <TouchableOpacity
                    key={c.phone || c.customerPhone}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectCustomer(c)}
                  >
                    <Text style={styles.dropdownName}>{c.name}</Text>
                    <Text style={styles.dropdownPhone}>
                      {c.phone || c.customerPhone}
                    </Text>
                  </TouchableOpacity>
                ))}
                {filteredCustomers.length === 0 && (
                  <TouchableOpacity
                    style={styles.dropdownItemNew}
                    onPress={async () => {
                      try {
                        await saveCustomer({
                          phone: customerSearch,
                          name: 'Customer ' + customerSearch,
                          address: '',
                        });
                        await loadData();
                        setSelectedCustomer({
                          phone: customerSearch,
                          name: 'Customer ' + customerSearch,
                        });
                        setShowCustomerDropdown(false);
                      } catch (e) {
                        Alert.alert('Error', e.message);
                      }
                    }}
                  >
                    <Plus size={16} color={colors.success} />
                    <Text style={styles.dropdownNewText}>
                      Quick Add "{customerSearch}"
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Product Search & Grid */}
          <View style={styles.sectionCard}>
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products (e.g. Milk, Rice)..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Product Grid */}
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
                  <Package size={32} color={colors.textMuted} />
                  <Text style={styles.emptyProductsText}>No matching products</Text>
                </View>
              )}
            </View>
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
                  {cart.length} {cart.length === 1 ? 'Item' : 'Items'} in Cart
                </Text>
                <Text style={styles.cartBannerTotal}>₹{finalTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.cartBannerRight}>
              <Text style={styles.viewCartText}>View Cart</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Interactive Cart & Checkout Modal */}
      <Modal
        visible={showCartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>
                  Order Cart ({cart.length})
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {cart.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setCart([]);
                      setShowCartModal(false);
                    }}
                  >
                    <Text style={styles.clearCartText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowCartModal(false)}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Customer Row in Modal */}
              <TouchableOpacity
                style={styles.modalCustomerCard}
                onPress={() => setShowAddCustomerModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <UserCheck size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalCustTitle}>Billing Customer</Text>
                      <Text style={styles.modalCustValue} numberOfLines={1}>
                        {selectedCustomer
                          ? `${selectedCustomer.name} (${selectedCustomer.phone || selectedCustomer.customerPhone})`
                          : 'Walk-in / Cash Customer'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb', marginLeft: 8 }}>
                    {selectedCustomer ? 'Edit ✏️' : '+ Add'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cart Items List with Stepper */}
              <View style={styles.modalItemsSection}>
                <Text style={styles.modalSectionLabel}>Items in Bill</Text>
                {cart.map((c, i) => (
                  <View key={i} style={styles.modalCartRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.cartItemName}>{c.item.name}</Text>
                      <Text style={styles.cartItemRate}>
                        ₹{c.rate} / {c.item.unit}
                      </Text>
                    </View>

                    {/* Stepper buttons */}
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateCartItemQty(i, -1)}
                      >
                        <Minus size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepperQtyText}>
                        {c.qty} {c.item.unit}
                      </Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateCartItemQty(i, 1)}
                      >
                        <Plus size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalItemTotal}>
                      ₹{c.amount.toFixed(2)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => removeCartItem(i)}
                      style={styles.cartDeleteBtn}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Calculations & Discount */}
              <View style={styles.billCalculations}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Subtotal</Text>
                  <Text style={styles.calcValue}>₹{subtotal.toFixed(2)}</Text>
                </View>

                <View style={styles.calcRowDiscount}>
                  <Text style={styles.calcLabel}>Discount (Flat ₹)</Text>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    value={discount}
                    onChangeText={setDiscount}
                  />
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
                  <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment Method Selector */}
              <Text style={styles.paymentMethodLabel}>Payment Method</Text>
              <View style={styles.paymentMethodsGrid}>
                {PAYMENT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = paymentMethod === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.paymentModeBtn,
                        active && styles.paymentModeBtnActive,
                      ]}
                      onPress={() => {
                        setPaymentMethod(mode.id);
                        if (mode.id === 'Add to Book' && !selectedCustomer) {
                          Alert.alert(
                            'Customer Details Required',
                            'Khata credit ("Add to Book") requires customer details. Please fill customer name & phone number.',
                            [
                              {
                                text: 'Fill Customer Details',
                                onPress: () => setShowAddCustomerModal(true),
                              },
                            ]
                          );
                          setShowAddCustomerModal(true);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon
                        size={18}
                        color={active ? colors.primaryDark : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.paymentModeText,
                          active && styles.paymentModeTextActive,
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Complete Bill Button at bottom of modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  cart.length === 0 && styles.checkoutBtnDisabled,
                ]}
                onPress={handleCheckout}
                disabled={completingBill || cart.length === 0}
                activeOpacity={0.8}
              >
                {completingBill ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.checkoutBtnText}>
                      Complete Bill • ₹{finalTotal.toFixed(2)}
                    </Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  emptyProducts: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyProductsText: {
    fontSize: 12,
    color: colors.textMuted,
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

  /* Cart Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  cartModalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  clearCartText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  modalCustomerCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCustTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalCustValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  modalItemsSection: {
    marginBottom: 14,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalCartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cartItemRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  stepperBtn: {
    padding: 4,
    borderRadius: 4,
  },
  stepperQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    minWidth: 44,
    textAlign: 'center',
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    minWidth: 64,
    textAlign: 'right',
    marginLeft: 6,
  },
  cartDeleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  billCalculations: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcRowDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  discountInput: {
    width: 90,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    textAlign: 'right',
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paymentModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  paymentModeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentModeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentModeTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkoutBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: colors.success,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadowStyle,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
