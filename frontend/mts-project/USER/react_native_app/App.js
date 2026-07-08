import '@expo/metro-runtime';
import "./global.css";
import { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import VendorProfileScreen from './src/screens/VendorProfileScreen';
import TermsScreen from './src/screens/TermsScreen';
import AboutScreen from './src/screens/AboutScreen';
import SavedAddressesScreen from './src/screens/SavedAddressesScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import BookingConfirmScreen from './src/screens/BookingConfirmScreen';
import RateReviewScreen from './src/screens/RateReviewScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import {
  addLocalNotificationResponseListener,
  getInitialNotificationData,
  initializeLocalNotifications,
} from './src/utils/localNotifications';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
let pendingNotificationData = null;

function openNotificationTarget(data = {}) {
  const tabScreens = ['Home', 'Search', 'Bookings', 'Services', 'Orders', 'Reels', 'Notifications', 'Profile'];
  const stackScreens = [
    'VendorProfile',
    'SavedAddresses',
    'PaymentMethods',
    'Tracking',
    'EditProfile',
    'HelpSupport',
    'BookingConfirm',
    'RateReview',
    'Notifications',
  ];
  const requestedScreen = typeof data.screen === 'string' ? data.screen : 'Notifications';
  const params = data.params && typeof data.params === 'object' ? data.params : undefined;

  if (!navigationRef.isReady()) {
    pendingNotificationData = data;
    return;
  }

  if (tabScreens.includes(requestedScreen)) {
    const normalizedScreen =
      requestedScreen === 'Services' ? 'Search' :
      requestedScreen === 'Orders' ? 'Bookings' :
      requestedScreen;
    navigationRef.navigate('Main', { screen: normalizedScreen, params });
    return;
  }

  if (requestedScreen === 'Main') {
    navigationRef.navigate('Main', params);
    return;
  }

  navigationRef.navigate(stackScreens.includes(requestedScreen) ? requestedScreen : 'Notifications', params);
}

export default function App() {
  useEffect(() => {
    initializeLocalNotifications();

    const initialNotificationData = getInitialNotificationData();
    if (initialNotificationData) {
      pendingNotificationData = initialNotificationData;
    }

    const subscription = addLocalNotificationResponseListener(openNotificationTarget);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (pendingNotificationData) {
            const data = pendingNotificationData;
            pendingNotificationData = null;
            openNotificationTarget(data);
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="VendorProfile" component={VendorProfileScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
          <Stack.Screen name="RateReview" component={RateReviewScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
