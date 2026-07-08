import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import api, { clearUserSession, getStoredUserToken, saveUserSession } from '../utils/api';
import { detectCurrentLocation } from '../utils/location';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EditProfileScreen = ({ navigation }) => {
  const route = useRoute<any>();
  const isRegistrationMode = route.params?.mode === 'registration';
  const fallbackContact = typeof route.params?.contact === 'string' ? route.params.contact.trim() : '';
  const lockedEmail = isRegistrationMode && fallbackContact.includes('@');
  const lockedPhone = isRegistrationMode && !!fallbackContact && !fallbackContact.includes('@');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        const profile = res.data.data;

        const resolvedPhone = profile?.mobile || (!fallbackContact.includes('@') ? fallbackContact : '');
        const resolvedEmail = profile?.email || (fallbackContact.includes('@') ? fallbackContact : '');

        setName(profile?.full_name === 'User' ? '' : (profile?.full_name || ''));
        setEmail(resolvedEmail);
        setPhone(resolvedPhone);
        setAddress(profile?.profile?.address || '');
      } catch (err) {
        console.error('Error fetching profile for edit:', err);
        if (fallbackContact) {
          if (fallbackContact.includes('@')) {
            setEmail(fallbackContact);
          } else {
            setPhone(fallbackContact);
          }
        }
      }
    };

    fetchProfile();
  }, [fallbackContact]);

  const validationMessage = useMemo(() => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      return 'Name is required.';
    }

    if (isRegistrationMode && !trimmedPhone) {
      return 'Phone number is required.';
    }

    if (lockedEmail && !trimmedEmail) {
      return 'Email is required.';
    }

    if (lockedPhone && !trimmedPhone) {
      return 'Phone number is required.';
    }

    if (!trimmedPhone && !trimmedEmail) {
      return 'Phone number or email is required.';
    }

    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      return 'Phone number must be exactly 10 digits.';
    }

    if (trimmedEmail && !emailPattern.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }

    return '';
  }, [email, isRegistrationMode, lockedEmail, lockedPhone, name, phone]);

  const handleDetectLocation = async () => {
    if (saveError) {
      setSaveError('');
    }
    setDetectingLocation(true);
    try {
      const detectedLocation = await detectCurrentLocation();
      setAddress(detectedLocation.address);
    } catch (error: any) {
      Alert.alert('Location Unavailable', error?.message || 'Could not detect your current location.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleBack = async () => {
    if (!isRegistrationMode) {
      navigation.goBack();
      return;
    }

    await clearUserSession();
    navigation.replace('Login');
  };

  const handleSave = async () => {
    setSaveError('');
    if (validationMessage) {
      Alert.alert('Check your details', validationMessage);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: name.trim(),
        email: email.trim() || null,
        mobile: phone.trim() || null,
        address: address.trim() || null,
        registration_complete: isRegistrationMode,
      };

      const res = await api.put('/users/profile', payload);
      const updatedProfile = res.data.data;

      const existingToken = await getStoredUserToken();
      if (existingToken) {
        await saveUserSession(existingToken, updatedProfile);
      }

      if (isRegistrationMode) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
        return;
      }

      Alert.alert('Saved', 'Changes saved successfully.');
      navigation.goBack();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save changes';
      setSaveError(message);
      Alert.alert('Save failed', message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isRegistrationMode ? 'Complete Registration' : 'Edit Profile'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={56} color="#007BFF" />
              </View>
            </View>
            <Text style={styles.heroCaption}>
              {isRegistrationMode
                ? 'Add your details so we can recognize you next time'
                : 'Keep your contact details up to date'}
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <View style={styles.inputShell}>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(value) => {
                    if (saveError) {
                      setSaveError('');
                    }
                    setName(value);
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.inputShell, lockedEmail ? styles.inputShellLocked : null]}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(value) => {
                    if (saveError) {
                      setSaveError('');
                    }
                    setEmail(value);
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!lockedEmail}
                />
              </View>
              {lockedEmail ? (
                <Text style={styles.lockedHint}>This email is locked because you logged in with it.</Text>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={[styles.inputShell, lockedPhone ? styles.inputShellLocked : null]}>
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={(value) => {
                    if (saveError) {
                      setSaveError('');
                    }
                    setPhone(value.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!lockedPhone}
                />
              </View>
              {lockedPhone ? (
                <Text style={styles.lockedHint}>This phone number is locked because you logged in with it.</Text>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Address</Text>
              <View style={styles.addressCard}>
                <View style={styles.addressInputRow}>
                  <Ionicons name="location-outline" size={20} color="#6B7280" style={{ marginTop: 2 }} />
                  <TextInput
                    style={[styles.textInput, styles.addressInput]}
                    value={address}
                    onChangeText={(value) => {
                      if (saveError) {
                        setSaveError('');
                      }
                      setAddress(value);
                    }}
                    placeholder="Enter your address or use your current location"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                  style={styles.locationButton}
                >
                  {detectingLocation ? (
                    <ActivityIndicator color="#007BFF" />
                  ) : (
                    <View style={styles.locationButtonContent}>
                      <Ionicons name="locate-outline" size={18} color="#007BFF" />
                      <Text style={styles.locationButtonText}>Use Current Location</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {validationMessage ? (
            <View style={styles.validationCard}>
              <Text style={styles.validationText}>{validationMessage}</Text>
            </View>
          ) : null}

          {saveError ? (
            <View style={styles.errorCard}>
              <Text style={styles.validationText}>{saveError}</Text>
            </View>
          ) : null}

          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Ionicons name="information-circle" size={18} color="#007BFF" />
              <Text style={styles.noteTitle}>Note</Text>
            </View>
            <Text style={styles.noteText}>
              {isRegistrationMode
                ? lockedEmail
                  ? 'Name, your verified email, and your phone number are required before you can continue.'
                  : lockedPhone
                    ? 'Name and your verified phone number are required before you can continue.'
                    : 'Name and your phone number are required before you can continue.'
                : 'Keep your details accurate so bookings, updates, and support can reach you.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.primaryButton, { opacity: saving ? 0.7 : 1 }]}
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? (isRegistrationMode ? 'Saving details...' : 'Saving...')
              : (isRegistrationMode ? 'Complete Registration' : 'Save Changes')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    marginLeft: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  heroCaption: {
    marginTop: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  formSection: {
    gap: 20,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  inputShellLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    minHeight: 22,
  },
  lockedHint: {
    marginTop: 4,
    marginLeft: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  addressCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressInput: {
    minHeight: 72,
  },
  locationButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007BFF',
  },
  validationCard: {
    marginTop: 28,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  validationText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  noteCard: {
    marginTop: 32,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F4F9FF',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    marginLeft: 8,
    color: '#007BFF',
    fontWeight: '700',
    fontSize: 14,
  },
  noteText: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007BFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EditProfileScreen;
