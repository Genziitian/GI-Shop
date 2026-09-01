import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, Package, Check, Sparkles, Plus } from 'lucide-react-native';
import { colors, shadowLarge, shadowStyle } from '../theme/colors';
import { MASTER_GROCERY_CATALOG } from '../data/masterGroceryCatalog';

const UNITS = ['Piece', 'Kilo', 'Litre'];

const POPULAR_QUICK_PICKS = [
  { name: 'Amul Taaza Toned Milk (1 Litre)', price: 54, unit: 'Piece', label: '🥛 Milk 1L' },
  { name: 'Aashirvaad Shudh Chakki Atta (5kg)', price: 240, unit: 'Piece', label: '🌾 Atta 5kg' },
  { name: 'Toor Dal / Arhar Dal (Premium)', price: 160, unit: 'Kilo', label: '🫘 Toor Dal' },
  { name: 'Basmati Rice (Daawat Rozana)', price: 85, unit: 'Kilo', label: '🍚 Basmati Rice' },
  { name: 'Fortune Mustard Oil (1 Litre)', price: 155, unit: 'Piece', label: '🛢️ Mustard Oil' },
  { name: 'Premium Refined Sugar (Loose)', price: 44, unit: 'Kilo', label: '🍬 Sugar' },
  { name: 'Tata Tea Gold (250g)', price: 140, unit: 'Piece', label: '☕ Tata Tea' },
  { name: 'Maggi 2-Minute Noodles (Pack of 4)', price: 56, unit: 'Piece', label: '🍜 Maggi' },
  { name: 'Tata Salt Vacuum Evaporated (1kg)', price: 28, unit: 'Piece', label: '🧂 Tata Salt' },
  { name: 'Farm Fresh Eggs (Pack of 6)', price: 42, unit: 'Piece', label: '🥚 Eggs' },
];

export default function EditProductModal({ visible, product, onClose, onSave }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEditing = !!product?.id;

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice(product.price ? product.price.toString() : '');
      setUnit(product.unit || 'Piece');
    } else {
      setName('');
      setPrice('');
      setUnit('Piece');
    }
    setShowSuggestions(false);
  }, [product, visible]);

  const suggestions = name.trim().length > 1
    ? MASTER_GROCERY_CATALOG.filter((item) =>
        item.name.toLowerCase().includes(name.trim().toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSelectSuggestion = (item) => {
    setName(item.name);
    setPrice(item.price.toString());
    setUnit(item.unit || 'Piece');
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter item name.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Required', 'Please enter a valid selling price.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        id: product?.id,
        name: name.trim(),
        price: numPrice,
        unit,
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Package size={22} color={colors.primary} />
                  <Text style={styles.title}>{isEditing ? 'Edit Item' : 'Add New Item'}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 440 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Item Name with Auto-Complete */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Item Name *</Text>
                    {!isEditing && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={12} color={colors.primary} />
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                          Auto-Suggest Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Type e.g. Milk, Rice, Toor Dal, Maggi..."
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />

                  {/* Auto-Suggestion Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <View style={styles.suggestionsHeader}>
                        <Sparkles size={12} color={colors.primary} />
                        <Text style={styles.suggestionsHeaderText}>
                          Tap to auto-fill rate & unit:
                        </Text>
                      </View>
                      {suggestions.map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestionName}>{item.name}</Text>
                            <Text style={styles.suggestionCategory}>{item.category}</Text>
                          </View>
                          <View style={styles.suggestionBadge}>
                            <Text style={styles.suggestionPrice}>
                              ₹{item.price}/{item.unit}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Quick Pick Chips (when adding new item) */}
                {!isEditing && !name && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.quickPickHeader}>⚡ Quick Pick Popular Items</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {POPULAR_QUICK_PICKS.map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.quickPickChip}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickPickChipText}>{item.label}</Text>
                          <Text style={styles.quickPickChipPrice}>₹{item.price}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selling Price */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>

                {/* Unit Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selling Unit</Text>
                  <View style={styles.unitRow}>
                    {UNITS.map((u) => {
                      const active = unit === u;
                      return (
                        <TouchableOpacity
                          key={u}
                          style={[styles.unitBtn, active && styles.unitBtnActive]}
                          onPress={() => setUnit(u)}
                          activeOpacity={0.7}
                        >
                          {active && <Check size={14} color={colors.primary} style={{ marginRight: 4 }} />}
                          <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>
                    {submitting ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    ...shadowLarge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    fontSize: 14,
    color: colors.text,
  },
  suggestionsContainer: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: 'hidden',
    ...shadowStyle,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionCategory: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  suggestionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  suggestionPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  quickPickHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  quickPickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  quickPickChipPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  unitBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStyle,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
