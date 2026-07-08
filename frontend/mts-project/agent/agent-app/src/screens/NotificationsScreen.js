import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, ArrowLeft } from 'lucide-react-native';
import { notificationService } from '../services/api';

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

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
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color="#0f172a" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Updates</Text>
                <View style={styles.headerSpacer} />
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item, index) => String(item.notification_id || index)}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.bellCircle}>
                                    <Bell color="#2563eb" size={18} />
                                </View>
                                {!item.is_read ? <View style={styles.unreadDot} /> : null}
                            </View>
                            <Text style={styles.cardTitle}>{item.title || 'Update'}</Text>
                            <Text style={styles.cardMessage}>{item.message || 'You have a new update.'}</Text>
                            <Text style={styles.cardTime}>
                                {item.created_at
                                    ? new Date(item.created_at).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : ''}
                            </Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Bell color="#93c5fd" size={44} />
                            <Text style={styles.emptyTitle}>No updates yet</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSpacer: {
        width: 40,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    bellCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    cardMessage: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginTop: 6,
    },
    cardTime: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 10,
    },
    emptyState: {
        paddingTop: 90,
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
});
