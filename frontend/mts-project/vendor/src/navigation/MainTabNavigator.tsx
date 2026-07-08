import { useCallback, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/Dashboard/HomeScreen';
import OrdersScreen from '../screens/Dashboard/OrdersScreen';
import ProfileStack from './ProfileStack';
import ManageServicesScreen from '../screens/Dashboard/ManageServicesScreen';
import NotificationsScreen from '../screens/Dashboard/NotificationsScreen';
import { notificationService } from '../services/api';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getMyNotifications(5);
      setUnreadCount(Number(response.data?.data?.unreadCount || 0));
    } catch (error) {
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#006AE8',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="ManageService"
        component={ManageServicesScreen}
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="briefcase-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Updates',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bell-outline" size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tab.Screen
        name="ProfileMain"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
