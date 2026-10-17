import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { X } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import { showErrorAlert, validatePrice } from '../utils/errorHandler';

export default function SettleDueModal({ visible, customer, onClose, onSettleSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer && customer.totalDue !== undefined) {
      setAmount(customer.totalDue.toString());
      setMethod('Cash');
      setNote('');
    }
  }, [customer, visible]);

  if (!customer) return null;

  const handleSettle = async () => {
    const check = validatePrice(amount, 'Repayment amount');
    if (!check.valid) {
      showErrorAlert(check.error, 'Invalid Amount');
      return;
    }

    const num = check.value;
    const due = Number(customer.totalDue) || 0;
    if (due > 0 && num > due) {
      showErrorAlert(
        `Repayment amount (₹${num.toFixed(2)}) cannot exceed the customer's total outstanding due of ₹${due.toFixed(2)}.`,
        'Amount Exceeds Due'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSettleSuccess({
        customerPhone: customer.phone || customer.customerPhone,
        amount: num,
        method,
        note: note.trim(),
      });
      onClose();
    } catch (e) {
      showErrorAlert(e, 'Settlement Error', 'Failed to record repayment.');
    } finally {
      setSubmitting(false);
    }
  };

  const due = Number(customer.totalDue) || 0;
  const isFull = parseFloat(amount) === due;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheet}
            >
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Record Payment</Text>
                  <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.amountBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#d0d5dd"
                  value={amount}
                  onChangeText={setAmount}
                  selectTextOnFocus
                />
              </View>
              <View style={styles.dueRow}>
                <Text style={styles.dueText}>Outstanding ₹{due.toFixed(2)}</Text>
                {!isFull && (
                  <TouchableOpacity onPress={() => setAmount(due.toString())} activeOpacity={0.7}>
                    <Text style={styles.fullLink}>Pay full</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Method */}
              <View style={styles.segment}>
                {['Cash', 'Online'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.segmentBtn, method === m && styles.segmentBtnActive]}
                    onPress={() => setMethod(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, method === m && styles.segmentTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 50))}
                maxLength={50}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSettle}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Recording...' : `Record ₹${(parseFloat(amount) || 0).toFixed(2)}`}
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
  sheet: {
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  customerName: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 8, borderRadius: 18, backgroundColor: colors.badgeBg },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  rupee: { fontSize: 34, fontWeight: '700', color: colors.textMuted, marginRight: 4 },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  dueText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  fullLink: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.badgeBg,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontWeight: '800' },
  noteInput: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontSize: 14,
    color: colors.text,
    marginBottom: 18,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
});
