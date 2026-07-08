import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import apiClient from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BusinessProfileScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { width } = useWindowDimensions();
    const { mobile, contact, agentCode } = route.params || {};
    const initialContact = (contact || mobile || '').trim();
    const initialEmail = initialContact.includes('@') ? initialContact : '';
    const initialMobile = initialContact && !initialContact.includes('@') ? initialContact : '';
    const rawAgentCode = (agentCode || '').trim();
    const normalizedAgentCode = ['', 'undefined', 'null'].includes(rawAgentCode.toLowerCase())
        ? ''
        : rawAgentCode.toUpperCase();

    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [emailAddress, setEmailAddress] = useState(initialEmail);
    const [mobileNumber, setMobileNumber] = useState(initialMobile);
    const [whatsappNumber, setWhatsappNumber] = useState(initialMobile);
    const [description, setDescription] = useState('');

    const [locationMode, setLocationMode] = useState<'live' | 'manual' | null>(null);
    const [manualAddress, setManualAddress] = useState('');
    const [locationFetching, setLocationFetching] = useState(false);
    const [detectedLocation, setDetectedLocation] = useState('');
    const [formError, setFormError] = useState('');
    const horizontalPadding = Math.max(16, Math.min(24, Math.round(width * 0.06)));
    const isNarrow = width < 380;
    const clearFormError = () => {
        if (formError) {
            setFormError('');
        }
    };

    const handleDetectLive = async () => {
        setLocationFetching(true);
        setDetectedLocation('');
        try {
            // Dynamic import to handle if expo-location isn't installed yet
            const Location = await import('expo-location');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Location permission is required. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                );
                setLocationFetching(false);
                return;
            }

            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const geocode = await Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            });

            if (geocode.length > 0) {
                const g = geocode[0];
                const parts = [g.name, g.street, g.city, g.region, g.postalCode, g.country].filter(Boolean);
                setDetectedLocation(parts.join(', '));
            } else {
                setDetectedLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
            }
        } catch (e: any) {
            if (e?.message?.includes('Cannot find module')) {
                Alert.alert('Setup Required', "Please run: npx expo install expo-location\nthen restart the bundler.");
            } else {
                Alert.alert('Error', 'Could not fetch location. Try again or enter manually.');
            }
        } finally {
            setLocationFetching(false);
        }
    };

    return (
        <ScrollView
            className="flex-1 bg-background pt-16"
            contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="mb-8">
                <Text className="text-3xl font-bold text-textPrimary">Create Your Business Profile</Text>
                <Text className="text-textSecondary mt-2">Fill in your details to start getting orders</Text>
            </View>

            <View className="space-y-5 mb-10">
                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Business Name *</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary"
                        placeholder="E.g. RK Plumbing Services"
                        placeholderTextColor="#94A3B8"
                        value={businessName}
                        onChangeText={(value) => {
                            clearFormError();
                            setBusinessName(value);
                        }}
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Owner Name *</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary"
                        placeholder="John Doe"
                        placeholderTextColor="#94A3B8"
                        value={ownerName}
                        onChangeText={(value) => {
                            clearFormError();
                            setOwnerName(value);
                        }}
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Email Address</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary"
                        placeholder="Enter email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#94A3B8"
                        value={emailAddress}
                        onChangeText={(value) => {
                            clearFormError();
                            setEmailAddress(value);
                        }}
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Mobile Number *</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary"
                        placeholder="Enter mobile number"
                        keyboardType="phone-pad"
                        placeholderTextColor="#94A3B8"
                        value={mobileNumber}
                        onChangeText={(value) => {
                            clearFormError();
                            const sanitized = value.replace(/[^0-9]/g, '');
                            const shouldSyncWhatsapp = !whatsappNumber || whatsappNumber === mobileNumber;
                            setMobileNumber(sanitized);
                            if (shouldSyncWhatsapp) {
                                setWhatsappNumber(sanitized);
                            }
                        }}
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">WhatsApp Number *</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary"
                        placeholder="Enter WhatsApp number"
                        keyboardType="phone-pad"
                        placeholderTextColor="#94A3B8"
                        value={whatsappNumber}
                        onChangeText={(value) => {
                            clearFormError();
                            setWhatsappNumber(value.replace(/[^0-9]/g, ''));
                        }}
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Business Description</Text>
                    <TextInput
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-textPrimary h-24"
                        placeholder="Briefly describe your services..."
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor="#94A3B8"
                        value={description}
                        onChangeText={(value) => {
                            clearFormError();
                            setDescription(value);
                        }}
                    />
                </View>

                {/* ── Location Section ── */}
                <View>
                    <Text className="text-sm font-medium text-textPrimary mb-1">Location *</Text>
                    <Text className="text-xs text-textSecondary mb-3">How would you like to add your location?</Text>

                    {/* Two option cards */}
                    <View style={{ flexDirection: isNarrow ? 'column' : 'row', gap: 12, marginBottom: 12 }}>
                        {/* Find Live */}
                        <TouchableOpacity
                            onPress={() => {
                                clearFormError();
                                setLocationMode('live');
                                handleDetectLive();
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 16,
                                borderRadius: 14,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: locationMode === 'live' ? '#006AE8' : '#E2E8F0',
                                backgroundColor: locationMode === 'live' ? '#E8F2FF' : '#F8FAFC',
                            }}
                        >
                            <MaterialCommunityIcons
                                name="crosshairs-gps"
                                size={26}
                                color={locationMode === 'live' ? '#006AE8' : '#64748B'}
                            />
                            <Text style={{
                                marginTop: 6,
                                fontWeight: '700',
                                fontSize: 13,
                                color: locationMode === 'live' ? '#006AE8' : '#1E293B'
                            }}>
                                Find Live
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Use GPS</Text>
                        </TouchableOpacity>

                        {/* Enter Manually */}
                        <TouchableOpacity
                            onPress={() => {
                                clearFormError();
                                setLocationMode('manual');
                                setDetectedLocation('');
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 16,
                                borderRadius: 14,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: locationMode === 'manual' ? '#006AE8' : '#E2E8F0',
                                backgroundColor: locationMode === 'manual' ? '#E8F2FF' : '#F8FAFC',
                            }}
                        >
                            <MaterialCommunityIcons
                                name="pencil-outline"
                                size={26}
                                color={locationMode === 'manual' ? '#006AE8' : '#64748B'}
                            />
                            <Text style={{
                                marginTop: 6,
                                fontWeight: '700',
                                fontSize: 13,
                                color: locationMode === 'manual' ? '#006AE8' : '#1E293B'
                            }}>
                                Enter Manually
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Type address</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Live location result box */}
                    {locationMode === 'live' && (
                        <View style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: detectedLocation ? '#006AE8' : '#E2E8F0',
                            borderRadius: 12,
                            padding: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            minHeight: 52,
                        }}>
                            {locationFetching ? (
                                <>
                                    <ActivityIndicator size="small" color="#006AE8" />
                                    <Text style={{ marginLeft: 12, color: '#94A3B8', fontSize: 14 }}>
                                        Detecting your location...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name={detectedLocation ? 'map-marker-check-outline' : 'map-marker-outline'}
                                        size={20}
                                        color={detectedLocation ? '#006AE8' : '#94A3B8'}
                                    />
                                    <Text style={{
                                        marginLeft: 10,
                                        color: detectedLocation ? '#1E293B' : '#94A3B8',
                                        flex: 1,
                                        fontSize: 14,
                                    }}>
                                        {detectedLocation || 'Tap "Find Live" to detect your location'}
                                    </Text>
                                    {detectedLocation ? (
                                        <TouchableOpacity onPress={handleDetectLive} style={{ padding: 4 }}>
                                            <MaterialCommunityIcons name="refresh" size={18} color="#006AE8" />
                                        </TouchableOpacity>
                                    ) : null}
                                </>
                            )}
                        </View>
                    )}

                    {/* Manual entry */}
                    {locationMode === 'manual' && (
                        <TextInput
                            style={{
                                backgroundColor: '#F8FAFC',
                                borderWidth: 1,
                                borderColor: manualAddress ? '#006AE8' : '#E2E8F0',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                color: '#1E293B',
                                fontSize: 14,
                                minHeight: 80,
                            }}
                            placeholder="Enter your full address, city, pincode..."
                            placeholderTextColor="#94A3B8"
                            value={manualAddress}
                            onChangeText={(value) => {
                                clearFormError();
                                setManualAddress(value);
                            }}
                            multiline
                            textAlignVertical="top"
                        />
                    )}
                </View>


                <TouchableOpacity
                    className="w-full bg-primary py-4 rounded-xl items-center mt-4 shadow-sm"
                    onPress={async () => {
                        const resolvedAddress = locationMode === 'live' ? detectedLocation : manualAddress;

                        if (!businessName.trim()) {
                            setFormError('Business Name is required');
                            return;
                        }
                        if (!ownerName.trim()) {
                            setFormError('Owner Name is required');
                            return;
                        }
                        if (!mobileNumber.trim() && !emailAddress.trim()) {
                            setFormError('Mobile number or email is required');
                            return;
                        }
                        if (mobileNumber.trim() && !/^\d{10}$/.test(mobileNumber.trim())) {
                            setFormError('Mobile number must be exactly 10 digits');
                            return;
                        }
                        if (whatsappNumber.trim() && !/^\d{10}$/.test(whatsappNumber.trim())) {
                            setFormError('WhatsApp number must be exactly 10 digits');
                            return;
                        }
                        if (emailAddress.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
                            setFormError('Please enter a valid email address');
                            return;
                        }
                        if (!resolvedAddress.trim()) {
                            setFormError('Location is required');
                            return;
                        }

                        setFormError('');
                        try {
                            const registrationData = {
                                mobile: mobileNumber || undefined,
                                email: emailAddress || undefined,
                                full_name: ownerName,
                                business_name: businessName,
                                ...(normalizedAgentCode ? { agent_code: normalizedAgentCode } : {}),
                                whatsapp_number: whatsappNumber || mobileNumber || undefined,
                                description,
                                address: resolvedAddress,
                            };
                            
                            const response = await apiClient.post('/auth/register-vendor', registrationData);
                            if (response.data.success) {
                                const userData = response.data.user;
                                await AsyncStorage.setItem('userToken', response.data.token);
                                await AsyncStorage.setItem('userData', JSON.stringify(userData));
                                navigation.navigate('ServiceCategories');
                            }
                        } catch (error: any) {
                            const message = error?.response?.data?.message || 'Failed to register vendor';
                            setFormError(message);
                            Alert.alert('Registration Failed', message);
                        }
                    }}
                >
                    <Text className="text-white font-semibold text-lg">Save & Continue</Text>
                </TouchableOpacity>
                {formError ? (
                    <View style={{ marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                        <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '500' }}>{formError}</Text>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
}
