import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Image, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { vendorService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncVendorLiveLocation } from '../../utils/location';

export default function ProfileScreen() {
    const navigation = useNavigation<any>();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncingLocation, setSyncingLocation] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {
                    const res = await vendorService.getProfile();
                    if (res.data?.data) {
                        setProfile(res.data.data);
                        await AsyncStorage.setItem('userData', JSON.stringify(res.data.data));
                    }

                    setSyncingLocation(true);
                    try {
                        const updatedProfile = await syncVendorLiveLocation();
                        if (updatedProfile) {
                            setProfile(updatedProfile);
                            await AsyncStorage.setItem('userData', JSON.stringify(updatedProfile));
                        }
                    } catch {
                        // Ignore location sync issues
                    } finally {
                        setSyncingLocation(false);
                    }
                } catch (err) {
                    console.error('Failed to fetch profile', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProfile();
        }, [])
    );

    const primaryMenuItems = [
        { id: '1', title: 'Edit Profile & Services', subtitle: 'Update info, logo, banner & services', icon: 'account-edit-outline', route: 'EditProfile', color: '#006AE8' },
        { id: '2', title: 'Manage Availability', subtitle: 'Set your working hours & days', icon: 'calendar-clock-outline', route: 'Availability', color: '#0EA5E9' },
        { id: '3', title: 'Portfolio Gallery', subtitle: 'Showcase photos of your previous work', icon: 'image-multiple-outline', route: 'Gallery', color: '#10B981' },
        { id: '4', title: 'Upload Service Reels', subtitle: 'Showcase your work (Max 1 min)', icon: 'video-outline', route: 'Reels', color: '#8B5CF6' },
    ];

    const secondaryMenuItems = [
        { id: '5', title: 'Payment & Earnings', icon: 'wallet-outline', route: null },
        { id: '6', title: 'Help & Support', icon: 'lifebuoy', route: null },
        { id: '7', title: 'Settings', icon: 'cog-outline', route: null },
    ];


    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#006AE8" />
            </View>
        );
    }

    const businessName = profile?.business_name || profile?.owner_name || 'My Business';
    const agentId = profile?.vendor_id ? `VND-${5000 + profile.vendor_id}` : 'VND-0000';
    const totalCompleted = profile?.total_completed ?? (profile?.bookings?.filter((b: any) => b.booking_status === 'completed').length || 0);
    const hasRatings = Number(profile?.review_count || 0) > 0 && profile?.rating !== null && profile?.rating !== undefined;
    const ratingLabel = hasRatings ? Number(profile.rating).toFixed(1) : 'No ratings yet';
    const reviewCount = Number(profile?.review_count || 0);

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            {/* Header Profile Section */}
            <View className="bg-primary px-6 pt-20 pb-12 rounded-b-[40px] items-center">
                <View className="w-28 h-28 rounded-full bg-white items-center justify-center p-1 shadow-lg mb-4">
                    <View className="w-full h-full bg-primary-soft rounded-full items-center justify-center border-4 border-white overflow-hidden">
                        {profile?.logo_url ? (
                            <Image
                                source={{ uri: profile.logo_url }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <MaterialCommunityIcons name="storefront-outline" size={48} color="#006AE8" />
                        )}
                    </View>
                </View>
                <Text className="text-2xl font-bold text-white tracking-wide">{businessName}</Text>
                <View className="bg-white/20 px-4 py-1.5 rounded-full mt-3">
                    <Text className="text-white text-sm font-medium">Vendor ID: {agentId}</Text>
                </View>
                <Text className="text-white/75 text-xs text-center mt-3 px-4">
                    {syncingLocation ? 'Refreshing live location...' : profile?.address || 'Live location not set yet'}
                </Text>
            </View>

            <View className="px-6 -mt-6">
                {/* Statistics Row */}
                <View className="bg-card rounded-2xl p-5 border border-border flex-row justify-around items-center shadow-sm mb-8">
                    <View className="items-center">
                        <Text className="text-xs text-textSecondary uppercase tracking-wider mb-1">Rating</Text>
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                            <Text className={`font-bold text-textPrimary ml-1 ${hasRatings ? 'text-xl' : 'text-sm'}`}>{ratingLabel}</Text>
                        </View>
                    </View>
                    <View className="w-[1px] h-10 bg-border" />
                    <View className="items-center">
                        <Text className="text-xs text-textSecondary uppercase tracking-wider mb-1">Reviews</Text>
                        <Text className="text-xl font-bold text-textPrimary">{reviewCount}</Text>
                    </View>
                    <View className="w-[1px] h-10 bg-border" />
                    <View className="items-center">
                        <Text className="text-xs text-textSecondary uppercase tracking-wider mb-1">Completed</Text>
                        <Text className="text-xl font-bold text-textPrimary">{totalCompleted}</Text>
                    </View>
                </View>

                <Text className="text-lg font-bold text-textPrimary mb-4">Vendor Central</Text>
                <View className="bg-card rounded-2xl border border-border mb-8 shadow-sm overflow-hidden">
                    {primaryMenuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            className={`flex-row items-center p-4 ${index !== primaryMenuItems.length - 1 ? 'border-b border-border' : ''}`}
                            onPress={() => item.route && navigation.navigate(item.route)}
                        >
                            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                                <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                            </View>
                            <View className="flex-1 ml-4 justify-center">
                                <Text className="text-base font-bold text-textPrimary mb-0.5">{item.title}</Text>
                                <Text className="text-xs text-textSecondary">{item.subtitle}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                <Text className="text-lg font-bold text-textPrimary mb-4">Preferences</Text>
                <View className="bg-card rounded-2xl border border-border mb-8 shadow-sm overflow-hidden">
                    {secondaryMenuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            className={`flex-row items-center p-4 ${index !== secondaryMenuItems.length - 1 ? 'border-b border-border' : ''}`}
                        >
                            <View className="w-10 h-10 rounded-full bg-background items-center justify-center">
                                <MaterialCommunityIcons name={item.icon as any} size={20} color="#64748B" />
                            </View>
                            <Text className="text-base font-medium text-textPrimary flex-1 ml-4">{item.title}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    className="flex-row items-center justify-center p-4 bg-red-50 rounded-2xl border border-red-100 mb-10"
                    onPress={async () => {
                        await AsyncStorage.removeItem('userToken');
                        await AsyncStorage.removeItem('userData');
                        
                        if (Platform.OS === 'web') {
                            window.location.reload();
                        } else {
                            const parentNav = navigation.getParent();
                            if (parentNav) {
                                parentNav.reset({ index: 0, routes: [{ name: 'Auth' }] });
                            } else {
                                navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                            }
                        }
                    }}
                >
                    <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
                    <Text className="text-error font-bold text-base ml-2">Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
