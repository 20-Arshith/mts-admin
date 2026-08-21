import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SplashScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
        }).start();

        const timer = setTimeout(() => {
            navigation.replace('Login');
        }, 2000);
        return () => clearTimeout(timer);
    }, [navigation, fadeAnim]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#ffffff', '#f0f9ff']}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Image
                    source={require('../../assets/logo.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>AGENTS</Text>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 220,
        height: 100,
        marginBottom: 10,
    },
    badge: {
        marginTop: 20,
        backgroundColor: '#dbeafe',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    badgeText: {
        color: '#1e40af',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});

export default SplashScreen;

