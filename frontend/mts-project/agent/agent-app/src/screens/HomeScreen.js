import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, ActivityIndicator, RefreshControl, StyleSheet, Dimensions, StatusBar, Alert, Platform } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { Share, Plus, Settings, MapPin, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { agentService } from '../services/api';
import { getErrorMessage } from '../utils/error';

const { width } = Dimensions.get('window');

const formatCoordinateLocation = ({ latitude, longitude }) => {
    const lat = Number(latitude).toFixed(4);
    const lng = Number(longitude).toFixed(4);
    return `${lat}, ${lng}`;
};

const formatAddress = (address) => (
    address?.name ||
    address?.street ||
    address?.district ||
    address?.subregion ||
    address?.city ||
    address?.region ||
    address?.country ||
    ''
);

export default function HomeScreen() {
    const navigation = useNavigation();
    const [locationName, setLocationName] = useState('Fetching location...');
    const [isLocationModalVisible, setLocationModalVisible] = useState(false);
    const [searchLocation, setSearchLocation] = useState('');
    const [agentData, setAgentData] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    const fetchAgentData = async () => {
        try {
            setLoadError('');
            const [profileRes, vendorsRes] = await Promise.all([
                agentService.getProfile(),
                agentService.getVendors(),
            ]);

            setAgentData(profileRes.data?.data || null);
            setVendors(vendorsRes.data?.data?.vendors || []);
        } catch (err) {
            console.error('Failed to fetch agent data:', err?.response?.data || err.message);
            setLoadError(getErrorMessage(err, 'Unable to load your dashboard right now. Please try again.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchCurrentLocation = async () => {
        try {
            setLocationName('Fetching location...');

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationName('Location denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const coordsLabel = formatCoordinateLocation(location.coords);

            if (Platform.OS === 'web' || typeof Location.reverseGeocodeAsync !== 'function') {
                setLocationName(coordsLabel);
                return;
            }

            try {
                const [address] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                setLocationName(formatAddress(address) || coordsLabel);
            } catch (err) {
                console.warn('Reverse geocoding failed:', err?.message || err);
                setLocationName(coordsLabel);
            }
        } catch (err) {
            console.warn('Failed to fetch current location:', err?.message || err);
            setLocationName('Unable to fetch location');
        }
    };

    useEffect(() => {
        fetchAgentData();
        fetchCurrentLocation();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAgentData();
    }, []);

    const referralCode = agentData?.referral_code || '-';
    const commissionBalance = parseFloat(agentData?.commission_balance || 0);
    const fullName = agentData?.name || agentData?.full_name || 'Agent';
    const approvalStatus = agentData?.approval_status || 'pending';
    const activeVendors = vendors.filter((vendor) => vendor.approval_status === 'approved').length;
    const pendingVendors = vendors.filter((vendor) => vendor.approval_status === 'pending').length;

    const chartData = [
        { name: 'Active', population: activeVendors || 1, color: '#059669', legendFontColor: '#1f2937', legendFontSize: 13 },
        { name: 'Pending', population: pendingVendors || 0, color: '#fbbf24', legendFontColor: '#6b7280', legendFontSize: 13 },
    ];

    const chartConfig = {
        backgroundGradientFromOpacity: 0,
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    };

    const handleShareReferral = () => {
        const message = `Join MTS India as a vendor! Use my referral code: ${referralCode} to get started.`;
        Alert.alert('Share Referral Code', message);
    };

    const handleAddVendor = () => {
        if (approvalStatus !== 'approved') {
            const label = approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1);
            Alert.alert('Approval Required', `Vendor onboarding is blocked because this agent is ${label}. Ask admin to approve the agent first.`);
            return;
        }

        navigation.navigate('VendorRegistration');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                    <TouchableOpacity style={styles.locationContainer} onPress={() => setLocationModalVisible(true)}>
                        <MapPin color="#64748b" size={16} />
                        <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
                        <ChevronDown color="#64748b" size={16} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
                    <Settings color="#1e293b" size={22} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={styles.loadingText}>Loading your dashboard...</Text>
                    </View>
                ) : (
                    <View style={styles.mainContent}>
                        {loadError ? (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorBannerText}>{loadError}</Text>
                            </View>
                        ) : null}

                        {approvalStatus !== 'approved' && (
                            <View style={{
                                backgroundColor: '#FFFBEB', borderRadius: 20, padding: 20,
                                borderWidth: 1.5, borderColor: '#FDE68A', marginBottom: 20,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={{ fontSize: 28, marginRight: 10 }}>⏳</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#92400E' }}>
                                            Pending Admin Approval
                                        </Text>
                                        <Text style={{ fontSize: 13, color: '#B45309', marginTop: 2 }}>
                                            Status: <Text style={{ fontWeight: '800', textTransform: 'capitalize' }}>{approvalStatus}</Text>
                                        </Text>
                                    </View>
                                </View>
                                <View style={{
                                    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
                                    borderWidth: 1, borderColor: '#FECACA',
                                }}>
                                    <Text style={{ fontSize: 12.5, color: '#991B1B', fontWeight: '600', textAlign: 'center' }}>
                                        ⚠️  You cannot onboard vendors until your account is approved by admin.
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.profileCard}>
                            <LinearGradient
                                colors={['#2563eb', '#1d4ed8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.profileGradient}
                            >
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.greetingText}>Welcome back,</Text>
                                    <Text style={styles.nameText}>{fullName}</Text>
                                    <View style={styles.referralBadge}>
                                        <Text style={styles.referralBadgeText}>ID: {referralCode}</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Commission Balance</Text>
                            <Text style={styles.balanceText}>Rs {commissionBalance.toFixed(2)}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Total Vendors</Text>
                                    <Text style={styles.statValue}>{vendors.length}</Text>
                                </View>
                                <View style={[styles.statItem, styles.statBorder]}>
                                    <Text style={styles.statLabel}>Active</Text>
                                    <Text style={[styles.statValue, { color: '#059669' }]}>{activeVendors}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Pending</Text>
                                    <Text style={[styles.statValue, { color: '#d97706' }]}>{pendingVendors}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddVendor}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#059669', '#047857']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.addButtonGradient}
                            >
                                <Plus color="#fff" size={20} />
                                <Text style={styles.addButtonText}>Add New Vendor</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.card}>
                            <View style={styles.referralHeader}>
                                <View style={styles.referralCopyBlock}>
                                    <Text style={styles.cardTitle}>Share Referral</Text>
                                    <Text style={styles.referralCodeText}>{referralCode}</Text>
                                    {approvalStatus !== 'approved' && (
                                        <Text style={styles.pendingHint}>
                                            Agent must be approved by admin before onboarding vendors.
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={handleShareReferral} style={styles.shareButton}>
                                    <Share color="#2563eb" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {vendors.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Vendor Distribution</Text>
                                <View style={styles.chartContainer}>
                                    <PieChart
                                        data={chartData}
                                        width={Math.min(width, 450) - 80}
                                        height={180}
                                        chartConfig={chartConfig}
                                        accessor="population"
                                        backgroundColor="transparent"
                                        paddingLeft="15"
                                        center={[10, 0]}
                                        absolute
                                        hasLegend
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal animationType="slide" transparent visible={isLocationModalVisible} onRequestClose={() => setLocationModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Location</Text>
                            <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.closeButton}>
                                <Text style={styles.closeText}>X</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <MapPin color="#94a3b8" size={20} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search location..."
                                value={searchLocation}
                                onChangeText={setSearchLocation}
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.currentLocationBtn}
                            onPress={() => {
                                setLocationModalVisible(false);
                                fetchCurrentLocation();
                            }}
                        >
                            <View style={styles.locationIconBg}>
                                <MapPin color="#fff" size={16} />
                            </View>
                            <View>
                                <Text style={styles.currentLocTitle}>Current Location</Text>
                                <Text style={styles.currentLocSub}>{locationName}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerLogo: {
        width: 40,
        height: 40,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: '#e2e8f0',
        flex: 1,
    },
    locationText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
        marginHorizontal: 4,
        flex: 1,
    },
    settingsButton: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        alignItems: 'center',
    },
    mainContent: {
        width: '100%',
        maxWidth: 500,
    },
    loadingContainer: {
        paddingVertical: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 15,
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    errorBannerText: {
        color: '#b91c1c',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    profileCard: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    profileGradient: {
        flexDirection: 'row',
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    greetingText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
    },
    nameText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    referralBadge: {
        marginTop: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    referralBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 12,
    },
    balanceText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e2e8f0',
    },
    statLabel: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    addButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    addButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    referralHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    referralCopyBlock: {
        flex: 1,
        marginRight: 16,
    },
    referralCodeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        letterSpacing: 2,
    },
    pendingHint: {
        marginTop: 6,
        fontSize: 12,
        color: '#b45309',
        fontWeight: '600',
    },
    shareButton: {
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 12,
    },
    chartContainer: {
        alignItems: 'center',
        paddingTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 18,
        color: '#94a3b8',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#1e293b',
    },
    currentLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    locationIconBg: {
        backgroundColor: '#2563eb',
        padding: 8,
        borderRadius: 12,
        marginRight: 16,
    },
    currentLocTitle: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 16,
    },
    currentLocSub: {
        color: '#64748b',
        fontSize: 13,
    },
});
