import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Share,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import api from '../utils/api';

const REELS_PAGE_SIZE = 6;

const getReelVideoUrl = (reel: any) =>
  reel?.video_url || reel?.videoUrl || reel?.url || reel?.media_url || reel?.mediaUrl || '';

const getReelId = (reel: any) => reel?.id ?? reel?.reel_id ?? reel?.reelId;

const getReelViewCount = (reel: any) =>
  reel?.view_count ?? reel?.views ?? reel?.viewCount ?? reel?.watch_count ?? reel?.watchCount ?? 0;

const formatCompactCount = (value: any) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0';
  }

  if (numeric >= 1000000) {
    const compact = numeric / 1000000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}M`;
  }

  if (numeric >= 1000) {
    const compact = numeric / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(Math.round(numeric));
};

const mergeUniqueReels = (current: any[], incoming: any[]) => {
  const seen = new Set(current.map((item) => String(item.id)));
  const merged = [...current];

  incoming.forEach((item) => {
    const key = String(item.id);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return merged;
};

const ReelFeedItem = React.memo(function ReelFeedItem({
  reel,
  isActive,
  isScreenFocused,
  height,
  navigation,
  onShare,
  onView,
  onClose,
}: {
  reel: any;
  isActive: boolean;
  isScreenFocused: boolean;
  height: number;
  navigation: any;
  onShare: (reel: any) => void;
  onView?: (reel: any) => void;
  onClose?: () => void;
}) {
  const [isMuted, setIsMuted] = useState(true);

  const vendorName = reel.vendor?.business_name || reel.vendor?.user?.full_name || 'Vendor';
  const serviceName = reel.vendor?.category?.category_name || reel.caption || 'Service';
  const description = reel.caption || 'Watch this service reel on MTS India';

  const player = useVideoPlayer(
    { uri: getReelVideoUrl(reel) },
    (videoPlayer) => {
      videoPlayer.loop = true;
      videoPlayer.muted = true;
      videoPlayer.showNowPlayingNotification = false;
    }
  );

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isActive && isScreenFocused) {
      player.play();
      onView?.(reel);
      return;
    }

    player.pause();
  }, [isActive, isScreenFocused, onView, player, reel]);

  const openVendorProfile = () => {
    navigation.navigate('VendorProfile', {
      vendorId: reel.vendor?.vendor_id,
      vendorName,
      type: serviceName,
      rating: 4.8,
    });
  };

  const openWhatsApp = () => {
    const rawPhone =
      reel.vendor?.whatsapp_number ||
      reel.vendor?.mobile ||
      reel.vendor?.user?.mobile ||
      reel.phone ||
      reel.vendor_phone;

    if (!rawPhone) {
      Alert.alert('Contact Unavailable', 'Vendor WhatsApp contact details are not available.');
      return;
    }

    let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
      }
    } else {
      cleaned = cleaned.substring(1);
    }

    const message = encodeURIComponent(
      `Hi ${vendorName}! I am reaching out regarding your service reel "${serviceName}" on MTS India.`
    );
    const whatsappUrl = `whatsapp://send?phone=${cleaned}&text=${message}`;
    const webWhatsappUrl = `https://wa.me/${cleaned}?text=${message}`;

    if (Platform.OS === 'web') {
      window.open(webWhatsappUrl, '_blank');
      return;
    }

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          return Linking.openURL(webWhatsappUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webWhatsappUrl).catch(() => {
          Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
        });
      });
  };

  return (
    <View style={{ height, width: '100%', backgroundColor: '#000000' }}>
      <VideoView
        player={player}
        style={{ position: 'absolute', inset: 0 as any, width: '100%', height: '100%' }}
        contentFit="cover"
        allowsFullscreen={false}
        nativeControls={false}
      />

      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.05)',
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 54,
          paddingHorizontal: 12,
          paddingBottom: 24,
          backgroundColor: 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {onClose ? (
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.42)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={openVendorProfile}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#007BFF',
              borderWidth: 1,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
              {vendorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
              {vendorName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }} numberOfLines={1}>
              {serviceName}
            </Text>
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.85)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Visit</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 120,
          paddingBottom: 28,
          backgroundColor: 'transparent',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 8, paddingRight: 72 }}>
          {serviceName}
        </Text>
        <Text
          style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 20, marginBottom: 16, paddingRight: 72 }}
          numberOfLines={3}
        >
          {description}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="play" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700', marginLeft: 6 }}>
            {formatCompactCount(getReelViewCount(reel))} views
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            alignSelf: 'flex-start',
            borderRadius: 999,
            paddingHorizontal: 18,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={openVendorProfile}
        >
          <MaterialIcons name="bolt" size={18} color="#007BFF" />
          <Text style={{ color: '#007BFF', fontWeight: '900', marginLeft: 6, fontSize: 14 }}>BOOK NOW</Text>
        </TouchableOpacity>
      </View>

      <View style={{ position: 'absolute', right: 12, bottom: 110, alignItems: 'center' }}>
        <TouchableOpacity
          style={{ alignItems: 'center', marginBottom: 18 }}
          onPress={() => setIsMuted((prev) => !prev)}
        >
          <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={30} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
            {isMuted ? 'Muted' : 'Sound'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', marginBottom: 18 }} onPress={() => onShare(reel)}>
          <Ionicons name="arrow-redo-outline" size={30} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginTop: 4 }}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center' }} onPress={openWhatsApp}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#25D366',
            }}
          >
            <Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ReelsScreen = ({ navigation }: { navigation: any }) => {
  const isFocused = useIsFocused();
  const [currentPage, setCurrentPage] = useState(0);
  const [containerHeight, setContainerHeight] = useState(Dimensions.get('window').height);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const viewedReelIds = useRef(new Set<string>());

  const fetchReels = useCallback(async ({ pageToLoad = 1, append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get('/reels', {
        params: {
          page: pageToLoad,
          limit: REELS_PAGE_SIZE,
        },
      });
      const nextReels = res.data.data || [];
      const meta = res.data.meta || {};

      if (res.data.success) {
        setReels((current) => (append ? mergeUniqueReels(current, nextReels) : nextReels));
        setPage(meta.page || pageToLoad);
        setHasMore(Boolean(meta.hasMore));
      }
    } catch (e) {
      console.warn('Failed to fetch reels:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    fetchReels({ pageToLoad: page + 1, append: true });
  }, [fetchReels, hasMore, loading, loadingMore, page]);

  const handleShare = async (reel: any) => {
    const vendorName = reel.vendor?.business_name || reel.vendor?.user?.full_name || 'Vendor';
    const serviceName = reel.vendor?.category?.category_name || reel.caption || 'service';

    try {
      await Share.share({
        message: `Check out this ${serviceName} reel by ${vendorName} on MTS India: ${getReelVideoUrl(reel)}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReelView = useCallback(async (reel: any) => {
    const reelId = getReelId(reel);
    if (!reelId) {
      return;
    }

    const key = String(reelId);
    if (viewedReelIds.current.has(key)) {
      return;
    }

    viewedReelIds.current.add(key);

    try {
      const response = await api.post(`/reels/${reelId}/view`);
      const previousCount = Number(getReelViewCount(reel)) || 0;
      const returnedCount = Number(
        response.data?.data?.view_count ??
        response.data?.data?.views ??
        response.data?.view_count ??
        response.data?.views
      );
      const nextCount = Number.isFinite(returnedCount) ? returnedCount : previousCount + 1;

      setReels((current) =>
        current.map((item) =>
          String(getReelId(item)) === key
            ? { ...item, view_count: nextCount, views: nextCount, viewCount: nextCount }
            : item
        )
      );
    } catch (error) {
      console.warn('Failed to update reel view count:', error);
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const firstVisible = viewableItems.find((item) => typeof item.index === 'number');
    if (typeof firstVisible?.index === 'number') {
      setCurrentPage(firstVisible.index);
    }
  });

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<any>) => (
      <ReelFeedItem
        reel={item}
        isActive={index === currentPage}
        isScreenFocused={isFocused}
        height={containerHeight}
        navigation={navigation}
        onShare={handleShare}
        onView={handleReelView}
      />
    ),
    [containerHeight, currentPage, handleReelView, isFocused, navigation]
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: '#050505' }}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : reels.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="videocam-outline" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, marginTop: 16, fontWeight: '700' }}>
            No reels available yet
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={reels}
            keyExtractor={(item, index) => String(item?.id || index)}
            renderItem={renderItem}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            snapToInterval={containerHeight}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            scrollEventThrottle={16}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={Platform.OS !== 'web'}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ height: containerHeight, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#007BFF" />
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
};

export default ReelsScreen;
