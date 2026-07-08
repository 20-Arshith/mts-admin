import React, { useEffect } from 'react';
import {
    View,
    Image,
    Text,
    ActivityIndicator,
    Platform,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api, { clearUserSession, getStoredUserToken } from '../utils/api';

const SplashScreen = ({ navigation }: any) => {
    const { width, height } = useWindowDimensions();
    const logoWidth = Math.min(width * 0.62, 260);
    const isCompact = height < 720;

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await getStoredUserToken();

                if (!token) {
                    navigation.replace('Login');
                    return;
                }

                try {
                    await api.get('/users/profile');
                    navigation.replace('Main', {
                        screen: 'Home',
                        params: { autoFetchLocation: false },
                    });
                } catch {
                    await clearUserSession();
                    navigation.replace('Login');
                }
            } catch {
                navigation.replace('Login');
            }
        };

        const timer = setTimeout(checkAuth, 1500);
        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <LinearGradient
            colors={['#F8FBFF', '#EDF5FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
                paddingHorizontal: 24,
            }}
        >
            <View
                style={{
                    position: 'absolute',
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: 'rgba(0, 106, 232, 0.08)',
                    top: isCompact ? 80 : 110,
                    right: -40,
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: 'rgba(255, 144, 84, 0.12)',
                    bottom: 90,
                    left: -30,
                }}
            />
            <View
                style={{
                    width: '100%',
                    maxWidth: 360,
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    borderRadius: 32,
                    paddingHorizontal: 24,
                    paddingVertical: isCompact ? 30 : 38,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#DCEBFF',
                    shadowColor: '#006AE8',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    elevation: 6,
                }}
            >
                <Image
                    source={require('../../assets/logo.png')}
                    style={{ width: logoWidth, height: logoWidth * 0.5 }}
                    resizeMode="contain"
                />
                <Text className="text-slate-950 text-2xl font-extrabold text-center mt-3">
                    MTS India
                </Text>
                <Text className="text-slate-500 text-sm text-center mt-2 leading-6">
                    Connect and promote trusted home services with a smooth experience on any phone.
                </Text>

                <View className="mt-7 items-center">
                    <ActivityIndicator size="small" color="#007BFF" />
                    <Text className="text-slate-500 text-sm mt-3">Preparing your experience...</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

export default SplashScreen;
