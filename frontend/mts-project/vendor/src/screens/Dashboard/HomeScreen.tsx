import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient, { bookingService } from '../../services/api';
import { syncVendorLiveLocation } from '../../utils/location';
import { getVendorCategoryMeta } from '../../utils/categoryMeta';
import VendorAnnouncementManager from '../../components/VendorAnnouncementManager';

function getVendorRecord(value: any) {
    return value?.vendor ?? value ?? null;
}

function showActivationBlockedDialog(message?: string) {
    Alert.alert(
        'Cannot Go Active',
        message || 'At least one service must be approved by admin and turned on before you can go active.'
    );
}

function deriveShortLocation(address?: string | null) {
    const parts = String(address || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
    }

    return parts[0] || 'Location not set';
}

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const ratingScrollRef = useRef<ScrollView>(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncingLocation, setSyncingLocation] = useState(false);
    const [availabilityMeta, setAvailabilityMeta] = useState<{ canEnable: boolean; reason: string }>({
        canEnable: true,
        reason: '',
    });
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [bookings, setBookings] = useState<any[]>([]);
    const [showAllReviews, setShowAllReviews] = useState(false);

    const highlightCardWidth = Math.max(screenWidth - 52, 260);
    const isCompact = screenWidth < 380;
    const quickActionWidth = isCompact ? '100%' : '48%';
    const serviceCardWidth = isCompact ? '47%' : '30%';
    const headerTopPadding = Math.max(insets.top + 6, 14);

    const fetchProfileAndStats = async (shouldSyncLocation = false) => {
        try {
            const stored = await AsyncStorage.getItem('userData');
            if (stored) {
                setUserData(JSON.parse(stored));
            }

            const profileRes = await apiClient.get('/vendors/profile');
            if (profileRes.data?.data) {
                const profile = profileRes.data.data;
                const vendor = getVendorRecord(profile);
                setUserData(profile);
                await AsyncStorage.setItem('userData', JSON.stringify(profile));
                setIsAvailable(Boolean(vendor?.is_available ?? false));
            }

            const availabilityRes = await apiClient.get('/vendors/availability');
            if (availabilityRes.data?.data) {
                setIsAvailable(Boolean(availabilityRes.data.data.is_available));
                setAvailabilityMeta({
                    canEnable: Boolean(availabilityRes.data.data.can_enable ?? true),
                    reason: availabilityRes.data.data.unavailable_reason || '',
                });
            }

            try {
                const bookingsRes = await bookingService.getVendorBookings();
                setBookings(Array.isArray(bookingsRes.data?.data) ? bookingsRes.data.data : []);
            } catch (bookingError) {
                setBookings([]);
            }

            if (shouldSyncLocation) {
                setSyncingLocation(true);
                try {
                    const updatedProfile = await syncVendorLiveLocation();
                    if (updatedProfile) {
                        setUserData(updatedProfile);
                        await AsyncStorage.setItem('userData', JSON.stringify(updatedProfile));
                    }
                } catch (error) {
                    // Ignore location sync failures so the dashboard still loads.
                } finally {
                    setSyncingLocation(false);
                }
            }
        } catch (err) {
            const stored = await AsyncStorage.getItem('userData');
            if (stored) {
                const parsed = JSON.parse(stored);
                const vendor = getVendorRecord(parsed);
                setUserData(parsed);
                setIsAvailable(Boolean(vendor?.is_available ?? false));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProfileAndStats(true);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProfileAndStats(true);
        }, [])
    );

    const vendorData = getVendorRecord(userData);
    const businessName =
        vendorData?.business_name ||
        vendorData?.owner_name ||
        vendorData?.user?.full_name ||
        userData?.full_name ||
        'My Business';
    const approvalStatus = vendorData?.approval_status || 'pending';
    const ratingValue = vendorData?.rating != null ? Number(vendorData.rating).toFixed(1) : 'New';
    const reviewCount = Number(vendorData?.review_count || 0);
    const services = Array.isArray(vendorData?.services) ? vendorData.services : [];
    const approvedServices = services.filter((service: any) => service.approval_status === 'approved');
    const liveServices = approvedServices.filter((service: any) => service.is_available);
    const reels = Array.isArray(vendorData?.reels) ? vendorData.reels : [];
    const reviewedBookings = useMemo(
        () =>
            bookings
                .filter((booking: any) => booking?.review)
                .map((booking: any) => ({
                    id: booking.booking_id,
                    customerName: booking.user?.full_name || 'Customer',
                    serviceName: booking.vendor_service?.service_title || booking.vendor_service?.category?.category_name || 'Service',
                    rating: Number(booking.review?.rating || 0),
                    comment: String(booking.review?.comment || '').trim(),
                    createdAt: booking.review?.updated_at || booking.created_at,
                }))
                .sort((first: any, second: any) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
        [bookings],
    );
    const visibleReviews = showAllReviews ? reviewedBookings : reviewedBookings.slice(0, 2);
    const serviceVisibilityWarnings = useMemo(() => {
        const warnings: string[] = [];

        if (approvalStatus !== 'approved') {
            warnings.push('Your vendor account is waiting for admin approval.');
        }

        if (services.length === 0) {
            warnings.push('No services have been added yet.');
        } else if (approvedServices.length === 0) {
            warnings.push('Your services are waiting for admin approval.');
        } else if (liveServices.length === 0) {
            warnings.push('Approved services are currently turned off.');
        }

        if (!isAvailable) {
            warnings.push(availabilityMeta.reason || 'Your vendor availability is turned off.');
        }

        return warnings;
    }, [approvalStatus, approvedServices.length, availabilityMeta.reason, isAvailable, liveServices.length, services.length]);

    const uniqueCategories = useMemo(() => {
        const seen = new Set();
        return services
            .map((service: any) => service.category || null)
            .filter((category: any) => category?.category_name)
            .filter((category: any) => {
                if (seen.has(category.category_name)) {
                    return false;
                }
                seen.add(category.category_name);
                return true;
            })
            .slice(0, 6);
    }, [services]);

    const highlightCards = [
        {
            key: 'rating',
            title: 'Average rating',
            value: ratingValue,
            subtitle: reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'Waiting for first review',
            icon: 'star',
            color: '#F59E0B',
        },
        {
            key: 'services',
            title: 'Approved services',
            value: String(approvedServices.length),
            subtitle: `${liveServices.length} live for users`,
            icon: 'briefcase-outline',
            color: '#006AE8',
        },
        {
            key: 'reels',
            title: 'Reels uploaded',
            value: String(reels.length),
            subtitle: reels.length > 0 ? 'Keep showcasing recent work' : 'Upload your first reel',
            icon: 'video-outline',
            color: '#8B5CF6',
        },
        {
            key: 'status',
            title: 'Account status',
            value: approvalStatus === 'approved' ? 'Ready' : 'Pending',
            subtitle: availabilityMeta.reason || 'You can manage services and availability here.',
            icon: 'shield-check-outline',
            color: approvalStatus === 'approved' ? '#16A34A' : '#F59E0B',
        },
    ];

    useEffect(() => {
        if (highlightCards.length <= 1) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            setHighlightIndex((current) => {
                const nextIndex = (current + 1) % highlightCards.length;
                ratingScrollRef.current?.scrollTo({
                    x: nextIndex * (highlightCardWidth + 12),
                    animated: true,
                });
                return nextIndex;
            });
        }, 2800);

        return () => clearInterval(intervalId);
    }, [highlightCardWidth, highlightCards.length]);

    const handleAvailabilityToggle = async (value: boolean) => {
        if (value && !availabilityMeta.canEnable) {
            showActivationBlockedDialog(availabilityMeta.reason);
            return;
        }

        setIsAvailable(value);
        try {
            const response = await apiClient.patch('/vendors/availability', { is_available: value });
            const nextData = response.data?.data;
            setIsAvailable(Boolean(nextData?.is_available ?? value));
            setAvailabilityMeta({
                canEnable: Boolean(nextData?.can_enable ?? true),
                reason: nextData?.unavailable_reason || '',
            });
        } catch (err: any) {
            console.error('Failed to update availability:', err);
            setIsAvailable(!value);
            const message = err?.response?.data?.message || 'Please try again later.';
            if (value) {
                showActivationBlockedDialog(message);
                setAvailabilityMeta((current) => ({
                    ...current,
                    canEnable: false,
                    reason: message,
                }));
                return;
            }

            Alert.alert('Unable to update availability', message);
        }
    };

    const quickActions = [
        {
            label: 'Manage Services',
            icon: 'briefcase-edit-outline',
            color: '#0F5DFF',
            route: 'ManageService',
            backgroundColor: '#EAF2FF',
            shadowColor: '#0F5DFF',
            accentColor: '#8EC5FF',
        },
        {
            label: 'Time Slots',
            icon: 'calendar-clock',
            color: '#14B8A6',
            route: 'TimeSlots',
            backgroundColor: '#E8FFFB',
            shadowColor: '#14B8A6',
            accentColor: '#7DE7D7',
        },
        {
            label: 'Upload Reels',
            icon: 'video',
            color: '#F97316',
            route: 'UploadReels',
            backgroundColor: '#FFF2E8',
            shadowColor: '#F97316',
            accentColor: '#FFC28D',
        },
        {
            label: 'Chat Settings',
            icon: 'whatsapp',
            color: '#D946EF',
            route: 'ChatSettings',
            backgroundColor: '#FCEEFF',
            shadowColor: '#D946EF',
            accentColor: '#F4A6FF',
        },
    ];

    if (loading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#006AE8" />
                <Text className="text-textSecondary mt-3">Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchProfileAndStats();
                    }}
                    colors={['#006AE8']}
                />
            }
        >
            <View className="bg-white px-4 pb-4" style={{ paddingTop: headerTopPadding }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ width: isCompact ? 104 : 122, justifyContent: 'center', flexShrink: 0 }}>
                        <Image
                            source={require('../../../logo.png')}
                            style={{ width: '100%', height: isCompact ? 50 : 58 }}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={{ width: 42, height: 42 }} />
                </View>

                <TouchableOpacity
                    onPress={() => fetchProfileAndStats(true)}
                    disabled={syncingLocation}
                    style={{
                        marginTop: 12,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: '#E0ECFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                        }}
                    >
                        <MaterialIcons name="location-pin" size={18} color="#007BFF" />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                        {syncingLocation ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#007BFF" />
                                <Text style={{ fontSize: 14, color: '#007BFF', fontWeight: '500', marginLeft: 8 }}>
                                    Updating live location...
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Text
                                    style={{ fontSize: 14, color: '#111827', fontWeight: '700' }}
                                    numberOfLines={1}
                                >
                                    {deriveShortLocation(vendorData?.address)}
                                </Text>
                                <Text
                                    style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}
                                    numberOfLines={1}
                                >
                                    {vendorData?.address || 'Tap to sync your current location'}
                                </Text>
                            </>
                        )}
                    </View>

                    {!syncingLocation ? <MaterialIcons name="keyboard-arrow-right" size={20} color="#6B7280" /> : null}
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <View
                    style={{
                        backgroundColor: '#0E63D7',
                        borderRadius: 24,
                        padding: 18,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            position: 'absolute',
                            right: -10,
                            top: -12,
                            width: 110,
                            height: 110,
                            borderRadius: 55,
                            backgroundColor: 'rgba(255,255,255,0.12)',
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            right: 42,
                            bottom: -32,
                            width: 120,
                            height: 120,
                            borderRadius: 60,
                            backgroundColor: 'rgba(255,255,255,0.09)',
                        }}
                    />
                    <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' }}>
                        Welcome back
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>
                        {businessName}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 6 }} numberOfLines={2}>
                        {availabilityMeta.reason
                            ? `Availability note: ${availabilityMeta.reason}`
                            : 'Everything looks ready. Keep your services updated and respond quickly to customers.'}
                    </Text>

                    <View
                        style={{
                            marginTop: 18,
                            backgroundColor: 'rgba(255,255,255,0.16)',
                            borderRadius: 16,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Available for bookings</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 3 }}>
                                {isAvailable
                                    ? 'Customers can book you right now.'
                                    : availabilityMeta.reason || 'Turn on your availability when you are ready.'}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text
                                style={{
                                    color: '#FFFFFF',
                                    fontSize: 11,
                                    fontWeight: '800',
                                    marginBottom: 6,
                                }}
                            >
                                {isAvailable ? 'Available' : 'Not available'}
                            </Text>
                            <Switch
                                value={isAvailable}
                                onValueChange={handleAvailabilityToggle}
                                trackColor={{ false: 'rgba(255,255,255,0.28)', true: '#86EFAC' }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="rgba(255,255,255,0.28)"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {!isAvailable && availabilityMeta.reason ? (
                <View
                    style={{
                        marginHorizontal: 16,
                        marginTop: 14,
                        backgroundColor: '#FFF7ED',
                        borderWidth: 1,
                        borderColor: '#FED7AA',
                        borderRadius: 18,
                        padding: 14,
                        flexDirection: 'row',
                    }}
                >
                    <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#F59E0B" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ color: '#9A3412', fontWeight: '700', fontSize: 14 }}>Why you cannot go live</Text>
                        <Text style={{ color: '#9A3412', fontSize: 12, lineHeight: 18, marginTop: 3 }}>
                            {availabilityMeta.reason}
                        </Text>
                    </View>
                </View>
            ) : null}

            {serviceVisibilityWarnings.length > 0 ? (
                <View
                    style={{
                        marginHorizontal: 16,
                        marginTop: 14,
                        backgroundColor: '#FFFBEB',
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        borderRadius: 18,
                        padding: 14,
                        flexDirection: 'row',
                    }}
                >
                    <MaterialCommunityIcons name="alert-outline" size={22} color="#D97706" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 14 }}>
                            Why users may not see your services
                        </Text>
                        <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 18, marginTop: 5 }}>
                            Users can see and book your services only after your account is approved, at least one service is approved, that service is turned on, and your availability is active.
                        </Text>
                        {serviceVisibilityWarnings.map((warning, index) => (
                            <View
                                key={`${warning}-${index}`}
                                style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}
                            >
                                <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 17, marginRight: 6 }}>-</Text>
                                <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 17, flex: 1 }}>
                                    {warning}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

            <VendorAnnouncementManager vendorAddress={vendorData?.address} />

            <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Services you provide</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ManageService')}>
                        <Text style={{ color: '#0E63D7', fontSize: 13, fontWeight: '700' }}>Manage services</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 16 }}>
                    {uniqueCategories.length > 0 ? (
                        uniqueCategories.map((category: any, index: number) => {
                            const meta = getVendorCategoryMeta(category.icon_name, category.category_name);
                            return (
                                <View
                                    key={`${category.category_name}-${index}`}
                                style={{ width: serviceCardWidth, marginBottom: 16, alignItems: 'center' }}
                                >
                                    <View
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 18,
                                            backgroundColor: meta.bg,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            borderColor: `${meta.color}25`,
                                            shadowColor: meta.color,
                                            shadowOffset: { width: 0, height: 8 },
                                            shadowOpacity: 0.18,
                                            shadowRadius: 16,
                                            elevation: 8,
                                        }}
                                    >
                                        <MaterialIcons name={meta.icon as any} size={28} color={meta.color} />
                                    </View>
                                    <Text
                                        style={{
                                            textAlign: 'center',
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: '#111827',
                                            marginTop: 10,
                                        }}
                                    >
                                        {category.category_name}
                                    </Text>
                                </View>
                            );
                        })
                    ) : (
                        <View
                            style={{
                                width: '100%',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 18,
                                padding: 18,
                            }}
                        >
                            <Text style={{ color: '#111827', fontWeight: '700' }}>No services added yet</Text>
                            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                                Add your first service to start showing what you provide to customers.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 28 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 }}>Quick Actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {quickActions.map((action) => (
                        <TouchableOpacity
                            key={action.route}
                            onPress={() => navigation.navigate(action.route)}
                            style={{
                                width: quickActionWidth,
                                backgroundColor: action.backgroundColor,
                                borderRadius: 24,
                                padding: 16,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: `${action.color}25`,
                                shadowColor: action.shadowColor,
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.22,
                                shadowRadius: 14,
                                elevation: 10,
                            }}
                        >
                            <View
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    bottom: 10,
                                    width: 54,
                                    height: 54,
                                    borderRadius: 20,
                                    backgroundColor: `${action.accentColor}70`,
                                }}
                            />
                            <View
                                style={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: 18,
                                    backgroundColor: '#FFFFFF',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 12,
                                    shadowColor: action.shadowColor,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.16,
                                    shadowRadius: 10,
                                    elevation: 6,
                                }}
                            >
                                <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                            </View>
                            <Text style={{ color: '#111827', fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
                            <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                                {action.route === 'AddService'
                                    ? 'Update your service catalog'
                                    : action.route === 'TimeSlots'
                                    ? 'Control your booking schedule'
                                    : action.route === 'UploadReels'
                                    ? 'Showcase your recent work'
                                    : 'Manage your customer chat flow'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ marginTop: 4, marginBottom: 28 }}>
                <View style={{ paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Your customer feedback</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                            Reviews from customers after completed work.
                        </Text>
                    </View>
                    {reviewedBookings.length > 0 ? (
                        <TouchableOpacity onPress={() => setShowAllReviews((current) => !current)}>
                            <Text style={{ color: '#0E63D7', fontSize: 13, fontWeight: '700' }}>
                                {showAllReviews ? 'Show less' : 'View all'}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <ScrollView
                    ref={ratingScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 16, paddingRight: 4 }}
                    onMomentumScrollEnd={(event) => {
                        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (highlightCardWidth + 12));
                        setHighlightIndex(nextIndex);
                    }}
                >
                    {highlightCards.map((card) => (
                        <View
                            key={card.key}
                            style={{
                                width: highlightCardWidth,
                                marginRight: 12,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 24,
                                padding: 18,
                                borderWidth: 1,
                                borderColor: `${card.color}18`,
                                shadowColor: card.color,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.12,
                                shadowRadius: 14,
                                elevation: 7,
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700' }}>{card.title}</Text>
                                    <Text style={{ color: '#111827', fontSize: 28, fontWeight: '800', marginTop: 8 }}>{card.value}</Text>
                                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6, lineHeight: 18 }}>{card.subtitle}</Text>
                                </View>
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${card.color}14`,
                                    }}
                                >
                                    <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                    {highlightCards.map((card, index) => (
                        <View
                            key={card.key}
                            style={{
                                width: index === highlightIndex ? 18 : 8,
                                height: 8,
                                borderRadius: 999,
                                marginHorizontal: 4,
                                backgroundColor: index === highlightIndex ? '#0E63D7' : '#CBD5E1',
                            }}
                        />
                    ))}
                </View>

                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    {visibleReviews.length > 0 ? (
                        visibleReviews.map((review) => (
                            <View
                                key={review.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 22,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    shadowColor: '#0F172A',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 14,
                                    elevation: 5,
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={{ color: '#111827', fontSize: 15, fontWeight: '800' }}>{review.customerName}</Text>
                                        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 3 }}>{review.serviceName}</Text>
                                    </View>
                                    <View
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 999,
                                            backgroundColor: '#FFF7D6',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                                        <Text style={{ color: '#92400E', fontWeight: '800', marginLeft: 4 }}>{review.rating.toFixed(1)}</Text>
                                    </View>
                                </View>

                                <Text style={{ color: '#374151', fontSize: 13, lineHeight: 20, marginTop: 12 }}>
                                    {review.comment || 'Customer gave a rating for this completed work.'}
                                </Text>

                                <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 12 }}>
                                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 22,
                                padding: 18,
                                borderWidth: 1,
                                borderColor: '#E5E7EB',
                            }}
                        >
                            <Text style={{ color: '#111827', fontWeight: '800' }}>No reviews yet</Text>
                            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                                Complete a few jobs and your customer feedback will start appearing here.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
