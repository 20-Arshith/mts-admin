import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShadowIconBox from '../components/ShadowIconBox';
import api, { clearUserSession } from '../utils/api';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState([
    { value: '0', label: 'Bookings', icon: 'calendar-today', color: '#007BFF' },
    { value: '0', label: 'Completed', icon: 'task-alt', color: '#10B981' },
    { value: '0', label: 'Active', icon: 'pending-actions', color: '#F59E0B' },
  ]);

  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        try {
          const [profileRes, bookingsRes] = await Promise.all([
            api.get('/users/profile'),
            api.get('/bookings/my'),
          ]);

          setProfile(profileRes.data.data);

          const bookings = bookingsRes.data?.data || [];
          const completedCount = bookings.filter((item) => item.booking_status === 'completed').length;
          const activeCount = bookings.filter((item) => ['pending', 'accepted', 'confirmed'].includes(item.booking_status)).length;

          setStats([
            { value: String(bookings.length), label: 'Bookings', icon: 'calendar-today', color: '#007BFF' },
            { value: String(completedCount), label: 'Completed', icon: 'task-alt', color: '#10B981' },
            { value: String(activeCount), label: 'Active', icon: 'pending-actions', color: '#F59E0B' },
          ]);
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      };

      fetchProfile();
    }, [])
  );

  const menuSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          desc: 'Update your personal info',
          color: '#3B82F6',
        },
        {
          icon: 'location-on',
          label: 'Saved Addresses',
          desc: 'Home, Office & more',
          color: '#10B981',
        },
        {
          icon: 'payment',
          label: 'Payment Methods',
          desc: 'UPI, Cards & Wallets',
          color: '#8B5CF6',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'headset-mic',
          label: 'Help & Support',
          desc: '24/7 customer care',
          color: '#F59E0B',
        },
        {
          icon: 'star-outline',
          label: 'Rate the App',
          desc: 'Love MTS India? Tell us!',
          color: '#EAB308',
        },
        {
          icon: 'share',
          label: 'Refer & Earn',
          desc: 'Get ₹100 for every referral',
          color: '#F97316',
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'privacy-tip', label: 'Privacy Policy', desc: '', color: '#64748B' },
        { icon: 'description', label: 'Terms of Service', desc: '', color: '#64748B' },
      ],
    },
  ];

  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F6FA]"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="bg-white pt-6 pb-6 px-5 border-b border-gray-100">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} className="mr-3" />
            <Text className="text-gray-900 text-[22px] font-bold">My Profile</Text>
          </View>

          <View className="flex-row items-center">
            <View>
              <View className="p-0.5 border-2 border-white rounded-full">
                <View className="w-[76px] h-[76px] bg-[#E6F0FF] rounded-full items-center justify-center">
                  <Ionicons name="person" size={42} color="#007BFF" />
                </View>
              </View>
              <View className="absolute bottom-1 right-1 bg-[#F28522] p-1.5 rounded-full border-2 border-white">
                <Ionicons name="camera" size={12} color="white" />
              </View>
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-gray-900 text-xl font-bold">
                {profile?.full_name === 'User' || !profile?.full_name ? 'MTS User' : profile.full_name}
              </Text>
              <Text className="text-gray-500 text-[13px] mt-1">{profile?.mobile || '+91 -'}</Text>
              <Text className="text-gray-500 text-xs mt-1">{profile?.email || 'No email added'}</Text>
              {profile?.profile?.address ? (
                <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
                  {profile.profile.address}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View className="flex-row px-5 -mt-6 mb-5 gap-4">
          {stats.map((item, index) => (
            <TouchableOpacity
              key={`${item.label}-${index}`}
              onPress={() => navigation.navigate('Bookings')}
              className="flex-1 bg-white rounded-[16px] py-3 items-center border border-gray-50/50"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.08,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <ShadowIconBox icon={item.icon} color={item.color} size={40} iconSize={18} radius={12} />
              <Text className="text-[16px] font-extrabold mt-2.5 text-gray-900 tracking-tight">
                {item.value}
              </Text>
              <Text className="text-[11px] text-gray-500 mt-1 font-medium">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-4">
          {menuSections.map((section, index) => (
            <View key={`${section.title}-${index}`} className="mb-4">
              <Text className="text-[13px] font-semibold text-gray-500 tracking-wide mb-2">
                {section.title}
              </Text>
              <View
                className="bg-white rounded-[14px]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {section.items.map((item, itemIndex) => (
                  <View key={`${item.label}-${itemIndex}`}>
                    <TouchableOpacity
                      className="flex-row items-center px-4 py-3"
                      onPress={() => {
                        if (item.label === 'Edit Profile') navigation.navigate('EditProfile');
                        else if (item.label === 'Saved Addresses') navigation.navigate('SavedAddresses');
                        else if (item.label === 'Payment Methods') navigation.navigate('PaymentMethods');
                        else if (section.title === 'Legal') navigation.navigate('Terms');
                        else if (item.label === 'Help & Support') navigation.navigate('HelpSupport');
                        else alert('Dummy Action triggered!');
                      }}
                    >
                      <ShadowIconBox icon={item.icon} color={item.color || '#007BFF'} size={40} iconSize={18} radius={10} />
                      <View className="flex-1 ml-3">
                        <Text className="text-sm font-semibold text-gray-800">{item.label}</Text>
                        {item.desc ? (
                          <Text className="text-xs text-gray-400 mt-0.5">{item.desc}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    {itemIndex < section.items.length - 1 && (
                      <View className="h-[1px] bg-gray-100 ml-14 mr-4" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View className="px-4 mb-8 mt-2">
          <TouchableOpacity
            onPress={async () => {
              await clearUserSession();
              navigation.replace('Login');
            }}
            className="w-full border border-red-700 rounded-[14px] py-3.5 flex-row items-center justify-center"
          >
            <Ionicons name="log-out" size={20} color="#C62828" />
            <Text className="text-[#C62828] font-semibold text-[15px] ml-2">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
