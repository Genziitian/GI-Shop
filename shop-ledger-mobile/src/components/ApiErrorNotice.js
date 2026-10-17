import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Share, StyleSheet } from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { parseError, getErrorReport } from '../utils/errorHandler';

export default function ApiErrorNotice({ error, context, onRetry, hint }) {
  const [open, setOpen] = useState(false);
  if (!error) return null;
  const parsed = parseError(error);
  const report = getErrorReport(error, context);
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Text style={styles.title}>{context ? `${context}: ` : ''}{parsed.title}</Text>
      <Text style={styles.message}>{parsed.message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Error details</Text>
        </TouchableOpacity>
        {onRetry ? <TouchableOpacity onPress={onRetry} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity> : null}
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.dialogTitle}>Error details</Text>
            <Text style={styles.message}>Long-press the report to copy it, or use Share details to send it for troubleshooting.</Text>
            <ScrollView style={styles.reportScroll}>
              <Text selectable style={styles.report}>{report}</Text>
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.button} onPress={() => Share.share({ message: report }).catch(() => {})} accessibilityRole="button">
                <Text style={styles.buttonText}>Share details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => setOpen(false)} accessibilityRole="button">
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { margin: 12, padding: 14, backgroundColor: '#fffbeb', borderColor: '#f5cf7a', borderWidth: 1, borderRadius: 12 },
  title: { color: '#78350f', fontSize: 14, fontWeight: '800' },
  message: { color: '#78350f', fontSize: 13, lineHeight: 19, marginTop: 5 },
  hint: { color: '#92400e', fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  button: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d6b57b', borderRadius: 8 },
  buttonText: { color: '#78350f', fontSize: 13, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: '85%' },
  dialogTitle: { color: '#101828', fontSize: 19, fontWeight: '800' },
  reportScroll: { marginTop: 12, flexShrink: 1 },
  report: { color: '#344054', fontFamily: 'monospace', fontSize: 12, lineHeight: 20 },
});
