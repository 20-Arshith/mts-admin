import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Platform,
    StatusBar,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AnnouncementBanner from '../components/AnnouncementBanner';
import ShadowIconBox from '../components/ShadowIconBox';
import { API_BASE } from '../utils/config';
import api, { notificationService } from '../utils/api';
import {
    deriveShortLabelFromAddress,
    detectCurrentLocation,
    looksLikeCoordinateAddress,
    syncUserLocation,
} from '../utils/location';
import { getCategoryMeta, getServiceMeta } from '../utils/serviceHelpers';
import { showUnreadAppNotifications } from '../utils/localNotifications';
import { Announcement } from '../types/announcement';

const CARD_COLORS = ['#1565C0', '#388E3C', '#E65100', '#6A1B9A', '#00796B', '#C2185B', '#FBC02D'];

const calculateDistanceKm = (
    originLat?: number | null,
    originLng?: number | null,
    targetLat?: number | null,
    targetLng?: number | null
) => {
    if (
        originLat == null ||
        originLng == null ||
        targetLat == null ||
        targetLng == null
    ) {
        return null;
    }

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(targetLat - originLat);
    const deltaLng = toRadians(targetLng - originLng);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(toRadians(originLat)) *
            Math.cos(toRadians(targetLat)) *
            Math.sin(deltaLng / 2) *
            Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(1));
};

const formatDistance = (distanceKm: number | null) => {
    if (distanceKm == null) return 'Distance unavailable';
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
    return `${distanceKm.toFixed(1)} km away`;
};

