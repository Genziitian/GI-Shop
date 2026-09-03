import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, Minus, Check } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import QuickButton from './QuickButton';

export default function ProductUnitModal({ visible, product, onClose, onAddToCart, onConfirm }) {
  const [qtyInput, setQtyInput] = useState(1);
  const [displayQty, setDisplayQty] = useState('1');
  const [subUnitMode, setSubUnitMode] = useState('Kilo'); // Kilo, Gram, Litre, ML
  const [priceInput, setPriceInput] = useState('');

  const isPiece = product?.unit === 'Piece';
  const isKilo = product?.unit === 'Kilo';
  const isLitre = product?.unit === 'Litre';

  useEffect(() => {
    if (product) {
      const defaultMode = product.unit === 'Litre' ? 'Litre' : (product.unit === 'Kilo' ? 'Kilo' : 'Piece');
      setSubUnitMode(defaultMode);
      setQtyInput(1);
      setDisplayQty('1');
      setPriceInput(product.price ? product.price.toString() : '0');
    }
  }, [product, visible]);

  if (!product) return null;

  const handleDisplayQtyChange = (val) => {
    setDisplayQty(val);
    const num = parseFloat(val) || 0;
    let baseQty = num;
    if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
      baseQty = num / 1000;
    }
    setQtyInput(baseQty);
    if (product.price) {
      setPriceInput((baseQty * product.price).toFixed(2));
    }
  };

  const handlePriceChange = (val) => {
    setPriceInput(val);
    const numericPrice = parseFloat(val) || 0;
    if (product.price && product.price > 0) {
      const baseQty = parseFloat((numericPrice / product.price).toFixed(3));
      setQtyInput(baseQty);
      if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
        setDisplayQty((baseQty * 1000).toFixed(0));
      } else {
        setDisplayQty(baseQty.toString());
      }
    }
  };

  const handleToggleSubUnitMode = (mode) => {
    setSubUnitMode(mode);
    if (mode === 'Gram' || mode === 'ML') {
      setDisplayQty((qtyInput * 1000).toFixed(0));
    } else {
      setDisplayQty(qtyInput.toString());
    }
  };

  const handleSetPresetQty = (baseKgOrLitre) => {
    setQtyInput(baseKgOrLitre);
    if (subUnitMode === 'Gram' || subUnitMode === 'ML') {
      setDisplayQty((baseKgOrLitre * 1000).toFixed(0));
    } else {
      setDisplayQty(baseKgOrLitre.toString());
    }
    if (product.price) {
      setPriceInput((baseKgOrLitre * product.price).toFixed(2));
    }
  };

  const handleQtyChange = (val) => {
    const numericVal = typeof val === 'number' ? val : parseFloat(val) || 0;
    setQtyInput(numericVal);
    setDisplayQty(numericVal.toString());
    if (product.price) {
      const calcPrice = (numericVal * product.price).toFixed(2);
      setPriceInput(calcPrice);
    }
  };

  const handleAdd = () => {
    if (qtyInput <= 0) return;
    const amount = parseFloat(priceInput) || qtyInput * product.price;
    const callback = onAddToCart || onConfirm;
    if (typeof callback === 'function') {
      callback({
        item: product,
        qty: qtyInput,
        rate: product.price,
        amount: amount,
      });
    }
    onClose();
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
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productRate}>
                    Rate: ₹{product.price} / {product.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Stepper for Piece */}
              {isPiece && (
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleQtyChange(Math.max(1, qtyInput - 1))}
                    activeOpacity={0.7}
                  >
                    <Minus size={24} color={colors.primary} />
                  </TouchableOpacity>

                  <View style={styles.stepperValueContainer}>
                    <Text style={styles.stepperValue}>{qtyInput}</Text>
                    <Text style={styles.stepperUnit}>Pieces</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleQtyChange(qtyInput + 1)}
                    activeOpacity={0.7}
                  >
                    <Plus size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Quick Presets for Kilo / Litre */}
              {(isKilo || isLitre) && (
                <View style={styles.presetsSection}>
                  <Text style={styles.sectionLabel}>Quick Presets</Text>
                  <View style={styles.presetsRow}>
                    <QuickButton
                      label={isKilo ? '50g' : '200ml'}
                      active={qtyInput === (isKilo ? 0.05 : 0.2)}
                      onPress={() => handleSetPresetQty(isKilo ? 0.05 : 0.2)}
                    />
                    <QuickButton
                      label={isKilo ? '250g' : '250ml'}
                      active={qtyInput === 0.25}
                      onPress={() => handleSetPresetQty(0.25)}
                    />
                    <QuickButton
                      label={isKilo ? '500g' : '500ml'}
                      active={qtyInput === 0.5}
                      onPress={() => handleSetPresetQty(0.5)}
                    />
                    <QuickButton
                      label={isKilo ? '1 kg' : '1 L'}
                      active={qtyInput === 1}
                      onPress={() => handleSetPresetQty(1)}
                    />
                    <QuickButton
                      label={isKilo ? '2 kg' : '2 L'}
                      active={qtyInput === 2}
                      onPress={() => handleSetPresetQty(2)}
                    />
                  </View>

                  {/* Dual Bidirectional Calculation Inputs */}
                  <View style={styles.dualInputRow}>
                    <View style={styles.inputWrapper}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
                          Quantity
                        </Text>
                        <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 5, padding: 2 }}>
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: (subUnitMode === 'Kilo' || subUnitMode === 'Litre') ? colors.primary : 'transparent',
                            }}
                            onPress={() => handleToggleSubUnitMode(isLitre ? 'Litre' : 'Kilo')}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: (subUnitMode === 'Kilo' || subUnitMode === 'Litre') ? '#ffffff' : '#64748b',
                              }}
                            >
                              {isLitre ? 'Litre' : 'Kilo'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: (subUnitMode === 'Gram' || subUnitMode === 'ML') ? colors.primary : 'transparent',
                            }}
                            onPress={() => handleToggleSubUnitMode(isLitre ? 'ML' : 'Gram')}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: (subUnitMode === 'Gram' || subUnitMode === 'ML') ? '#ffffff' : '#64748b',
                              }}
                            >
                              {isLitre ? 'ML' : 'Gram'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={displayQty}
                        onChangeText={handleDisplayQtyChange}
                        selectTextOnFocus
                        placeholder={subUnitMode === 'Gram' ? '250' : (subUnitMode === 'ML' ? '500' : '1')}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, { marginBottom: 4, height: 20, textAlignVertical: 'center' }]}>Amount (₹)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={priceInput}
                        onChangeText={handlePriceChange}
                        selectTextOnFocus
                        placeholder="50"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Summary / Add Button */}
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
                <Check size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.addBtnText}>
                  Add ₹{(Number(priceInput) || 0).toFixed(2)} to Cart
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    ...shadowLarge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  productRate: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.badgeBg,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    gap: 20,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  stepperUnit: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  presetsSection: {
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: colors.background,
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
