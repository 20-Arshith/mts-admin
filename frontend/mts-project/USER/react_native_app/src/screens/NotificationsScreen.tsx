import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api, { announcementService, notificationService } from '../utils/api';
import { Announcement } from '../types/announcement';
import { resolveAnnouncementLocation } from '../hooks/useAnnouncements';

type BellTab = 'all' | 'updates' | 'notifications';
type FeedItem =
  | { id: string; type: 'update'; createdAt?: string | null; data: Announcement }
  | { id: string; type: 'notification'; createdAt?: string | null; data: any };

const TABS: Array<{ key: BellTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'updates', label: 'Updates' },
  { key: 'notifications', label: 'Alerts' },
];

const formatTimestamp = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  const format = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const startLabel = format(start);
  const endLabel = format(end);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `From ${startLabel}`;
  if (endLabel) return `Until ${endLabel}`;
  return '';
};

const getSortTime = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const NotificationBanner = ({ item }: { item: any }) => {
  const title = String(item.title || '').toLowerCase();
  const message = String(item.message || '').toLowerCase();
  const isOrder = Boolean(item.booking_id) || title.includes('order') || title.includes('booking') || message.includes('booking');

  return (
    <LinearGradient
      colors={isOrder ? ['#DFF4FF', '#BFE6FF'] : ['#1A2456', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: 132,
        paddingHorizontal: 22,
        paddingVertical: 18,
        justifyContent: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text
            style={{
              color: isOrder ? '#0D47A1' : '#FDE047',
              fontSize: 13,
              fontWeight: '900',
              textTransform: 'uppercase',
            }}
          >
            {isOrder ? 'Order update' : 'New alert'}
          </Text>
          <Text
            style={{
              color: isOrder ? '#0D47A1' : '#FFFFFF',
              fontSize: 24,
              lineHeight: 29,
              fontWeight: '900',
              marginTop: 7,
            }}
            numberOfLines={2}
          >
            {item.title || 'Update'}
          </Text>
        </View>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: isOrder ? '#1E88E5' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isOrder ? 'bicycle-outline' : 'notifications-outline'}
            size={38}
            color={isOrder ? '#FFFFFF' : '#4F46E5'}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const UpdateBanner = ({ item }: { item: Announcement }) => {
  if (item.image_url) {
    return <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 146 }} resizeMode="cover" />;
  }

  return (
    <LinearGradient
      colors={['#FFE4EC', '#FFD3DC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: 146,
        paddingHorizontal: 22,
        paddingVertical: 18,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#BE185D', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' }}>
        Vendor broadcast
      </Text>
      <Text style={{ color: '#9D174D', fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 8 }} numberOfLines={2}>
        New Update
      </Text>
      <View
        style={{
          position: 'absolute',
          right: 24,
          top: 30,
          width: 82,
          height: 82,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.72)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="megaphone-outline" size={42} color="#C026D3" />
      </View>
    </LinearGradient>
  );
};

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<BellTab>('all');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [updates, setUpdates] = useState<Announcement[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item?.is_read).length,
    [notifications]
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const updateItems: FeedItem[] = updates.map((item, index) => ({
      id: `update-${item.announcement_id || index}`,
      type: 'update',
      createdAt: item.created_at || item.start_at,
      data: item,
    }));

    const notificationItems: FeedItem[] = notifications.map((item, index) => ({
      id: `notification-${item.notification_id || index}`,
      type: 'notification',
      createdAt: item.created_at,
      data: item,
    }));

    return [...updateItems, ...notificationItems].sort(
      (a, b) => getSortTime(b.createdAt) - getSortTime(a.createdAt)
    );
  }, [notifications, updates]);

  const visibleItems = useMemo(() => {
    if (activeTab === 'updates') {
      return feedItems.filter((item) => item.type === 'update');
    }

    if (activeTab === 'notifications') {
      return feedItems.filter((item) => item.type === 'notification');
    }

    return feedItems;
  }, [activeTab, feedItems]);

  const fetchUpdates = useCallback(async () => {
    let locationIdentifier = '';

    try {
      const profileResponse = await api.get('/users/profile');
      const profile = profileResponse.data?.data?.profile;
      locationIdentifier = resolveAnnouncementLocation(profile?.address, profile?.address);
    } catch {
      locationIdentifier = '';
    }

    try {
      const response = await announcementService.getActive(locationIdentifier);
      const items = Array.isArray(response.data?.data) ? response.data.data : [];
      setUpdates(items.filter((item: Announcement) => item?.message));
    } catch {
      setUpdates([]);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getMyNotifications(25);
      setNotifications(response.data?.data?.notifications || []);
    } catch {
      setNotifications([]);
    }
  }, []);

  const refreshBell = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchNotifications(), fetchUpdates()]);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, fetchUpdates]);

  useFocusEffect(
    useCallback(() => {
      refreshBell();
      notificationService.markAllRead().catch(() => null);
    }, [refreshBell])
  );

  const openUpdate = (announcement: Announcement) => {
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

  const renderTab = ({ key, label }: { key: BellTab; label: string }) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setActiveTab(key)}
        style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, alignItems: 'center' }}
      >
        <Text style={{ color: isActive ? '#6D28D9' : '#6B7280', fontSize: 16, fontWeight: '800' }}>
          {label}
        </Text>
        <View
          style={{
            height: 4,
            width: isActive ? 82 : 0,
            borderRadius: 999,
            backgroundColor: '#6D28D9',
            marginTop: 12,
          }}
        />
      </TouchableOpacity>
    );
  };

  const renderFeedCard = ({ item }: { item: FeedItem }) => {
    if (item.type === 'update') {
      const update = item.data;
      const dateRange = formatDateRange(update.start_at, update.expires_at);

      return (
        <TouchableOpacity
          activeOpacity={update.vendor_id ? 0.88 : 1}
          onPress={() => openUpdate(update)}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            marginBottom: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#EEF2F7',
            shadowColor: '#111827',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <UpdateBanner item={update} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '900', color: '#111827' }} numberOfLines={2}>
                  Vendor Broadcast
                </Text>
                <Text style={{ fontSize: 15, color: '#4B5563', marginTop: 6, lineHeight: 21 }} numberOfLines={3}>
                  {update.message}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>
                  {dateRange || formatTimestamp(update.created_at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={28} color="#6D28D9" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const notification = item.data;

    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          marginBottom: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#EEF2F7',
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <NotificationBanner item={notification} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 18, lineHeight: 23, fontWeight: '900', color: '#111827' }} numberOfLines={2}>
                  {notification.title || 'Update'}
                </Text>
                {!notification.is_read ? (
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#6D28D9', marginLeft: 8 }} />
                ) : null}
              </View>
              <Text style={{ fontSize: 15, color: '#4B5563', marginTop: 6, lineHeight: 21 }} numberOfLines={2}>
                {notification.message || 'You have a new update.'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>
                {formatTimestamp(notification.created_at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={28} color="#6D28D9" />
          </View>
        </View>
      </View>
    );
  };

  const emptyLabel = activeTab === 'updates'
    ? 'No updates yet'
    : activeTab === 'notifications'
      ? 'No alerts yet'
      : 'Nothing here yet';
  const emptyIcon = activeTab === 'updates' ? 'megaphone-outline' : 'notifications-outline';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <View
        style={{
          height: 68,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
          backgroundColor: '#FFFFFF',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 18, padding: 6 }}>
          <Ionicons name="chevron-back" size={34} color="#111111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 27, fontWeight: '900', color: '#111111' }}>Updates</Text>
        <TouchableOpacity
          onPress={refreshBell}
          style={{ position: 'absolute', right: 18, padding: 6 }}
          accessibilityLabel="Refresh updates"
        >
          <Ionicons name="settings-outline" size={30} color="#111111" />
        </TouchableOpacity>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#6D28D9" />
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, backgroundColor: '#FFFFFF' }}
          renderItem={renderFeedCard}
          ListEmptyComponent={
            <View style={{ paddingTop: 90, alignItems: 'center' }}>
              <Ionicons name={emptyIcon as any} size={46} color="#A78BFA" />
              <Text style={{ marginTop: 12, fontSize: 17, fontWeight: '800', color: '#111827' }}>{emptyLabel}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;
