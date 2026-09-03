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
import { X, CheckCircle2, Clock, PackageCheck, CreditCard, ShieldCheck, Check, AlertCircle, ShoppingBag } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';

export default function OrderDetailModal({ visible, order, onClose }) {
  if (!visible || !order) return null;

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.itemsJSON === 'string'
    ? JSON.parse(order.itemsJSON || '[]')
    : [];

  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : typeof order.timelineJSON === 'string'
    ? JSON.parse(order.timelineJSON || '[]')
    : [];

  // Fallback timeline if timelineJSON is not populated yet
  const displayTimeline = timeline.length > 0 ? timeline : [
    {
      title: 'Order Created',
      timestamp: order.createdAt || new Date().toISOString(),
      description: 'Customer placed the order',
      status: 'CREATED'
    },
    {
      title: 'Order Received by Shop',
      timestamp: order.createdAt || new Date().toISOString(),
      description: 'Order received by shopkeeper',
      status: 'RECEIVED'
    },
    ...(order.acceptedAt ? [{
      title: 'Order Accepted & Preparing',
      timestamp: order.acceptedAt,
      description: `Estimated preparation time: ${order.packingMinutes || 15} mins`,
      status: 'ACCEPTED'
    }] : []),
    ...(order.status === 'READY' || order.status === 'COMPLETED' ? [{
      title: 'Order Ready for Pickup',
      timestamp: order.acceptedAt || order.createdAt,
      description: 'Order packed and ready for pickup',
      status: 'READY'
    }] : []),
    ...(order.paymentRequested ? [{
      title: 'Payment Requested',
      timestamp: order.acceptedAt || order.createdAt,
      description: `Requested ₹${(order.requestedAmount || order.estimatedTotal || 0).toFixed(2)} (${order.paymentMethod || 'Cash'})`,
      status: 'PAYMENT_REQUESTED'
    }] : []),
    ...(order.status === 'COMPLETED' ? [{
      title: 'Customer Verified (OTP)',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Customer 4-digit OTP successfully verified',
      status: 'VERIFIED'
    }, {
      title: 'Order Delivered & Completed',
      timestamp: order.collectedAt || new Date().toISOString(),
      description: 'Order handed over and sale recorded',
      status: 'COMPLETED'
    }] : [])
  ];

  const formattedCreatedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';

  const getStepIcon = (st) => {
    switch (st) {
      case 'CREATED':
        return <ShoppingBag size={14} color="#0284c7" />;
      case 'RECEIVED':
        return <Clock size={14} color="#0284c7" />;
      case 'ACCEPTED':
        return <PackageCheck size={14} color="#d97706" />;
      case 'ITEMS_UPDATED':
        return <AlertCircle size={14} color="#d97706" />;
      case 'READY':
        return <CheckCircle2 size={14} color="#0284c7" />;
      case 'PAYMENT_REQUESTED':
        return <CreditCard size={14} color="#2563eb" />;
      case 'VERIFIED':
        return <ShieldCheck size={14} color="#16a34a" />;
      case 'COMPLETED':
        return <Check size={14} color="#16a34a" />;
      default:
        return <Clock size={14} color="#64748b" />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderTitle}>Order #{order.orderNumber || order.id}</Text>
                    <Text style={styles.orderSub}>Placed on {formattedCreatedDate}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Details Card */}
                <View style={styles.infoCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.infoLabel}>CUSTOMER:</Text>
                    <Text style={styles.infoVal}>{order.customerName || 'Customer'} ({order.customerShortId || '—'})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.infoLabel}>SHOP:</Text>
                    <Text style={styles.infoVal}>{order.shopName || 'GI SHOP Store'}</Text>
                  </View>
                </View>

                {/* Ordered Items Breakdown */}
                <Text style={styles.sectionTitle}>🛒 Ordered Items &amp; Billing</Text>
                <View style={styles.itemsTable}>
                  {items.map((it, idx) => {
                    const isUnavail = it.isUnavailable || it.unavailable;
                    const name = it.item?.name || it.name || 'Item';
                    const unit = it.item?.unit || it.unit || '';
                    const rate = it.rate || it.price || (it.item?.price) || 0;
                    const qty = it.qty || 1;
                    const amt = it.amount || (rate * qty);

                    return (
                      <View key={idx} style={[styles.itemRow, isUnavail && styles.itemRowUnavail]}>
                        <View style={{ flex: 2 }}>
                          <Text style={[styles.itemName, isUnavail && styles.strikeText]}>
                            {name} {isUnavail ? '(Unavailable)' : ''}
                          </Text>
                          <Text style={styles.itemMeta}>@{rate}/{unit}</Text>
                        </View>
                        <Text style={[styles.itemQty, isUnavail && styles.strikeText]}>{qty} {unit}</Text>
                        <Text style={[styles.itemAmt, isUnavail && styles.strikeText]}>₹{(Number(amt) || 0).toFixed(2)}</Text>
                      </View>
                    );
                  })}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Final Payable Amount:</Text>
                    <Text style={styles.totalVal}>
                      ₹{(Number(order.requestedAmount > 0 ? order.requestedAmount : order.estimatedTotal) || 0).toFixed(2)}
                    </Text>
                  </View>
                  {order.paymentMethod && (
                    <Text style={styles.paymentModeText}>Payment Mode: {order.paymentMethod}</Text>
                  )}
                </View>

                {/* Timeline Journey */}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>📜 Complete Order Journey</Text>
                <View style={{ paddingLeft: 4, marginBottom: 16 }}>
                  {displayTimeline.map((step, index) => {
                    const formattedTime = step.timestamp
                      ? new Date(step.timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '';
                    const isLast = index === displayTimeline.length - 1;

                    return (
                      <View key={index} style={styles.stepContainer}>
                        {!isLast && <View style={styles.timelineLine} />}
                        <View style={[styles.stepIconDot, isLast && styles.stepIconDotLast]}>
                          {getStepIcon(step.status)}
                        </View>
                        <View style={styles.stepBox}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepTime}>{formattedTime}</Text>
                          </View>
                          {step.description ? (
                            <Text style={styles.stepDesc}>{step.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Close Button */}
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.closeBtnText}>Close Order Details</Text>
                </TouchableOpacity>

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
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    ...shadowLarge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  orderSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  itemsTable: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemRowUnavail: {
    backgroundColor: '#fef2f2',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  strikeText: {
    textDecorationLine: 'line-through',
    color: '#dc2626',
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    width: 60,
    textAlign: 'center',
  },
  itemAmt: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    width: 70,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  totalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  paymentModeText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 10,
    position: 'relative',
    paddingBottom: 14,
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 24,
    bottom: 0,
    width: 2,
    backgroundColor: '#cbd5e1',
  },
  stepIconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepIconDotLast: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  stepBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  stepTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
