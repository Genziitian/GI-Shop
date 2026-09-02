import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tag, Search, X, Store, Check, Plus, AlertTriangle, MapPin, ChevronDown, Lock, Settings, User } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getCities, compareItems, getShopDetails } from '../../api/client';
import Header from '../../components/Header';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';

export default function CustomerCompareScreen({ navigation }) {
  const { user, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Pune', 'Jaipur']);
  const [selectedCity, setSelectedCity] = useState(user?.city || 'Delhi');
  const [showCityModal, setShowCityModal] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const quickKeywords = ['Milk', 'Atta', 'Rice', 'Sugar', 'Oil', 'Tea', 'Dal', 'Kurkure'];

  const handleSearch = useCallback(async (q, city) => {
    setLoading(true);
    try {
      const data = await compareItems(city || selectedCity, q);
      const rows = Array.isArray(data) ? data : [];
      
      const groups = {};
      rows.forEach((item) => {
        const key = item.name ? item.name.trim() : 'Item';
        if (!groups[key]) {
          groups[key] = {
            productName: item.name,
            unit: item.unit || 'Piece',
            lowestPrice: item.price,
            shops: [],
          };
        }
        groups[key].shops.push(item);
        if (item.price < groups[key].lowestPrice) {
          groups[key].lowestPrice = item.price;
        }
      });
      
      setResults(Object.values(groups));
    } catch (e) {
      console.error('Failed to compare items:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    handleSearch('', selectedCity);
  }, [selectedCity, handleSearch]);

  const handleSelectShop = (shop) => {
    navigation.navigate('CustomerExplore', { openShopId: shop.shopId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Uniform Top Header with App Name, Icon, Profile & Lock Button */}
      <Header
        title="GI SHOP"
        subtitle="Compare Prices in Shops"
        rightComponent={
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
        }
      />

      {/* Compact City Dropdown Selector Bar */}
      <View style={styles.topSubBar}>
        <TouchableOpacity
          style={styles.compactCityBtn}
          onPress={() => setShowCityModal(true)}
          activeOpacity={0.7}
        >
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.compactCityLabel}>City:</Text>
          <Text style={styles.compactCityText}>{selectedCity}</Text>
          <ChevronDown size={13} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search item to compare (e.g. Milk, Rice, Atta)..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(txt) => {
            setQuery(txt);
            handleSearch(txt, selectedCity);
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); handleSearch('', selectedCity); }}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Search Chips */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {quickKeywords.map((kw) => (
            <TouchableOpacity
              key={kw}
              style={[styles.kwChip, query === kw && styles.kwChipActive]}
              onPress={() => {
                setQuery(kw);
                handleSearch(kw, selectedCity);
              }}
            >
              <Text style={[styles.kwChipText, query === kw && styles.kwChipTextActive]}>{kw}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Comparison Results */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Comparing prices across stores...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, idx) => `compare-grp-${item.productName}-${idx}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Tag size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching items found</Text>
              <Text style={styles.emptySub}>Try searching for popular items like Milk, Atta, Rice, Sugar.</Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={styles.groupName}>{group.productName}</Text>
                  <Text style={styles.groupUnit}>Sold per {group.unit}</Text>
                </View>
                {group.lowestPrice ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bestPriceLabel}>Best Available</Text>
                    <Text style={styles.bestPriceValue}>₹{group.lowestPrice.toFixed(2)}</Text>
                  </View>
                ) : null}
              </View>

              {/* Stores offering this product */}
              <View style={{ gap: 8, marginTop: 10 }}>
                {(group.shops || []).map((shop, sIdx) => {
                  const isLowest = shop.price === group.lowestPrice;

                  return (
                    <View key={`shop-offer-${shop.shopId}-${sIdx}`} style={[styles.storeRow, isLowest && styles.storeRowBest]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.storeName}>{shop.shopName}</Text>
                          <View style={styles.shortIdBadge}>
                            <Text style={styles.shortIdBadgeText}>ID: {shop.shortId || `shp${shop.shopId}`}</Text>
                          </View>
                          {isLowest && (
                            <View style={styles.bestBadge}>
                              <Text style={styles.bestBadgeText}>Best Rate</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.storeLoc}>{shop.shopAddress || 'Local Market'} {shop.isOpen ? '• 🟢 Open' : '• 🔴 Closed'}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.offerRate}>₹{shop.price.toFixed(2)}</Text>
                        <TouchableOpacity
                          style={[styles.shopOrderBtn, !shop.isOpen && { backgroundColor: '#cbd5e1' }]}
                          disabled={!shop.isOpen}
                          onPress={() => handleSelectShop(shop)}
                        >
                          <Text style={styles.shopOrderBtnText}>View Store →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* CITY SELECTION DROPDOWN MODAL */}
      <Modal visible={showCityModal} transparent animationType="fade" onRequestClose={() => setShowCityModal(false)}>
        <View style={styles.cityModalOverlay}>
          <View style={styles.cityModalCard}>
            <View style={styles.cityModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color={colors.primary} />
                <Text style={styles.cityModalTitle}>Select Comparison City</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cityModalSub}>Compare grocery rates across kirana stores in your chosen city</Text>
            
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {cities.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityModalItem, isSelected && styles.cityModalItemActive]}
                    onPress={() => {
                      setSelectedCity(city);
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
  headerRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  topSubBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
  kwChip: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kwChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: colors.primary,
  },
  kwChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  kwChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  groupUnit: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  bestPriceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  bestPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  storeRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  storeRowBest: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  storeName: {
    fontSize: 13,
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
  bestBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  storeLoc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  offerRate: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  shopOrderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  shopOrderBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
    textAlign: 'center',
  },
});
