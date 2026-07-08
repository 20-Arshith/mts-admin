import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import ReelsScreen from './ReelsScreen';
import BookingsScreen from './BookingsScreen';
import ProfileScreen from './ProfileScreen';
import NotificationsScreen from './NotificationsScreen';
import { notificationService } from '../utils/api';

const Tab = createBottomTabNavigator();

const MainScreen = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getMyNotifications(5);
      setUnreadCount(Number(response.data?.data?.unreadCount || 0));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      const intervalId = setInterval(fetchUnreadCount, 15000);
      return () => clearInterval(intervalId);
    }, [fetchUnreadCount])
  );

  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Reels') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Bookings') {
            return <MaterialIcons name="calendar-today" size={size} color={color} />;
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
      />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Updates',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainScreen;
