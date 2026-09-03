import React, { useState } from 'react';
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
import { X, UserPlus, Contact, Lock, RotateCcw, UserCheck, Search } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import { searchRegisteredCustomer, syncContacts } from '../api/client';

export default function AddCustomerModal({ visible, onClose, onCustomerAdded }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customerShortId, setCustomerShortId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [importedContactName, setImportedContactName] = useState('');

  // App Customer Search State
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appSearchResults, setAppSearchResults] = useState([]);
  const [appSearchLoading, setAppSearchLoading] = useState(false);
  const [appSearchNotice, setAppSearchNotice] = useState('');

  const handleSearchAppCustomer = async () => {
    if (!appSearchQuery.trim()) return;
    setAppSearchLoading(true);
    setAppSearchNotice('');
    try {
      const results = await searchRegisteredCustomer(appSearchQuery.trim());
      setAppSearchResults(results || []);
      if (!results || results.length === 0) {
        setAppSearchNotice('No registered customer account found with that Email or Short ID on GI SHOP.');
      }
    } catch (e) {
      setAppSearchNotice(e.message || 'Search failed. Check network or server.');
    } finally {
      setAppSearchLoading(false);
    }
  };

  const handleSelectAppCustomer = (user) => {
    setPhone(user.phone || '');
    setName(user.name || '');
    setCustomerShortId(user.shortId || '');
    setCustomerEmail(user.email || '');
    setIsImported(true);
    setImportedContactName(`${user.name} (${user.shortId})`);
    setAppSearchResults([]);
    setAppSearchQuery('');
  };

  const handleImportContact = async () => {
    try {
      let Contacts = null;
      try {
        Contacts = require('expo-contacts');
      } catch (e) {
        console.warn('expo-contacts native module not available:', e);
      }

      // 1. Native Mobile Device Contact Picker (Android / iOS)
      if (Contacts && typeof Contacts.requestPermissionsAsync === 'function' && Platform.OS !== 'web') {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Permission to access device contacts was denied. Please allow contacts permission in your phone settings to import customers directly.'
          );
          return;
        }

        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          const contactName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Customer';
          const rawPhone = (contact.phoneNumbers && contact.phoneNumbers.length > 0) ? contact.phoneNumbers[0].number : '';
          const cleanedPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : '';
          const contactEmail = (contact.emails && contact.emails.length > 0) ? contact.emails[0].email : '';

          if (cleanedPhone && cleanedPhone.length === 10) {
            setPhone(cleanedPhone);
            setName(contactName);
            setCustomerEmail(contactEmail || '');
            setImportedContactName(contactName);
            setIsImported(true);

            // Sync to central directory
            syncContacts({
              name: contactName,
              phone: cleanedPhone,
              email: contactEmail || '',
              source: 'DEVICE_IMPORT'
            }).catch(() => {});
            return;
          } else if (!rawPhone) {
            Alert.alert('No Phone Number', `The selected contact (${contactName}) has no phone number attached.`);
            return;
          } else {
            Alert.alert('Invalid Number', `The phone number for ${contactName} (${rawPhone}) is not a valid 10-digit number.`);
            return;
          }
        }
        return;
      }

      // 2. Web Contact Picker API (if supported in Chrome/Edge on Android/Desktop)
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in navigator.contacts) {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: false };
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const selected = contacts[0];
          const rawName = Array.isArray(selected.name) ? selected.name[0] : selected.name || '';
          const rawTel = Array.isArray(selected.tel) ? selected.tel[0] : selected.tel || '';
          const cleanedPhone = rawTel.replace(/\D/g, '').slice(-10);
          const rawEmail = Array.isArray(selected.email) ? selected.email[0] : selected.email || '';
          if (cleanedPhone && cleanedPhone.length === 10) {
            setPhone(cleanedPhone);
            setName(rawName || 'Customer');
            setCustomerEmail(rawEmail || '');
            setImportedContactName(rawName || 'Customer');
            setIsImported(true);

            syncContacts({
              name: rawName || 'Customer',
              phone: cleanedPhone,
              email: rawEmail || '',
              source: 'DEVICE_IMPORT'
            }).catch(() => {});
            return;
          }
        }
      }

      // Fallback for Expo Go when native module is missing
      if (Platform.OS !== 'web' && !Contacts) {
        Alert.alert(
          'Device Contacts',
          'Device Contacts import is active in the standalone APK and Google Play build. In Expo Go, please enter the customer Name & Phone number directly.'
        );
        return;
      }

      // 3. Fallback Interactive Prompt for Web
      if (Platform.OS === 'web') {
        const val = window.prompt('Enter contact details to import (e.g. Ramesh Kumar, 9876543210):');
        if (val) {
          const parts = val.split(',');
          let importedName = '';
          let importedPhone = '';
          if (parts.length >= 2) {
            importedName = parts[0].trim();
            importedPhone = parts[1].replace(/\D/g, '').slice(-10);
          } else {
            const digits = val.replace(/\D/g, '').slice(-10);
            importedPhone = digits;
            importedName = val.replace(/\d+/g, '').trim() || 'Imported Contact';
          }

          if (importedPhone && importedPhone.length >= 10) {
            setPhone(importedPhone);
            setName(importedName);
            setImportedContactName(importedName);
            setIsImported(true);

            syncContacts({
              name: importedName,
              phone: importedPhone,
              source: 'DEVICE_IMPORT'
            }).catch(() => {});
          } else {
            alert('Please enter a valid 10-digit phone number.');
          }
        }
      }
    } catch (err) {
      console.error('Contact import error:', err);
      Alert.alert('Contacts', err.message || 'Could not access device contacts.');
    }
  };

  const handleDiscardContact = () => {
    setIsImported(false);
    setPhone('');
    setName('');
    setCustomerShortId('');
    setCustomerEmail('');
    setImportedContactName('');
  };

  const handleResetModal = () => {
    setPhone('');
    setName('');
    setAddress('');
    setCustomerShortId('');
    setCustomerEmail('');
    setIsImported(false);
    setImportedContactName('');
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter customer phone number.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter customer name.');
      return;
    }

    setSubmitting(true);
    try {
      await onCustomerAdded({
        phone: phone.trim(),
        name: name.trim(),
        address: address.trim(),
        customerShortId: customerShortId || undefined,
        customerEmail: customerEmail || undefined,
      });
      handleResetModal();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add customer.');
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
                  <UserPlus size={22} color={colors.primary} />
                  <Text style={styles.title}>Add New Customer</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Registered App User Search Bar */}
              <View style={styles.appSearchBox}>
                <Text style={styles.appSearchTitle}>Link GI SHOP Account (Short ID / Phone / Email)</Text>
                <View style={styles.appSearchRow}>
                  <TextInput
                    style={styles.appSearchInput}
                    placeholder="Short ID, Email, or Phone..."
                    value={appSearchQuery}
                    onChangeText={setAppSearchQuery}
                    onSubmitEditing={handleSearchAppCustomer}
                  />
                  <TouchableOpacity
                    style={styles.appSearchBtn}
                    onPress={handleSearchAppCustomer}
                    disabled={appSearchLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.appSearchBtnText}>
                      {appSearchLoading ? '...' : 'Search'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {appSearchNotice ? (
                  <Text style={styles.appSearchNoticeText}>{appSearchNotice}</Text>
                ) : null}

                {appSearchResults.length > 0 && (
                  <View style={styles.searchResultsList}>
                    {appSearchResults.map((user) => (
                      <View key={user.id} style={styles.userCard}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.userNameText}>{user.name}</Text>
                            <View style={[styles.roleBadge, user.role === 'Shopkeeper' ? styles.roleShopkeeper : styles.roleCustomer]}>
                              <Text style={[styles.roleBadgeText, user.role === 'Shopkeeper' ? styles.roleShopkeeperText : styles.roleCustomerText]}>
                                {user.role === 'Shopkeeper' ? 'Shopkeeper' : 'Customer'}
                              </Text>
                            </View>
                            <Text style={styles.userShortIdText}>ID: {user.shortId || user.shopShortId}</Text>
                          </View>
                          <Text style={styles.userSubText}>
                            {user.phone} {user.email ? `• ${user.email}` : ''}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.selectUserBtn}
                          onPress={() => handleSelectAppCustomer(user)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectUserBtnText}>Select</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Import from Contacts Banner / Button */}
              {!isImported ? (
                <TouchableOpacity
                  style={styles.importContactsBtn}
                  onPress={handleImportContact}
                  activeOpacity={0.8}
                >
                  <Contact size={18} color="#2563eb" />
                  <Text style={styles.importContactsBtnText}>Import from Device Contacts</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.importedBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Lock size={14} color="#16a34a" />
                    <Text style={styles.importedBannerText} numberOfLines={1}>
                      Imported: <Text style={{ fontWeight: '700' }}>{importedContactName}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.discardBtn}
                    onPress={handleDiscardContact}
                    activeOpacity={0.7}
                  >
                    <RotateCcw size={13} color="#b91c1c" />
                    <Text style={styles.discardBtnText}>Discard / Pick Other</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Phone Number Input (Locked if Imported) */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  {isImported && (
                    <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700' }}>
                      🔒 Locked (Imported)
                    </Text>
                  )}
                </View>
                <TextInput
                  style={[styles.input, isImported && styles.inputLocked]}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!isImported}
                />
              </View>

              {/* Customer Name Input (Always Editable!) */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Customer Name *</Text>
                  {isImported && (
                    <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>
                      Editable Name
                    </Text>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChangeText={setName}
                  editable={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address / Area (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. House 44, Sector 2"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

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
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Saving...' : 'Save Customer'}
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
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.badgeBg,
  },
  importContactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  importContactsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  importedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  importedBannerText: {
    fontSize: 12,
    color: '#166534',
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  discardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
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
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.text,
  },
  inputLocked: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#334155',
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  appSearchBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  appSearchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  appSearchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appSearchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  appSearchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appSearchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  appSearchNoticeText: {
    fontSize: 12,
    color: '#c2410c',
    marginTop: 6,
  },
  searchResultsList: {
    marginTop: 10,
    maxHeight: 180,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  userShortIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  userSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleShopkeeper: {
    backgroundColor: '#f5f3ff',
  },
  roleShopkeeperText: {
    color: '#7c3aed',
    fontSize: 10,
    fontWeight: '800',
  },
  roleCustomer: {
    backgroundColor: '#eff6ff',
  },
  roleCustomerText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  selectUserBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectUserBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
