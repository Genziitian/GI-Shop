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
  Alert,
} from 'react-native';
import { X, Check, DollarSign } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';

export default function SettleDueModal({ visible, customer, onClose, onSettleSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer && customer.totalDue) {
      setAmount(customer.totalDue.toString());
      setMethod('Cash');
    }
  }, [customer, visible]);

  if (!customer) return null;

  const handleSettle = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid repayment amount.');
      return;
    }

    setSubmitting(true);
    try {
      await onSettleSuccess({
        customerPhone: customer.phone || customer.customerPhone,
        amount: num,
        method,
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  const due = customer.totalDue || 0;

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
                <View>
                  <Text style={styles.title}>Settle Khata Due</Text>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerPhone}>
                    {customer.phone || customer.customerPhone}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Outstanding Card */}
              <View style={styles.dueCard}>
                <Text style={styles.dueLabel}>Current Outstanding</Text>
                <Text style={styles.dueValue}>₹{(Number(due) || 0).toFixed(2)}</Text>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={[styles.presetBtn, amount === due.toString() && styles.presetBtnActive]}
                  onPress={() => setAmount(due.toString())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      amount === due.toString() && styles.presetBtnTextActive,
                    ]}
                  >
                    Full (₹{(Number(due) || 0).toFixed(0)})
                  </Text>
                </TouchableOpacity>

                {due > 100 && (
                  <TouchableOpacity
                    style={[styles.presetBtn, amount === '100' && styles.presetBtnActive]}
                    onPress={() => setAmount('100')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        amount === '100' && styles.presetBtnTextActive,
                      ]}
                    >
                      ₹100
                    </Text>
                  </TouchableOpacity>
                )}

                {due > 500 && (
                  <TouchableOpacity
                    style={[styles.presetBtn, amount === '500' && styles.presetBtnActive]}
                    onPress={() => setAmount('500')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        amount === '500' && styles.presetBtnTextActive,
                      ]}
                    >
                      ₹500
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repayment Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  selectTextOnFocus
                />
              </View>

              {/* Method Switcher */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodsRow}>
                  {['Cash', 'Online'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                      onPress={() => setMethod(m)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.methodBtnText, method === m && styles.methodBtnTextActive]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSettle}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Recording...' : 'Record Payment'}
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.badgeBg,
  },
  dueCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  dueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
    textTransform: 'uppercase',
  },
  dueValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.danger,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  presetBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
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
    fontWeight: '700',
    backgroundColor: colors.background,
    color: colors.text,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodBtnTextActive: {
    color: '#ffffff',
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
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
