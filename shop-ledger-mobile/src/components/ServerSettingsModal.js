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
import { Server, X, RotateCcw, Check } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function ServerSettingsModal({ visible, onClose }) {
  const { serverUrl, updateServerUrl, resetServerUrl } = useAuth();
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    if (serverUrl) {
      setUrlInput(serverUrl);
    }
  }, [serverUrl, visible]);

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid backend URL.');
      return;
    }
    try {
      await updateServerUrl(urlInput.trim());
      Alert.alert('Updated', 'Backend server URL updated successfully.');
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update server URL.');
    }
  };

  const handleReset = async () => {
    await resetServerUrl();
    setUrlInput(Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');
    Alert.alert('Reset', 'Server URL reset to platform default.');
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
                  <Server size={22} color={colors.primary} />
                  <Text style={styles.title}>Backend Connection</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>
                Configure the backend API server host. For Android emulator use{' '}
                <Text style={{ fontWeight: '700' }}>http://10.0.2.2:3001</Text>, for iOS simulator use{' '}
                <Text style={{ fontWeight: '700' }}>http://localhost:3001</Text>, and for physical
                devices use your computer's local LAN IP (e.g.{' '}
                <Text style={{ fontWeight: '700' }}>http://192.168.1.X:3001</Text>).
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Backend Base URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="http://10.0.2.2:3001"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={urlInput}
                  onChangeText={setUrlInput}
                />
              </View>

              <View style={styles.quickHelpers}>
                <TouchableOpacity
                  style={styles.quickPreset}
                  onPress={() => setUrlInput('https://gi-shop-api.onrender.com')}
                >
                  <Text style={[styles.quickPresetText, { color: colors.primary, fontWeight: '700' }]}>☁️ Cloud (gi-shop-api.onrender.com)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPreset}
                  onPress={() => setUrlInput('http://10.0.2.2:3001')}
                >
                  <Text style={styles.quickPresetText}>Android Local (10.0.2.2:3001)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPreset}
                  onPress={() => setUrlInput('http://localhost:3001')}
                >
                  <Text style={styles.quickPresetText}>iOS / Web (localhost:3001)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color={colors.textSecondary} />
                  <Text style={styles.resetBtnText}>Default</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Save</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.badgeBg,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
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
    fontSize: 14,
    backgroundColor: colors.background,
    color: colors.text,
  },
  quickHelpers: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickPreset: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.badgeBg,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickPresetText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
