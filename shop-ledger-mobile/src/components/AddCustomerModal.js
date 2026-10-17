import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TextInput, StyleSheet, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { X, UserPlus, Contact, UserCheck, Search, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import { getCustomers, searchRegisteredCustomer, syncContacts, linkCustomerAccount } from '../api/client';
import { validatePhone } from '../utils/errorHandler';
import { customerDraftFromQuery, getCustomerPhone, getCustomerShortId, mergeCustomerResults } from '../utils/customerSearch';

const EMPTY_CUSTOMERS = [];

export default function AddCustomerModal({ visible, onClose, onCustomerAdded, onCustomerSelected, initialLinkTarget = null, customers = EMPTY_CUSTOMERS }) {
  const [mode, setMode] = useState('search');
  const [linkTarget, setLinkTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [savedCustomers, setSavedCustomers] = useState(customers);
  const [appResults, setAppResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [savedError, setSavedError] = useState('');
  const [retry, setRetry] = useState(0);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isImported, setIsImported] = useState(false);
  const [importedContactName, setImportedContactName] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMode('search'); setLinkTarget(initialLinkTarget); setQuery(initialLinkTarget ? getCustomerPhone(initialLinkTarget) : ''); setAppResults([]); setFormError('');
    setName(''); setPhone(''); setAddress(''); setCustomerEmail('');
    setIsImported(false); setImportedContactName('');
  }, [visible, initialLinkTarget]);

  useEffect(() => { if (visible) setSavedCustomers(customers); }, [visible, customers]);

  useEffect(() => {
    if (!visible) return;
    let current = true;
    setSavedLoading(true); setSavedError('');
    getCustomers().then(data => { if (current) setSavedCustomers(data); })
      .catch(error => { if (current) setSavedError(error.message || 'Could not refresh saved customers.'); })
      .finally(() => { if (current) setSavedLoading(false); });
    return () => { current = false; };
  }, [visible, retry]);

  useEffect(() => {
    let current = true;
    setAppResults([]); setSearchError('');
    if (!visible || mode !== 'search' || query.trim().length < 2) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      searchRegisteredCustomer(query.trim())
        .then(data => { if (current) setAppResults(data || []); })
        .catch(error => { if (current) setSearchError(error.message || 'Could not search GI SHOP accounts.'); })
        .finally(() => { if (current) setSearching(false); });
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  }, [query, visible, mode, retry]);

  const results = (linkTarget
    ? appResults.map(c => ({ ...c, _needsSave: true, _linkExistingPhone: getCustomerPhone(linkTarget) }))
    : mergeCustomerResults(savedCustomers, appResults, query)).slice(0, 30);
  const close = () => { if (!submitting) onClose(); };
  const addNew = () => {
    const draft = customerDraftFromQuery(query);
    setName(draft.name); setPhone(draft.phone); setAddress(''); setCustomerEmail('');
    setIsImported(false); setImportedContactName(''); setFormError(''); setMode('new');
  };

  const performSelection = async (customer) => {
    if (submitting) return;
    setSubmitting(true); setFormError('');
    try {
      if (customer._linkExistingPhone) {
        const response = await linkCustomerAccount({ phone: customer._linkExistingPhone, customerId: getCustomerShortId(customer), email: customer.email || customer.customerEmail });
        const linked = { ...(linkTarget || customer), ...response.customer, shortId: response.customer.customerShortId };
        if (onCustomerSelected) await onCustomerSelected(linked);
      } else if (!customer._needsSave && onCustomerSelected) {
        await onCustomerSelected(customer);
      } else {
        await onCustomerAdded({
          phone: getCustomerPhone(customer), name: customer.name,
          address: customer.address || '', customerShortId: getCustomerShortId(customer) || undefined,
          customerEmail: customer.email || customer.customerEmail || undefined,
        });
      }
      onClose();
    } catch (error) { setFormError(error.message || 'Could not select this customer. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const selectCustomer = (customer) => {
    if (submitting) return;
    if (customer._linkExistingPhone) {
      Alert.alert('Connect app account?', `Connect past bills and any existing Khata for ${linkTarget?.name || customer.name} (${customer._linkExistingPhone}) to ${customer._appAccountName || customer.name}, ID ${getCustomerShortId(customer)}? Check that this is the same person.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect & select', onPress: () => performSelection(customer) },
      ]);
    } else performSelection(customer);
  };

  const handleImportContact = async () => {
    if (submitting) return;
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

  const handleSubmit = async () => {
    if (submitting) return;
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) return setFormError(phoneCheck.error);
    if (!name.trim()) return setFormError('Enter the customer name.');
    const existing = savedCustomers.find(c => getCustomerPhone(c).replace(/\D/g, '').slice(-10) === phoneCheck.phone);
    if (existing) {
      setMode('search'); setQuery(phoneCheck.phone);
      setFormError('This phone is already saved. Select the customer below.');
      return;
    }
    setSubmitting(true); setFormError('');
    try {
      await onCustomerAdded({ phone: phoneCheck.phone, name: name.trim(), address: address.trim(), customerEmail: customerEmail || undefined });
      onClose();
    } catch (error) { setFormError(error.message || 'Could not save the customer. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.heading}>
                  {mode === 'new' || linkTarget ? <TouchableOpacity accessibilityLabel="Back to customer search" onPress={() => { setMode('search'); setLinkTarget(null); setQuery(''); setFormError(''); }} disabled={submitting} style={styles.closeBtn}><ArrowLeft size={18} color={colors.text} /></TouchableOpacity> : null}
                  <Text style={styles.title}>{mode === 'new' ? 'New customer' : linkTarget ? 'Connect app account' : 'Choose customer'}</Text>
                </View>
                <TouchableOpacity accessibilityLabel="Close customer picker" onPress={close} disabled={submitting} style={styles.closeBtn}><X size={18} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
                {mode === 'search' ? <>
                  <Text style={styles.subtitle}>{linkTarget ? `Find ${linkTarget.name}'s registered account to connect their past bills and any existing Khata.` : 'Find a saved customer or someone on GI SHOP.'}</Text>
                  <View style={styles.searchBox}>
                    <Search size={18} color={colors.primary} />
                    <TextInput accessibilityLabel="Search customers" style={styles.searchInput} placeholder="Name, phone or Customer ID" value={query} onChangeText={value => { setQuery(value); setFormError(''); }} autoCapitalize="none" autoCorrect={false} editable={!submitting} />
                    {(searching || savedLoading) && <ActivityIndicator size="small" color={colors.primary} />}
                  </View>
                  {query.trim().length === 1 && <Text style={styles.hint}>Type at least 2 characters to search GI SHOP accounts.</Text>}
                  {!!(searchError || savedError) && <View style={styles.notice}>
                    <Text style={styles.error}>{searchError || savedError} Saved results may still be available.</Text>
                    <TouchableOpacity onPress={() => setRetry(n => n + 1)} disabled={submitting}><Text style={styles.link}>Retry search</Text></TouchableOpacity>
                  </View>}
                  {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
                  <Text style={styles.sectionLabel}>{linkTarget ? 'Registered app accounts' : query.trim() ? 'Matching customers' : 'Saved customers'}</Text>
                  {results.map((customer, index) => <View key={`${getCustomerShortId(customer)}:${getCustomerPhone(customer)}:${index}`} style={styles.customerRow}>
                    <TouchableOpacity style={styles.customerChoice} onPress={() => selectCustomer(customer)} disabled={submitting} accessibilityLabel={`Select ${customer.name}, ${getCustomerPhone(customer)}`}>
                      <View style={styles.avatar}><Text style={styles.avatarText}>{(customer.name || '?').slice(0, 1).toUpperCase()}</Text></View>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        <Text style={styles.customerMeta}>{getCustomerPhone(customer)}{getCustomerShortId(customer) ? ` · ${getCustomerShortId(customer)}` : ''}</Text>
                        <Text style={[styles.accountState, !getCustomerShortId(customer) && styles.cashOnly]}>{getCustomerShortId(customer) ? 'GI SHOP account' : 'Cash / Online only'}</Text>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                    {!getCustomerShortId(customer) && <TouchableOpacity accessibilityLabel={`Connect app account for ${customer.name}`} onPress={() => { setLinkTarget(customer); setQuery(getCustomerPhone(customer)); setFormError(''); }} disabled={submitting} style={styles.connectButton}><Text style={styles.link}>Connect app</Text></TouchableOpacity>}
                  </View>)}
                  {!results.length && !searching && !savedLoading && !searchError && !savedError && <Text style={styles.empty}>{query.trim() ? 'No matching customers found.' : 'No saved customers yet. Search GI SHOP or add someone new.'}</Text>}
                  {!linkTarget && <TouchableOpacity style={styles.addButton} onPress={addNew} disabled={submitting}><UserPlus size={18} color={colors.primary} /><Text style={styles.link}>Add new customer</Text></TouchableOpacity>}
                  {!linkTarget && <TouchableOpacity style={styles.walkIn} onPress={close} disabled={submitting}><Text style={styles.hint}>Close</Text></TouchableOpacity>}
                  {submitting && <ActivityIndicator color={colors.primary} />}
                </> : <>
                  <Text style={styles.subtitle}>Save their details once for faster billing next time.</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleImportContact} disabled={submitting}><Contact size={18} color={colors.primary} /><Text style={styles.link}>{isImported ? `Imported: ${importedContactName}` : 'Fill from phone contacts'}</Text></TouchableOpacity>
                  <Text style={styles.label}>Customer name *</Text>
                  <TextInput accessibilityLabel="Customer name" style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" editable={!submitting} />
                  <Text style={styles.label}>Phone number *</Text>
                  <TextInput accessibilityLabel="Phone number" style={styles.input} value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" keyboardType="phone-pad" editable={!submitting} />
                  <Text style={styles.label}>Address / area (optional)</Text>
                  <TextInput accessibilityLabel="Address or area" style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. Gandhi Nagar" editable={!submitting} />
                  <View style={styles.notice}><Text style={styles.hint}>Cash / Online billing is available. For Khata credit, select or link their registered GI SHOP account.</Text></View>
                  {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
                  <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={submitting}><Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save & select customer'}</Text></TouchableOpacity>
                </>}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.55)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingTop: 10, ...shadowLarge },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d0d5dd', marginBottom: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 8, borderRadius: 18, backgroundColor: colors.badgeBg },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28 },
  subtitle: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.background },
  searchInput: { flex: 1, height: 50, fontSize: 15, color: colors.text },
  sectionLabel: { color: colors.textMuted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 4 },
  customerChoice: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#bfe3cb', marginLeft: 6 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eff1f4' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 17, color: colors.primary },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  customerMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  accountState: { color: colors.primary, fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  cashOnly: { color: '#9a6700' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24, lineHeight: 21 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#bfe3cb', backgroundColor: '#eef8f1', marginTop: 16 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  walkIn: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  notice: { padding: 12, backgroundColor: colors.background, borderRadius: 10, marginTop: 12, gap: 6 },
  error: { color: '#b42318', fontSize: 13, lineHeight: 20, marginTop: 8 },
  label: { color: '#344054', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.background },
  saveButton: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, backgroundColor: colors.primary, marginTop: 18 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
