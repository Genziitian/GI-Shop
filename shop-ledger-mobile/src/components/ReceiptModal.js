import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Receipt, CheckCircle, X, Printer, MessageSquare } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, shadowLarge } from '../theme/colors';

export default function ReceiptModal({ visible, receipt, onClose, onNewBill }) {
  const [sharingPdf, setSharingPdf] = useState(false);

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

  const handleSharePDF = async () => {
    if (sharingPdf) return;
    setSharingPdf(true);

    try {
      const rawPhone = (receipt.customerPhone || receipt.phone || '').toString().trim();
      const shopName = receipt.shopName || 'GI SHOP';
      const shopAddress = receipt.shopAddress || '';
      const totalAmt = (Number(receipt.total ?? receipt.estimatedTotal) || 0).toFixed(2);
      const subtotalAmt = (Number(receipt.subtotal || receipt.total || receipt.estimatedTotal) || 0).toFixed(2);
      const discountAmt = (Number(receipt.discount) || 0).toFixed(2);
      const billId = receipt.orderNumber || receipt.id || 'N/A';
      const paymentMethod = receipt.paymentMethod || 'Paid';

      const rowsHtml = items.map((entry, idx) => {
        const itemName = entry.item?.name || entry.name || 'Item';
        const unit = entry.item?.unit || entry.unit || '';
        const rate = (Number(entry.rate || entry.price || entry.item?.price) || 0).toFixed(2);
        const qty = entry.qty || 1;
        const amount = (Number(entry.amount || (qty * rate)) || 0).toFixed(2);
        return `
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 12px;">${idx + 1}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${itemName}</div>
              <div style="font-size: 11px; color: #64748b;">&#8377;${rate} / ${unit}</div>
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 600; color: #334155; font-size: 13px;">${qty} ${unit}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px;">&#8377;${amount}</td>
          </tr>
        `;
      }).join('');

      const discountHtml = Number(discountAmt) > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #16a34a;">
          <span>Discount</span>
          <span style="font-weight: 700;">-&#8377;${discountAmt}</span>
        </div>
      ` : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice #${billId}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 16px;
            }
            .invoice-box {
              max-width: 680px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px 28px;
              box-shadow: 0 4px 14px rgba(0,0,0,0.04);
            }
            .header-center {
              text-align: center;
              padding-bottom: 18px;
              border-bottom: 2px dashed #e2e8f0;
            }
            .store-name {
              font-size: 24px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 4px 0;
              letter-spacing: -0.5px;
            }
            .store-address {
              font-size: 12px;
              color: #64748b;
              margin: 0 0 10px 0;
            }
            .status-pill {
              display: inline-block;
              background: #dcfce7;
              color: #15803d;
              font-size: 11px;
              font-weight: 800;
              padding: 4px 14px;
              border-radius: 9999px;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: flex;
              flex-wrap: wrap;
              background: #f8fafc;
              border-radius: 12px;
              padding: 12px 16px;
              margin: 18px 0;
              border: 1px solid #edf2f7;
            }
            .meta-item {
              flex: 1 1 50%;
              padding: 4px 0;
              font-size: 12px;
            }
            .meta-label {
              color: #64748b;
              font-weight: 500;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 14px 0;
            }
            th {
              text-align: left;
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
              padding: 10px 8px;
              border-bottom: 2px solid #e2e8f0;
              letter-spacing: 0.5px;
            }
            .summary-box {
              margin-top: 14px;
              border-top: 2px dashed #e2e8f0;
              padding-top: 14px;
              max-width: 280px;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 13px;
              color: #475569;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0 0 0;
              margin-top: 8px;
              border-top: 2px solid #0f172a;
              font-size: 18px;
              font-weight: 900;
              color: #16a34a;
            }
            .footer-note {
              text-align: center;
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #f1f5f9;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header-center">
              <div class="store-name">${shopName}</div>
              ${shopAddress ? `<div class="store-address">${shopAddress}</div>` : ''}
              <div class="status-pill">&#10003; BILL COMPLETED</div>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Bill / Invoice No: </span>
                <span class="meta-val">#${billId}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date & Time: </span>
                <span class="meta-val">${formattedDate}</span>
              </div>
              ${rawPhone ? `
                <div class="meta-item">
                  <span class="meta-label">Customer Mobile: </span>
                  <span class="meta-val">${rawPhone}</span>
                </div>
              ` : ''}
              <div class="meta-item">
                <span class="meta-label">Payment Mode: </span>
                <span class="meta-val">${paymentMethod}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 32px; text-align: center;">#</th>
                  <th>Item Details</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal</span>
                <span style="font-weight: 700; color: #0f172a;">&#8377;${subtotalAmt}</span>
              </div>
              ${discountHtml}
              <div class="total-row">
                <span>Total Amount</span>
                <span>&#8377;${totalAmt}</span>
              </div>
            </div>

            <div class="footer-note">
              Thank you for your business! &#8226; Powered by GI SHOP
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Share Bill #${billId} PDF`,
        });
      } else {
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
        const targetPhone = cleanPhone ? `91${cleanPhone}` : '';
        const itemLines = items.map(it => {
          const name = it.item?.name || it.name || 'Item';
          const qty = it.qty || 1;
          const rate = it.rate || it.price || it.item?.price || 0;
          const amt = (Number(it.amount || (qty * rate)) || 0).toFixed(2);
          return `• ${name} x${qty} - ₹${amt}`;
        }).join('\n');
        const message = `Thank you for shopping with ${shopName}.\nHere is your bill summary:\n\n📄 *Bill #${billId}*\nDate: ${formattedDate}\n\n*ITEMS:*\n${itemLines}\n\n*Total Amount:* ₹${totalAmt} (${paymentMethod})\n\nGenerated via GI SHOP`;
        const encodedMsg = encodeURIComponent(message);
        const whatsappUrl = targetPhone 
          ? `https://wa.me/${targetPhone}?text=${encodedMsg}` 
          : `https://api.whatsapp.com/send?text=${encodedMsg}`;
        Linking.openURL(whatsappUrl).catch(() => {
          Alert.alert('Error', 'Unable to open sharing or WhatsApp on this device.');
        });
      }
    } catch (error) {
      console.error('[ReceiptModal] PDF generation/sharing error:', error);
      Alert.alert('Sharing Error', error.message || 'Failed to generate receipt PDF.');
    } finally {
      setSharingPdf(false);
    }
  };

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
                  <View style={[styles.statusBadge, receipt.isOffline && styles.statusBadgeOffline]}>
                    <CheckCircle size={14} color={receipt.isOffline ? '#d97706' : colors.success} />
                    <Text style={[styles.statusText, receipt.isOffline && styles.statusTextOffline]}>
                      {receipt.isOffline ? 'OFFLINE BILL • SAVED LOCALLY' : 'BILL COMPLETED'}
                    </Text>
                  </View>
                </View>

                {/* Metadata Row */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Ref / Bill No:</Text>
                    <Text style={styles.metaValue}>#{receipt.orderNumber || receipt.id || 'N/A'}</Text>
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
                        {receipt.paymentMethod || 'App Order'}
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
                    const itemName = entry.item?.name || entry.name || 'Item';
                    const unit = entry.item?.unit || entry.unit || '';
                    const rate = entry.rate || entry.price || entry.item?.price || 0;
                    const qty = entry.qty || 1;
                    const amount = entry.amount || (qty * rate);

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
                    <Text style={styles.summaryValue}>₹{(Number(receipt.subtotal || receipt.total || receipt.estimatedTotal) || 0).toFixed(2)}</Text>
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
                    <Text style={styles.totalValue}>₹{(Number(receipt.total ?? receipt.estimatedTotal) || 0).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#25D366',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      borderRadius: 12,
                      width: '100%',
                    }}
                    onPress={handleSharePDF}
                    activeOpacity={0.85}
                    disabled={sharingPdf}
                  >
                    {sharingPdf ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <MessageSquare size={18} color="#ffffff" />
                    )}
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                      {sharingPdf
                        ? 'Preparing Bill PDF...'
                        : `Share Bill on WhatsApp ${receipt.customerPhone ? `(${receipt.customerPhone})` : ''}`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => {
                      if (onNewBill) onNewBill();
                      onClose();
                    }}
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
  statusBadgeOffline: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
  },
  statusTextOffline: {
    color: '#b45309',
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
