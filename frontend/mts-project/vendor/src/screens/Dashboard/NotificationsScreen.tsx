import { useCallback, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { notificationService } from '../../services/api';

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const response = await notificationService.getMyNotifications(25);
            setNotifications(response.data?.data?.notifications || []);
        } catch (error) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
            notificationService.markAllRead().catch(() => null);
        }, [fetchNotifications])
    );

    return (
        <SafeAreaView
            className="flex-1 bg-background"
            style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <View className="bg-card px-5 py-4 flex-row items-center border-b border-border">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-textPrimary">Updates</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006AE8" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => String(item.notification_id)}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <View className="bg-card border border-border rounded-2xl p-4 mb-3">
                            <View className="flex-row items-start justify-between">
                                <View className="flex-1 pr-3">
                                    <Text className="text-textPrimary font-semibold">{item.title}</Text>
                                    <Text className="text-textSecondary text-sm mt-2">{item.message}</Text>
                                    <Text className="text-textSecondary text-xs mt-3">
                                        {new Date(item.created_at).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                                {!item.is_read ? (
                                    <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                                ) : null}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="pt-20 items-center">
                            <MaterialCommunityIcons name="bell-outline" size={42} color="#93C5FD" />
                            <Text className="mt-3 text-base font-semibold text-textPrimary">No updates yet</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
