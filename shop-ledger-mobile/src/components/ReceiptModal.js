import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Receipt, CheckCircle, X, Printer } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';

export default function ReceiptModal({ visible, receipt, onClose, onNewBill }) {
  if (!receipt) return null;

  const items = Array.isArray(receipt.items)
    ? receipt.items
    : typeof receipt.itemsJSON === 'string'
    ? JSON.parse(receipt.itemsJSON || '[]')
    : [];

  const formattedDate = receipt.date
    ? new Date(receipt.date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Store & Receipt Title Header */}
                <View style={styles.header}>
                  <View style={styles.iconCircle}>
                    <Receipt size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.storeName}>
                    {receipt.shopName || 'Store Receipt'}
                  </Text>
                  {receipt.shopAddress && (
                    <Text style={styles.storeAddress}>{receipt.shopAddress}</Text>
                  )}
                  <View style={styles.statusBadge}>
                    <CheckCircle size={14} color={colors.success} />
                    <Text style={styles.statusText}>BILL COMPLETED</Text>
                  </View>
                </View>

                {/* Metadata Row */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Bill No:</Text>
                    <Text style={styles.metaValue}>#{receipt.id || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date & Time:</Text>
                    <Text style={styles.metaValue}>{formattedDate}</Text>
                  </View>
                  {receipt.customerPhone ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Customer Phone:</Text>
                      <Text style={styles.metaValue}>{receipt.customerPhone}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Payment Mode:</Text>
                    <View
                      style={[
                        styles.paymentTag,
                        receipt.paymentMethod === 'Add to Book'
                          ? styles.paymentTagBook
                          : styles.paymentTagPaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentTagText,
                          receipt.paymentMethod === 'Add to Book'
                            ? styles.paymentTagTextBook
                            : styles.paymentTagTextPaid,
                        ]}
                      >
                        {receipt.paymentMethod}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.itemsSection}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.colHeader, { flex: 2 }]}>ITEM</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>AMOUNT</Text>
                  </View>

                  <View style={styles.dividerDashed} />

                  {items.map((entry, index) => {
                    const itemName = entry.item?.name || 'Item';
                    const unit = entry.item?.unit || '';
                    const rate = entry.rate || entry.item?.price || 0;
                    const qty = entry.qty || 1;
                    const amount = entry.amount || qty * rate;

                    return (
                      <View key={index} style={styles.itemRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.itemName}>{itemName}</Text>
                          <Text style={styles.itemRate}>
                            @{rate}/{unit}
                          </Text>
                        </View>
                        <Text style={[styles.itemQty, { flex: 1, textAlign: 'center' }]}>
                          {qty} {unit}
                        </Text>
                        <Text style={[styles.itemAmt, { flex: 1, textAlign: 'right' }]}>
                          ₹{(Number(amount) || 0).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Calculations */}
                <View style={styles.dividerDashed} />

                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₹{(Number(receipt.subtotal) || 0).toFixed(2)}</Text>
                  </View>

                  {receipt.discount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.success }]}>
                        Discount
                      </Text>
                      <Text style={[styles.summaryValue, { color: colors.success }]}>
                        -₹{(Number(receipt.discount) || 0).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                    <Text style={styles.totalValue}>₹{(Number(receipt.total) || 0).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.newBillBtn}
                    onPress={() => {
                      if (onNewBill) onNewBill();
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.newBillBtnText}>Done / New Bill</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    ...shadowLarge,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  storeAddress: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  metaBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  paymentTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentTagPaid: {
    backgroundColor: colors.successLight,
  },
  paymentTagBook: {
    backgroundColor: colors.warningLight,
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentTagTextPaid: {
    color: colors.success,
  },
  paymentTagTextBook: {
    color: colors.warning,
  },
  itemsSection: {
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderColor: colors.borderDark,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemRate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemQty: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  summarySection: {
    gap: 6,
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  actionButtons: {
    gap: 8,
    marginTop: 16,
  },
  newBillBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBillBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