const HomeScreen = ({ navigation, route }) => {
    const { width: screenWidth } = useWindowDimensions();
    const [bannerIndex, setBannerIndex] = useState(0);
    const [bottomBannerIndex, setBottomBannerIndex] = useState(0);
    const [fetchedBanners, setFetchedBanners] = useState<any[]>([]);
    const [locationName, setLocationName] = useState('HSR Layout, Bangalore');
    const [locationDetail, setLocationDetail] = useState('');
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [userCoordinates, setUserCoordinates] = useState({
        latitude: null as number | null,
        longitude: null as number | null,
    });
    const [nearbyServices, setNearbyServices] = useState<Array<{
        serviceId?: number;
        vendorId?: number;
        vendorName: string;
        serviceName: string;
        categoryName: string;
        rating: number;
        reviewCount: number;
        priceLabel: string;
        priceValue: number;
        distanceKm: number | null;
        color: string;
        imageUrl?: string | null;
    }>>([]);
    const headerLogoWidth = Math.min(Math.max(screenWidth * 0.27, 92), 132);
    const headerLogoHeight = Math.min(Math.max(headerLogoWidth * 0.52, 40), 62);
    const heroCardWidth = Math.max(screenWidth - 32, 280);

    useEffect(() => {
        if (route.params?.autoFetchLocation) {
            setTimeout(() => {
                fetchLocation();
            }, 600);

            navigation.setParams({ autoFetchLocation: false });
        }
    }, [navigation, route.params?.autoFetchLocation]);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                const res = await fetch(`https://res.cloudinary.com/dge2s1ncr/raw/upload/v1/mts-india/ads-config.json?t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setFetchedBanners(data.filter(ad => ad.status === 'Active'));
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch ads', e);
            }
        };
        fetchAds();
    }, []);

    const fetchLocation = async (showError = true) => {
        setIsFetchingLocation(true);
        try {
            const detectedLocation = await detectCurrentLocation();
            setLocationName(detectedLocation.shortLabel);
            setLocationDetail(detectedLocation.address);
            setUserCoordinates({
                latitude: detectedLocation.latitude,
                longitude: detectedLocation.longitude,
            });
            await syncUserLocation(detectedLocation);
        } catch (error) {
            console.error('Error fetching location:', error);
            if (showError) {
                Alert.alert('Error', 'Could not fetch location.');
            }
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const banners = [
        {
            title: 'MTS India Launch Offer:',
            subtitle: '30% OFF Home Cleaning!',
            buttonText: 'Offer now',
            colors: ['#1A6FD4', '#0A4BAD'],
        },
        {
            title: 'Book an Electrician Today:',
            subtitle: 'Flat Rs.100 OFF on first booking!',
            buttonText: 'Book now',
            colors: ['#2196F3', '#0D47A1'],
        },
        {
            title: 'AC Service Special:',
            subtitle: 'Starting from just Rs.499!',
            buttonText: 'Offer now',
            colors: ['#1565C0', '#0D47A1'],
        },
    ];

    const bottomBanners = [
        {
            title: 'Festive Cleaning Offer:',
            subtitle: 'Get your home sparkling clean for Rs.599!',
            buttonText: 'Book now',
            colors: ['#7E57C2', '#4527A0'],
            icon: 'cleaning-services',
        },
        {
            title: 'Plumbing Emergency?',
            subtitle: 'We reach in 30 mins! Flat Rs.50 OFF.',
            buttonText: 'Call now',
            colors: ['#00ACC1', '#006064'],
            icon: 'water-drop',
        },
        {
            title: 'Protect Your Home:',
            subtitle: 'Full Painting Services with 1-Year Warranty',
            buttonText: 'Explore',
            colors: ['#EC407A', '#880E4F'],
            icon: 'format-paint',
        },
    ];

    const [categories, setCategories] = useState<Array<{ icon: string; label: string; color: string; id?: number }>>([
        { icon: 'water-drop', label: 'Plumbing', color: '#26C6DA' },
        { icon: 'bolt', label: 'Electrician', color: '#FFA726' },
        { icon: 'handyman', label: 'Carpenter', color: '#78909C' },
        { icon: 'brush', label: 'Painting', color: '#EC407A' },
        { icon: 'ac-unit', label: 'AC Repair', color: '#546E7A' },
        { icon: 'cleaning-services', label: 'Cleaning', color: '#7E57C2' },
        { icon: 'build', label: 'Mechanic', color: '#1E88E5' },
        { icon: 'local-shipping', label: 'Moving', color: '#43A047' },
    ]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_BASE}/users/categories`);
                const json = await response.json();
                if (json.success && json.data.length > 0) {
                    const mapped = json.data.map((cat) => {
                        const meta = getCategoryMeta(cat.icon_name, cat.category_name);
                        return {
                            icon: meta.icon,
                            label: cat.category_name,
                            color: meta.color,
                            id: cat.category_id,
                        };
                    });
                    setCategories(mapped);
                }
            } catch (error) {
                console.warn('Failed to fetch categories dynamically, using defaults.', error);
            }
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        const loadSavedLocation = async () => {
            try {
                const response = await api.get('/users/profile');
                const profile = response.data?.data?.profile;
                const savedAddress = profile?.address;
                const latitude = profile?.latitude != null ? Number(profile.latitude) : null;
                const longitude = profile?.longitude != null ? Number(profile.longitude) : null;

                if (savedAddress && !looksLikeCoordinateAddress(savedAddress)) {
                    setLocationName(deriveShortLabelFromAddress(savedAddress));
                    setLocationDetail(savedAddress);
                }

                if (latitude != null && longitude != null) {
                    setUserCoordinates({ latitude, longitude });
                    return;
                }
            } catch (error) {
                // Ignore profile lookup failures on initial render.
            }

            fetchLocation(false);
        };

        loadSavedLocation();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await notificationService.getMyNotifications(5);
            if (response.data?.data) {
                showUnreadAppNotifications(response.data.data.notifications || []);
            }
        } catch (error) {
            console.warn('Failed to fetch notifications.', error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchNotifications();
        }, [])
    );

    useEffect(() => {
        const fetchNearbyServices = async () => {
            try {
                const res = await api.get('/users/services');
                const items = Array.isArray(res.data?.data) ? res.data.data : [];
                const mapped = items
                    .map((service: any, index: number) => {
                        const vendorLatitude =
                            service.vendor?.latitude != null ? Number(service.vendor.latitude) : null;
                        const vendorLongitude =
                            service.vendor?.longitude != null ? Number(service.vendor.longitude) : null;
                        const distanceKm = calculateDistanceKm(
                            userCoordinates.latitude,
                            userCoordinates.longitude,
                            vendorLatitude,
                            vendorLongitude
                        );

                        return {
                            serviceId: service.id,
                            vendorId: service.vendor?.vendor_id,
                            vendorName: service.vendor?.business_name || 'Service Provider',
                            serviceName: service.service_title || 'Service',
                            categoryName: service.category?.category_name || 'General',
                            rating: service.rating != null ? Number(service.rating) : 0,
                            reviewCount: Number(service.review_count || 0),
                            priceValue: service.price_min != null ? Number(service.price_min) : 0,
                            priceLabel: service.price_min != null ? `Starting Rs.${Number(service.price_min)}` : 'Price on request',
                            distanceKm,
                            color: CARD_COLORS[index % CARD_COLORS.length],
                            imageUrl: service.vendor?.logo_url || service.image_urls?.[0] || null,
                        };
                    })
                    .sort((a, b) => {
                        if (a.distanceKm == null && b.distanceKm == null) return 0;
                        if (a.distanceKm == null) return 1;
                        if (b.distanceKm == null) return -1;
                        return a.distanceKm - b.distanceKm;
                    })
                    .slice(0, 10);

                setNearbyServices(mapped);
            } catch (error) {
                console.warn('Failed to fetch nearby services.', error);
                setNearbyServices([]);
            }
        };

        fetchNearbyServices();
    }, [userCoordinates.latitude, userCoordinates.longitude]);

    const visibleCategories = categories.slice(0, 8);
    const topFetchedBanners = fetchedBanners.filter(ad => ad.position === 'Top' || ad.position === 'Both' || !ad.position);
    const bottomFetchedBanners = fetchedBanners.filter(ad => ad.position === 'Bottom' || ad.position === 'Both');
    const displayBanners = topFetchedBanners.length > 0 ? topFetchedBanners : banners;
    const displayBottomBanners = bottomFetchedBanners.length > 0 ? bottomFetchedBanners : bottomBanners;

    const openAnnouncementVendor = (announcement: Announcement) => {
        if (!announcement.vendor_id) {
            return;
        }

        navigation.navigate('VendorProfile', {
            vendorId: announcement.vendor_id,
            vendorName: 'Vendor',
            type: 'Service',
            rating: 4.8,
        });
    };

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F6FA]"
            style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <ScrollView>
                <View className="bg-white px-4 pt-3 pb-4">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ width: headerLogoWidth, justifyContent: 'center', flexShrink: 0 }}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={{ width: '100%', height: headerLogoHeight }}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={{ width: 42, height: 42 }} />
                    </View>

                    <TouchableOpacity
                        onPress={() => fetchLocation()}
                        disabled={isFetchingLocation}
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
                            {isFetchingLocation ? (
                                <View className="flex-row items-center">
                                    <ActivityIndicator size="small" color="#007BFF" />
                                    <Text className="text-[14px] text-[#007BFF] font-medium ml-2">Locating...</Text>
                                </View>
                            ) : (
                                <>
                                    <Text
                                        className="text-[14px] text-gray-900 font-semibold"
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {locationName}
                                    </Text>
                                    {locationDetail ? (
                                        <Text
                                            className="text-[11px] text-gray-500 mt-0.5"
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {locationDetail}
                                        </Text>
                                    ) : null}
                                </>
                            )}
                        </View>

                        {!isFetchingLocation && (
                            <MaterialIcons
                                name="keyboard-arrow-right"
                                size={20}
                                color="#6B7280"
                            />
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="px-4 py-3"
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('Search')}
                >
                    <View
                        className="bg-white rounded-xl flex-row items-center px-4 py-3"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                        <Ionicons name="search" size={22} color="#9CA3AF" />
                        <Text className="text-gray-400 text-sm ml-2">
                            Search for services, e.g., 'Plumber'...
                        </Text>
                    </View>
                </TouchableOpacity>

                <AnnouncementBanner
                    locationName={locationName}
                    locationDetail={locationDetail}
                    onPress={openAnnouncementVendor}
                />

                <View className="mt-2">
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const offset = e.nativeEvent.contentOffset.x;
                            setBannerIndex(Math.round(offset / heroCardWidth));
                        }}
                        scrollEventThrottle={16}
                    >
                        {displayBanners.map((banner, i) => (
                            <TouchableOpacity
                                key={i}
                                activeOpacity={0.9}
                                onPress={() => {
                                    if (banner.redirectLink) {
                                        navigation.navigate('Search', { initialSearch: banner.redirectLink });
                                    }
                                }}
                                className="w-min h-[150px] mx-4 rounded-2xl p-5 flex-row overflow-hidden"
                                style={{
                                    backgroundColor: banner.colors?.[0] || '#1565C0',
                                    width: heroCardWidth,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 5 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 12,
                                    elevation: 10,
                                }}
                            >
                                {banner.imageUrl ? (
                                    <Image source={{ uri: banner.imageUrl }} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, width: '100%', height: '100%', borderRadius: 16 }} resizeMode="cover" />
                                ) : null}
                                <View className="flex-1 justify-center" style={{ zIndex: 1, backgroundColor: banner.imageUrl ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: 8, padding: banner.imageUrl ? 8 : 0 }}>
                                    <Text className="text-white/80 text-[13px] font-medium">{banner.title}</Text>
                                    <Text className="text-white text-lg font-extrabold mt-1 max-w-[90%] leading-snug">
                                        {banner.subtitle}
                                    </Text>
                                    <View className="mt-3 bg-white self-start px-3.5 py-1.5 rounded-full shadow-sm">
                                        <Text className="text-gray-900 text-xs font-bold tracking-wide">
                                            {banner.buttonText}
                                        </Text>
                                    </View>
                                </View>
                                {!banner.imageUrl ? (
                                    <View className="w-20 h-24 bg-white/20 rounded-xl items-center justify-center">
                                        <MaterialIcons name={banner.icon || 'cleaning-services' as any} size={40} color="rgba(255,255,255,0.8)" />
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View className="flex-row justify-center mt-3">
                        {displayBanners.map((_, i) => (
                            <View
                                key={i}
                                className={`h-2 mx-1 rounded-full ${i === bannerIndex ? 'w-5 bg-[#7B2FF7]' : 'w-2 bg-gray-300'}`}
                            />
                        ))}
                    </View>
                </View>

                <View className="px-4 mt-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-900">Categories</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                            <Text className="text-[13px] text-[#007BFF] font-semibold">View all</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row flex-wrap justify-between">
                        {visibleCategories.map((cat, i) => (
                            <TouchableOpacity
                                key={cat.id ?? i}
                                className="w-[22%] mb-4 items-center"
                                onPress={() => navigation.navigate('Search', { initialSearch: cat.label })}
                            >
                                <ShadowIconBox icon={cat.icon} color={cat.color} />
                                <Text className="text-xs font-medium text-gray-900 mt-2 text-center">
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="mt-4 mb-8">
                    <View className="px-4 flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-900">
                            Services Nearby
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                            <Text className="text-[13px] text-[#B947D5] font-semibold">View All ›</Text>
                        </TouchableOpacity>
                    </View>

                    {nearbyServices.length === 0 ? (
                        <View className="mx-4 bg-white rounded-2xl p-5">
                            <Text className="text-sm font-semibold text-gray-900">Nearby services will appear here</Text>
                            <Text className="text-xs text-gray-500 mt-2">
                                Turn on location or refresh the location at the top to sort vendors by distance.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingLeft: 16, paddingRight: 4 }}
                        >
                            {nearbyServices.map((service, i) => {
                                const meta = getServiceMeta(`${service.categoryName} ${service.serviceName}`);
                                return (
                                    <TouchableOpacity
                                        key={`${service.serviceId}-${i}`}
                                        onPress={() =>
                                            navigation.navigate('VendorProfile', {
                                                vendorName: service.vendorName,
                                                rating: service.rating || 4.5,
                                                type: service.categoryName,
                                                serviceId: service.serviceId,
                                                vendorId: service.vendorId,
                                                price: service.priceValue,
                                            })
                                        }
                                        className="w-64 mr-3 p-4 bg-white rounded-2xl"
                                        style={{
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.12,
                                            shadowRadius: 12,
                                            elevation: 8,
                                        }}
                                    >
                                        <View className="flex-row items-start">
                                            <View
                                                className="w-14 h-14 rounded-2xl items-center justify-center overflow-hidden"
                                                style={{ backgroundColor: service.color + '18' }}
                                            >
                                                {service.imageUrl ? (
                                                     <Image source={{uri: service.imageUrl}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                                                ) : (
                                                    <MaterialIcons name={meta.icon as any} size={28} color={meta.color} />
                                                )}
                                            </View>
                                            <View className="ml-3 flex-1">
                                                <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
                                                    {service.serviceName}
                                                </Text>
                                                <Text className="text-xs font-semibold mt-1" style={{ color: meta.color }}>
                                                    {service.categoryName}
                                                </Text>
                                                <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                                                    {service.vendorName}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center mt-4">
                                            <Ionicons name="navigate-outline" size={14} color="#6B7280" />
                                            <Text className="text-xs text-gray-600 ml-1">
                                                {formatDistance(service.distanceKm)}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-center mt-2">
                                            <Ionicons name="star" size={14} color="#F59E0B" />
                                            <Text className="text-xs text-gray-600 ml-1">
                                                {service.rating ? service.rating.toFixed(1) : 'New'} {service.reviewCount ? `(${service.reviewCount})` : ''}
                                            </Text>
                                        </View>

                                        <Text className="text-[12px] text-gray-700 font-semibold mt-3">
                                            {service.priceLabel}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                <View className="mt-2 mb-8">
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const offset = e.nativeEvent.contentOffset.x;
                            setBottomBannerIndex(Math.round(offset / heroCardWidth));
                        }}
                        scrollEventThrottle={16}
                    >
                        {displayBottomBanners.map((banner, i) => (
                            <TouchableOpacity
                                key={i}
                                activeOpacity={0.9}
                                onPress={() => {
                                    if (banner.redirectLink) {
                                        navigation.navigate('Search', { initialSearch: banner.redirectLink });
                                    }
                                }}
                                className="w-min h-[150px] mx-4 rounded-2xl p-5 flex-row overflow-hidden shadow-lg"
                                style={{
                                    backgroundColor: banner.colors?.[0] || '#7E57C2',
                                    width: heroCardWidth,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 5 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 12,
                                    elevation: 10,
                                }}
                            >
                                {banner.imageUrl ? (
                                    <Image source={{ uri: banner.imageUrl }} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, width: '100%', height: '100%', borderRadius: 16 }} resizeMode="cover" />
                                ) : null}
                                <View className="flex-1 justify-center" style={{ zIndex: 1, backgroundColor: banner.imageUrl ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: 8, padding: banner.imageUrl ? 8 : 0 }}>
                                    <Text className="text-white/80 text-[13px] font-medium">{banner.title}</Text>
                                    <Text className="text-white text-lg font-extrabold mt-1 max-w-[90%] leading-snug">
                                        {banner.subtitle}
                                    </Text>
                                    <View className="mt-3 bg-white self-start px-3.5 py-1.5 rounded-full shadow-sm">
                                        <Text className="text-gray-900 text-xs font-bold tracking-wide">
                                            {banner.buttonText}
                                        </Text>
                                    </View>
                                </View>
                                {!banner.imageUrl ? (
                                    <View className="w-20 h-24 bg-white/20 rounded-xl items-center justify-center">
                                        <MaterialIcons name={banner.icon || 'cleaning-services' as any} size={40} color="rgba(255,255,255,0.8)" />
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View className="flex-row justify-center mt-4">
                        {displayBottomBanners.map((_, i) => (
                            <View
                                key={i}
                                className={`h-2 mx-1 rounded-full ${i === bottomBannerIndex ? 'w-5 bg-[#7B2FF7]' : 'w-2 bg-gray-300'}`}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;
