import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { X, Sparkles } from 'lucide-react-native';
import { colors, shadowLarge, shadowStyle } from '../theme/colors';
import { MASTER_GROCERY_CATALOG } from '../data/masterGroceryCatalog';
import { showErrorAlert, validatePrice } from '../utils/errorHandler';

const UNITS = ['Piece', 'Kilo', 'Litre'];

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
      showErrorAlert('Please enter a product or item name.', 'Item Name Required');
      return;
    }
    const priceCheck = validatePrice(price, 'Selling price');
    if (!priceCheck.valid) {
      showErrorAlert(priceCheck.error, 'Invalid Price');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        id: product?.id,
        name: name.trim(),
        price: priceCheck.value,
        unit,
      });
      onClose();
    } catch (e) {
      showErrorAlert(e, 'Inventory Error', 'Failed to save product details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.title}>{isEditing ? 'Edit Item' : 'New Item'}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={18} color={colors.textMuted} />
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



                {/* Selling Price */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selling Price *</Text>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceSymbol}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>
                </View>

                {/* Unit Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sold per</Text>
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
                          <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {submitting ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    ...shadowLarge,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d0d5dd',
    marginBottom: 14,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
  },
  priceSymbol: { fontSize: 18, fontWeight: '700', color: colors.textMuted, marginRight: 6 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, padding: 0 },
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
    padding: 8,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
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
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
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

  unitRow: {
    flexDirection: 'row',
    backgroundColor: colors.badgeBg,
    borderRadius: 10,
    padding: 3,
  },
  unitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
    height: 52,
    borderRadius: 12,
    marginTop: 8,
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
