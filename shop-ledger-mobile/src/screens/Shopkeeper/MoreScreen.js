import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MoreHorizontal,
  Package,
  Users,
  Store,
  LogOut,
  ChevronRight,
  Phone,
  MapPin,
  Lock,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Search,
  KeyRound,
  ShieldCheck,
  Settings,
  Shield,
  FileText,
} from 'lucide-react-native';
import { Modal } from 'react-native';
import { colors, shadowStyle, shadowLarge } from '../../theme/colors';
import {
  getItems,
  saveItem,
  editItem,
  deleteItem,
  getStaff,
  inviteStaff,
  deleteStaff,
  getMyDetailedShop,
  updateMyDetailedShop,
  toggleShopStatus,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import EditProductModal from '../../components/EditProductModal';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';
import CitySelector from '../../components/CitySelector';

export default function MoreScreen({ navigation }) {
  const { user, logout, changePin } = useAuth();

  // Active Sub-View: 'hub' | 'items' | 'staff' | 'profile' | 'pin'
  const [activeSubView, setActiveSubView] = useState('hub');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleConfirmAccountDeletion = () => {
    Alert.alert(
      '⚠️ Account Deletion Request',
      'Are you sure you want to request permanent account deletion? This action will erase your shop catalog, staff links, and personal data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Deletion',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Deletion Request Received',
              'Your account deletion request has been submitted to system administration. You will be logged out now.',
              [
                {
                  text: 'OK',
                  onPress: () => logout(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Shop Status
  const [isOpen, setIsOpen] = useState(user?.shop?.isOpen === 1 || user?.staffRole?.isOpen === 1);
  const isOwner = user?.role === 'Shopkeeper' && !user?.staffRole;

  // Items State
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Staff State
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [invitingStaff, setInvitingStaff] = useState(false);
  const [staffNotice, setStaffNotice] = useState('');

  // Shop Profile State
  const [detailedShop, setDetailedShop] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [shopForm, setShopForm] = useState({
    shopName: user?.shop?.shopName || '',
    shopPhone: user?.shop?.shopPhone || user?.phone || '',
    city: user?.shop?.city || user?.city || 'Delhi',
    shopAddress: user?.shop?.shopAddress || user?.address || '',
    timings: user?.shop?.timings || '08:00 AM - 10:00 PM',
  });

  // PIN Change State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  const loadAllMoreData = useCallback(async () => {
    try {
      const [itemsData, staffData, detailedShopData] = await Promise.all([
        getItems().catch(() => []),
        isOwner ? getStaff().catch(() => []) : Promise.resolve([]),
        getMyDetailedShop().catch(() => null),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setStaffList(Array.isArray(staffData) ? staffData : []);
      if (detailedShopData) {
        setDetailedShop(detailedShopData);
        setIsOpen(detailedShopData.isOpen === 1);
        setShopForm({
          shopName: detailedShopData.shopName || user?.shop?.shopName || '',
          shopPhone: detailedShopData.shopPhone || user?.shop?.shopPhone || user?.phone || '',
          city: detailedShopData.city || user?.shop?.city || 'Delhi',
          shopAddress: detailedShopData.shopAddress || user?.shop?.shopAddress || '',
          timings: detailedShopData.timings || user?.shop?.timings || '08:00 AM - 10:00 PM',
        });
      }
    } catch (e) {
      console.error('MoreScreen load error:', e);
    }
  }, [isOwner, user]);

  useEffect(() => {
    loadAllMoreData();
  }, [loadAllMoreData]);

  useEffect(() => {
    if (user?.shop) {
      setShopForm((prev) => ({
        shopName: prev.shopName || user?.shop?.shopName || '',
        shopPhone: prev.shopPhone || user?.shop?.shopPhone || user?.phone || '',
        city: prev.city || user?.shop?.city || user?.city || 'Delhi',
        shopAddress: prev.shopAddress || user?.shop?.shopAddress || user?.address || '',
        timings: prev.timings || user?.shop?.timings || '08:00 AM - 10:00 PM',
      }));
    }
  }, [user]);

  const handleToggleStoreStatus = async () => {
    try {
      const res = await toggleShopStatus();
      setIsOpen(res.isOpen);
      Alert.alert(
        res.isOpen ? 'Store Opened' : 'Store Closed',
        res.isOpen
          ? 'Your store is now OPEN and visible for customer orders.'
          : 'Your store is now CLOSED for new incoming orders.'
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to toggle status.');
    }
  };

  // --- Items Actions ---
  const handleOpenAddItem = () => {
    setSelectedProduct(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item) => {
    setSelectedProduct(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              await loadAllMoreData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  const handleSaveItem = async (productData) => {
    if (productData.id) {
      await editItem(productData.id, {
        name: productData.name,
        price: productData.price,
        unit: productData.unit,
      });
    } else {
      await saveItem({
        name: productData.name,
        price: productData.price,
        unit: productData.unit,
      });
    }
    loadAllMoreData();
  };

  // --- Staff Actions ---
  const handleInviteStaff = async () => {
    if (!staffIdentifier.trim()) {
      Alert.alert('Required', 'Please enter customer Short ID or Phone number.');
      return;
    }
    setInvitingStaff(true);
    setStaffNotice('');
    try {
      const res = await inviteStaff(staffIdentifier.trim());
      setStaffNotice(res.message || 'Staff invite sent successfully!');
      setStaffIdentifier('');
      await loadAllMoreData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to invite staff.');
    } finally {
      setInvitingStaff(false);
    }
  };

  const handleRemoveStaff = (staffId) => {
    Alert.alert(
      'Remove Staff',
      'Are you sure you want to remove this cashier from your shop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaff(staffId);
              await loadAllMoreData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to remove staff.');
            }
          },
        },
      ]
    );
  };

  // --- Profile Actions ---
  const handleSaveShopProfile = async () => {
    if (!isOwner) {
      return Alert.alert('Restricted', 'Only the shop owner can edit shop details.');
    }
    setShopSaving(true);
    setProfileNotice('');
    try {
      const res = await updateMyDetailedShop(shopForm);
      setProfileNotice(res.message || 'Shop details updated successfully!');
      await loadAllMoreData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save shop details.');
    } finally {
      setShopSaving(false);
    }
  };

  // --- PIN Change Action ---
  const handleChangePinSubmit = async () => {
    setPinNotice('');
    setPinError('');
    if (!currentPinInput.trim() || !newPinInput.trim() || !confirmNewPinInput.trim()) {
      setPinError('All PIN fields are required.');
      return;
    }
    if (!/^\d{4}$/.test(newPinInput.trim())) {
      setPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPinInput.trim() !== confirmNewPinInput.trim()) {
      setPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setPinSaving(true);
    try {
      const res = await changePin(currentPinInput.trim(), newPinInput.trim());
      setPinNotice(res.message || 'Security PIN updated successfully!');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
    } catch (e) {
      setPinError(e.message || 'Failed to update PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  // --- Logout Action ---
  const handleConfirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of GI SHOP?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const safeItems = Array.isArray(items) ? items : [];
  const safeStaff = Array.isArray(staffList) ? staffList : [];
  const filteredItems = safeItems.filter((i) =>
    i.name.toLowerCase().includes(itemsSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={
          activeSubView === 'items'
            ? 'Manage Items'
            : activeSubView === 'staff'
            ? 'Staff Management'
            : activeSubView === 'profile'
            ? 'Edit Shop Details'
            : activeSubView === 'pin'
            ? 'Security PIN'
            : 'More Options'
        }
        subtitle={
          activeSubView === 'items'
            ? 'Product Catalog & Pricing'
            : activeSubView === 'staff'
            ? 'Cashiers & Store Staff'
            : activeSubView === 'profile'
            ? 'Address, Timings & Info'
            : activeSubView === 'pin'
            ? 'Change 4-Digit Lock PIN'
            : 'Store Settings & Operations'
        }
        showLock={true}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HUB VIEW ================= */}
        {activeSubView === 'hub' && (
          <>
            {/* Top Shop Profile & Live Status Card (Click to open Edit Shop Profile!) */}
            <View style={styles.shopStatusCard}>
              <TouchableOpacity
                style={styles.shopStatusTop}
                onPress={() => setActiveSubView('profile')}
                activeOpacity={0.7}
              >
                <View style={styles.storeIconBox}>
                  <Store size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.shopNameText}>
                      {user?.shop?.shopName || detailedShop?.shopName || 'GI SHOP Store'}
                    </Text>
                    <View style={styles.editPill}>
                      <Text style={styles.editPillText}>Edit ✏️</Text>
                    </View>
                  </View>
                  <Text style={styles.shopMetaText}>
                    ID: <Text style={{ color: colors.primary, fontWeight: '800' }}>{user?.shop?.shortId || detailedShop?.shortId || user?.shortId}</Text> • {isOwner ? '👑 Shop Owner' : '🛡️ Cashier'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Status Switch Bar */}
              <View style={styles.statusSwitchBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
                  <Text style={styles.statusLabelText}>
                    Store Status: <Text style={{ fontWeight: '800', color: isOpen ? colors.success : colors.danger }}>{isOpen ? 'OPEN' : 'CLOSED'}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.statusToggleBtn, isOpen ? styles.statusToggleBtnOpen : styles.statusToggleBtnClosed]}
                  onPress={handleToggleStoreStatus}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusToggleBtnText, isOpen ? styles.statusToggleBtnTextOpen : styles.statusToggleBtnTextClosed]}>
                    {isOpen ? 'Close Shop' : 'Open Shop'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Options List */}
            <View style={styles.menuSection}>
              {/* 1. Items Management (Moved to More) */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setActiveSubView('items')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Package size={22} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.menuItemTitle}>Items & Price Catalog</Text>
                    <View style={styles.itemsCountBadge}>
                      <Text style={styles.itemsCountText}>{safeItems.length} Items</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 2. Staff Management */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setActiveSubView('staff')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Users size={22} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Staff Management</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 3. Profile & Settings */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowProfileModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#e0f2fe' }]}>
                  <Settings size={22} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Profile & Settings</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 4. Change Security PIN */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setPinNotice('');
                  setPinError('');
                  setActiveSubView('pin');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#fdf4ff' }]}>
                  <KeyRound size={22} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Account Password</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 5. Privacy Policy */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Linking.openURL('https://gi-shop.genziitian.in/privacy')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Shield size={22} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Privacy Policy</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 6. Terms & Conditions */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Linking.openURL('https://gi-shop.genziitian.in/terms')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                  <FileText size={22} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Terms & Conditions</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 7. Account Deletion Request */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Linking.openURL('https://gi-shop.genziitian.in/delete')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
                  <Trash2 size={22} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: '#dc2626' }]}>Account Deletion Request</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* 8. Logout */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutMenuItem]}
                onPress={handleConfirmLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
                  <LogOut size={22} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.danger }]}>
                    Log Out
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ================= PIN CHANGE SUB-VIEW ================= */}
        {activeSubView === 'pin' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={styles.backBtnRow}
              onPress={() => setActiveSubView('hub')}
            >
              <Text style={styles.backBtnText}>← Back to More</Text>
            </TouchableOpacity>

            <Text style={styles.subViewHeading}>Change 4-Digit Security PIN</Text>

            {pinNotice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{pinNotice}</Text>
              </View>
            ) : null}

            {pinError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{pinError}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current 4-Digit PIN</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={currentPinInput}
                  onChangeText={setCurrentPinInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>New 4-Digit PIN</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={newPinInput}
                  onChangeText={setNewPinInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Confirm New PIN</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={confirmNewPinInput}
                  onChangeText={setConfirmNewPinInput}
                />
              </View>

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleChangePinSubmit}
                disabled={pinSaving}
              >
                <Text style={styles.saveProfileBtnText}>
                  {pinSaving ? 'Updating...' : 'Update Security PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= ITEMS SUB-VIEW ================= */}
        {activeSubView === 'items' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={styles.backBtnRow}
              onPress={() => setActiveSubView('hub')}
            >
              <Text style={styles.backBtnText}>← Back to More</Text>
            </TouchableOpacity>

            {/* Items Summary & Add Header */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.summaryLabel}>Active Catalog</Text>
                  <Text style={styles.summaryValue}>{safeItems.length} Items</Text>
                </View>

                <TouchableOpacity
                  style={styles.addItemHeroBtn}
                  onPress={handleOpenAddItem}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.addItemHeroBtnText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items by name..."
                value={itemsSearch}
                onChangeText={setItemsSearch}
              />
            </View>

            {/* Items List */}
            {filteredItems.map((it) => (
              <View key={it.id} style={styles.productCard}>
                <View style={styles.productIconBox}>
                  <Package size={20} color={colors.primary} />
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{it.name}</Text>
                  <View style={styles.rateBadge}>
                    <Text style={styles.rateBadgeText}>
                      ₹{it.price} / {it.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtnEdit}
                    onPress={() => handleOpenEditItem(it)}
                  >
                    <Edit2 size={16} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteItem(it)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filteredItems.length === 0 && (
              <View style={styles.emptyContainer}>
                <Package size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Items Found</Text>
                <Text style={styles.emptySub}>
                  Tap "Add Item" above to add items to your catalog.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= STAFF SUB-VIEW ================= */}
        {activeSubView === 'staff' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={styles.backBtnRow}
              onPress={() => setActiveSubView('hub')}
            >
              <Text style={styles.backBtnText}>← Back to More</Text>
            </TouchableOpacity>

            <Text style={styles.subViewHeading}>Staff & Cashier Management</Text>

            {/* Invite Form (Owner only) */}
            {isOwner ? (
              <View style={styles.sectionCard}>
                <Text style={styles.formTitle}>Invite Cashier</Text>
                <Text style={styles.formSub}>
                  Enter customer's Short ID or Phone number to add them as a cashier.
                </Text>

                <View style={styles.inviteInputRow}>
                  <TextInput
                    style={styles.inviteInput}
                    placeholder="Customer Short ID or Phone"
                    value={staffIdentifier}
                    onChangeText={setStaffIdentifier}
                  />
                  <TouchableOpacity
                    style={styles.inviteBtn}
                    onPress={handleInviteStaff}
                    disabled={invitingStaff}
                  >
                    <Text style={styles.inviteBtnText}>
                      {invitingStaff ? '...' : 'Invite'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {staffNotice ? (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>{staffNotice}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.viewOnlyCard}>
                <Lock size={18} color="#2563eb" />
                <Text style={styles.viewOnlyText}>
                  You are logged in as Cashier. Only the shop owner can invite or remove staff.
                </Text>
              </View>
            )}

            {/* Staff List */}
            <Text style={styles.sectionHeading}>Current Staff ({safeStaff.length})</Text>
            {safeStaff.map((st) => (
              <View key={st.id} style={styles.staffCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{st.userName}</Text>
                  <Text style={styles.staffMeta}>
                    ID: {st.userShortId} • {st.userPhone}
                  </Text>
                  <View
                    style={[
                      styles.staffBadge,
                      st.status === 'ACCEPTED'
                        ? styles.staffBadgeActive
                        : styles.staffBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.staffBadgeText,
                        st.status === 'ACCEPTED'
                          ? styles.staffBadgeTextActive
                          : styles.staffBadgeTextPending,
                      ]}
                    >
                      {st.status === 'ACCEPTED' ? 'Active Cashier' : 'Invite Pending'}
                    </Text>
                  </View>
                </View>

                {isOwner && (
                  <TouchableOpacity
                    style={styles.removeStaffBtn}
                    onPress={() => handleRemoveStaff(st.id)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {safeStaff.length === 0 && (
              <View style={styles.emptyContainer}>
                <Users size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Staff Members</Text>
                <Text style={styles.emptySub}>
                  Invite cashiers using the form above to help manage your POS billing.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= PROFILE SUB-VIEW ================= */}
        {activeSubView === 'profile' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={styles.backBtnRow}
              onPress={() => setActiveSubView('hub')}
            >
              <Text style={styles.backBtnText}>← Back to More</Text>
            </TouchableOpacity>

            <Text style={styles.subViewHeading}>Edit Shop Details & Information</Text>

            {!isOwner && (
              <View style={styles.viewOnlyCard}>
                <Lock size={18} color="#2563eb" />
                <Text style={styles.viewOnlyText}>
                  View-Only Mode: You are logged in as Cashier. Only the shop owner can modify store details.
                </Text>
              </View>
            )}

            {profileNotice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{profileNotice}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Shop Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={shopForm.shopName}
                  onChangeText={(t) => setShopForm({ ...shopForm, shopName: t })}
                  editable={isOwner}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={shopForm.shopPhone}
                  onChangeText={(t) => setShopForm({ ...shopForm, shopPhone: t })}
                  editable={isOwner}
                  keyboardType="phone-pad"
                />
              </View>

              <CitySelector
                selectedCity={shopForm.city}
                onSelectCity={(selected) => setShopForm({ ...shopForm, city: selected })}
                disabled={!isOwner}
              />

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Shop Address</Text>
                <TextInput
                  style={styles.formInput}
                  value={shopForm.shopAddress}
                  onChangeText={(t) => setShopForm({ ...shopForm, shopAddress: t })}
                  editable={isOwner}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Operating Timings</Text>
                <TextInput
                  style={styles.formInput}
                  value={shopForm.timings}
                  onChangeText={(t) => setShopForm({ ...shopForm, timings: t })}
                  placeholder="e.g. 08:00 AM - 10:00 PM"
                  editable={isOwner}
                />
              </View>

              {isOwner && (
                <TouchableOpacity
                  style={styles.saveProfileBtn}
                  onPress={handleSaveShopProfile}
                  disabled={shopSaving}
                >
                  <Text style={styles.saveProfileBtnText}>
                    {shopSaving ? 'Saving...' : 'Save Shop Changes'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Item Modal */}
      <EditProductModal
        visible={showItemModal}
        product={selectedProduct}
        onClose={() => setShowItemModal(false)}
        onSave={handleSaveItem}
      />

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <LegalModal
          title="Privacy Policy"
          visible={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          content={`GI SHOP MERCHANT PRIVACY POLICY\n\n1. Store Data Security: Your product catalog, cashier details, and customer credit ledger records are protected with AES-256 encryption.\n\n2. Customer Information: Customer phone numbers and addresses provided for delivery are restricted to order fulfillment purposes.\n\n3. Data Retention: Merchant transaction logs are securely synchronized to prevent data loss.\n\n4. Your Control: You can update shop details or request full merchant account deletion at any time.`}
        />
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <LegalModal
          title="Terms & Conditions"
          visible={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          content={`GI SHOP MERCHANT TERMS & CONDITIONS\n\n1. Merchant Account Use: As a shop owner or authorized cashier, you are responsible for maintaining accurate product rates and catalog listings.\n\n2. Order Fulfillment: Orders accepted through POS or online discovery must be fulfilled in accordance with displayed prices.\n\n3. Credit Ledger Accuracy: Khata credit entries entered by your store represent binding billing records between you and your customers.\n\n4. Service Availability: Platform tools are provided to streamline local retail commerce.`}
        />
      )}
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
  shopStatusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  shopStatusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  storeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  shopMetaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  editPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
  },
  editPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statusSwitchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotOpen: {
    backgroundColor: colors.success,
  },
  statusDotClosed: {
    backgroundColor: colors.danger,
  },
  statusLabelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusToggleBtnOpen: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statusToggleBtnClosed: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusToggleBtnTextOpen: {
    color: colors.danger,
  },
  statusToggleBtnTextClosed: {
    color: colors.success,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadowStyle,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuItemSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemsCountBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemsCountText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  backBtnRow: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  subViewHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  addItemHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addItemHeroBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    gap: 8,
    ...shadowStyle,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadowStyle,
  },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  rateBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnEdit: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  formSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    fontSize: 13,
  },
  inviteBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  noticeText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  errorBoxText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  viewOnlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewOnlyText: {
    fontSize: 12,
    color: '#1e40af',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  staffMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  staffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  staffBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  staffBadgePending: {
    backgroundColor: '#fef3c7',
  },
  staffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staffBadgeTextActive: {
    color: '#15803d',
  },
  staffBadgeTextPending: {
    color: '#b45309',
  },
  removeStaffBtn: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  formInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    fontSize: 13,
    color: colors.text,
  },
  saveProfileBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveProfileBtnText: {
    color: '#ffffff',
    fontSize: 14,
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
});

function LegalModal({ title, visible, onClose, content }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={legalStyles.header}>
          <Text style={legalStyles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={legalStyles.closeBtn}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={legalStyles.bodyText}>{content}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const legalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 40,
  },
});
