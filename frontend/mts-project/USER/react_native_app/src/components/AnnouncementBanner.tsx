import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Announcement } from '../types/announcement';
import { useAnnouncements } from '../hooks/useAnnouncements';

const ROTATION_INTERVAL_MS = 6000;
const SLIDE_DURATION_MS = 360;

const getAnnouncementKey = (announcement: Announcement, index: number) =>
  String(announcement.announcement_id ?? `${announcement.message}-${index}`);

const AnnouncementCard = ({
  announcement,
  width,
}: {
  announcement: Announcement;
  width: number;
}) => {
  const hasImage = Boolean(announcement.image_url);
  const message = announcement.message || 'Important service update';

  return (
    <View
      style={{
        width,
        minHeight: hasImage ? 126 : 82,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1E293B',
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: announcement.image_url || '' }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : null}

      <View
        style={{
          flex: 1,
          minHeight: hasImage ? 126 : 82,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: hasImage ? 'rgba(2,6,23,0.64)' : 'transparent',
          justifyContent: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: 'rgba(59,130,246,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Ionicons name="megaphone-outline" size={15} color="#BFDBFE" />
          </View>
          <Text style={{ color: '#BFDBFE', fontSize: 12, fontWeight: '800' }}>
            Vendor update
          </Text>
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            lineHeight: 21,
            fontWeight: '800',
            paddingRight: 8,
          }}
          numberOfLines={hasImage ? 3 : 2}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

const AnnouncementBanner = ({
  locationName,
  locationDetail,
  onPress,
}: {
  locationName?: string | null;
  locationDetail?: string | null;
  onPress?: (announcement: Announcement) => void;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { announcements, loading, error } = useAnnouncements({ locationName, locationDetail });
  const [activeIndex, setActiveIndex] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const cardWidth = Math.min(Math.max(screenWidth - 32, 288), 720);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcements.length]);

  useEffect(() => {
    if (announcements.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -18,
          duration: SLIDE_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: SLIDE_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setActiveIndex((current) => (current + 1) % announcements.length);
        slideX.setValue(18);
        Animated.parallel([
          Animated.timing(slideX, {
            toValue: 0,
            duration: SLIDE_DURATION_MS,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: SLIDE_DURATION_MS,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [announcements.length, opacity, slideX]);

  if (loading && announcements.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
        <View
          style={{
            width: cardWidth,
            minHeight: 78,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <ActivityIndicator size="small" color="#007BFF" />
        </View>
      </View>
    );
  }

  if (error || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[activeIndex] || announcements[0];

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 8, alignItems: 'center' }}>
      <TouchableOpacity
        activeOpacity={onPress ? 0.9 : 1}
        onPress={() => onPress?.(currentAnnouncement)}
        disabled={!onPress}
      >
        <Animated.View style={{ opacity, transform: [{ translateX: slideX }] }}>
          <AnnouncementCard announcement={currentAnnouncement} width={cardWidth} />
        </Animated.View>
      </TouchableOpacity>

      {announcements.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 9 }}>
          {announcements.map((announcement, index) => (
            <View
              key={getAnnouncementKey(announcement, index)}
              style={{
                width: index === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 999,
                marginHorizontal: 3,
                backgroundColor: index === activeIndex ? '#007BFF' : '#CBD5E1',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default AnnouncementBanner;
