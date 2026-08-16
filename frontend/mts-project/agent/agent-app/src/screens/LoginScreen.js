import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';
import { getErrorMessage } from '../utils/error';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const OTP_LENGTH = 6;

const LoginScreen = ({ navigation }) => {
    const [input, setInput] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [otp, setOtp] = useState('');
    const [resendSeconds, setResendSeconds] = useState(30);
    const [errorMessage, setErrorMessage] = useState('');
    const otpInputRef = useRef(null);

    const isPhone = input.trim().length > 0 && /^\d+$/.test(input.trim());
    const showPrefix = isPhone;

    useEffect(() => {
        let timer;
        if (showOtp && resendSeconds > 0) {
            timer = setInterval(() => {
                setResendSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showOtp, resendSeconds]);

    const focusOtpInput = () => {
        setTimeout(() => {
            otpInputRef.current?.focus?.();
        }, 10);
    };

    useEffect(() => {
        if (showOtp) {
            focusOtpInput();
        }
    }, [showOtp]);

    const handleSendOtp = async () => {
        const val = input.trim();
        setErrorMessage('');
        if (!val) {
            setErrorMessage('Mobile number or email is required.');
            return;
        }
        if (isPhone && val.length < 10) {
            setErrorMessage('Mobile number must be 10 digits.');
            return;
        }
        if (!isPhone && !val.includes('@')) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }
        try {
            await authService.sendOtp(val);
            setShowOtp(true);
        } catch (err) {
            const message = getErrorMessage(err, 'Failed to send OTP');
            setErrorMessage(message);
        }
    };

    const handleVerifyOtp = async () => {
        const val = input.trim();
        const enteredOtp = otp;
        if (!enteredOtp || enteredOtp.length < 6) {
            setErrorMessage('Please enter the 6-digit OTP.');
            return;
        }
        try {
            const response = await authService.verifyOtp(val, enteredOtp);
            if (response.data.success) {
                if (response.data.token) {
                    await AsyncStorage.setItem('userToken', response.data.token);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
                    navigation.replace('MainTabs', {
                        screen: 'Home',
                        params: { autoFetchLocation: true },
                    });
                } else if (response.data.registrationRequired) {
                    Alert.alert('Not Registered', "You don't have an agent account yet. Would you like to register?", [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Register', onPress: () => navigation.navigate('AgentRegister') },
                    ]);
                }
            } else {
                setErrorMessage('Invalid OTP. Please try again.');
            }
        } catch (error) {
            const message = getErrorMessage(error, 'OTP verification failed');
            setErrorMessage(message);
            Alert.alert('Verification Failed', message);
        }
    };

    const handleOtpChange = (text) => {
        const digits = text.replace(/[^0-9]/g, '');

        if (errorMessage) {
            setErrorMessage('');
        }

        const normalizedOtp = digits.slice(0, OTP_LENGTH);
        setOtp(normalizedOtp);

        if (normalizedOtp.length >= OTP_LENGTH) {
            otpInputRef.current?.blur?.();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#f0f9ff', '#e0f2fe', '#f8fafc']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.cardContainer}>
                            <View style={styles.logoSection}>
                                <Image
                                    source={require('../../assets/logo.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>AGENTS</Text>
                                </View>
                            </View>

                            <View style={styles.headerSection}>
                                <Text style={styles.title}>
                                    {showOtp ? 'Verification' : 'Welcome Back'}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {showOtp
                                        ? `Enter the 6-digit code sent to\n${input.trim()}`
                                        : 'Please enter your credentials to login to your agent dashboard'}
                                </Text>
                            </View>

                            {!showOtp ? (
                                <View style={styles.formContainer}>
                                    <View style={styles.inputWrapper}>
                                        {showPrefix ? (
                                            <View style={styles.prefixContainer}>
                                                <Text style={styles.prefixText}>+91</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.iconContainer}>
                                                <Text style={styles.inputIcon}>👤</Text>
                                            </View>
                                        )}
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Mobile number or email"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={input}
                                            onChangeText={setInput}
                                            onSubmitEditing={handleSendOtp}
                                        />
                                        {input.trim() !== '' && (
                                            <View style={styles.typeIndicator}>
                                                <Text style={styles.typeIcon}>{isPhone ? '📱' : '✉️'}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {errorMessage ? (
                                        <View style={styles.errorBanner}>
                                            <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}

                                    {showOtp ? (
                                        <TouchableOpacity
                                            onPress={handleVerifyOtp}
                                            activeOpacity={0.8}
                                            style={styles.button}
                                        >
                                            <LinearGradient
                                                colors={['#059669', '#047857']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.buttonGradient}
                                            >
                                                <Text style={styles.buttonText}>Verify & Login</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={handleSendOtp}
                                            activeOpacity={0.8}
                                            style={styles.button}
                                        >
                                            <LinearGradient
                                                colors={['#2563eb', '#1d4ed8']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.buttonGradient}
                                            >
                                                <Text style={styles.buttonText}>Send OTP</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}

                                    {/* Register as Agent link */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                                        <Text style={{ color: '#64748b', fontSize: 14 }}>New here?  </Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('AgentRegister')}>
                                            <Text style={{ color: '#059669', fontWeight: '800', fontSize: 14 }}>Register as Agent</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.formContainer}>
                                    <TouchableOpacity activeOpacity={1} onPress={focusOtpInput}>
                                        <View style={styles.otpOuterContainer}>
                                            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                                                const digit = otp[i] || '';
                                                const isActive = i === Math.min(otp.length, OTP_LENGTH - 1);
                                                return (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.otpBox,
                                                            digit ? styles.otpBoxActive : null,
                                                            isActive ? styles.otpBoxFocused : null,
                                                        ]}
                                                    >
                                                        <Text style={styles.otpInput}>{digit}</Text>
                                                    </View>
                                                );
                                            })}
                                            <TextInput
                                                ref={otpInputRef}
                                                style={styles.hiddenOtpInput}
                                                keyboardType="number-pad"
                                                maxLength={OTP_LENGTH}
                                                value={otp}
                                                onChangeText={handleOtpChange}
                                                textContentType="oneTimeCode"
                                                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                                                blurOnSubmit={false}
                                                caretHidden
                                                autoFocus={showOtp}
                                                showSoftInputOnFocus
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.resendContainer}>
                                        <Text style={styles.resendText}>Didn't receive code? </Text>
                                        {resendSeconds > 0 ? (
                                            <Text style={styles.timerText}>
                                                Resend in {resendSeconds}s
                                            </Text>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setOtp('');
                                                    setResendSeconds(30);
                                                    focusOtpInput();
                                                    handleSendOtp();
                                                }}
                                            >
                                                <Text style={styles.resendAction}>Resend OTP</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {errorMessage ? (
                                        <View style={styles.errorBanner}>
                                            <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}

                                    <TouchableOpacity
                                        onPress={handleVerifyOtp}
                                        activeOpacity={0.8}
                                        style={styles.button}
                                    >
                                        <LinearGradient
                                            colors={['#059669', '#047857']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonGradient}
                                        >
                                            <Text style={styles.buttonText}>Verify & Login</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setOtp('');
                                            setShowOtp(false);
                                        }}
                                        style={styles.backButton}
                                    >
                                        <Text style={styles.backButtonText}>
                                            ← Change contact details
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    By continuing, you agree to MTS India's{'\n'}
                                    <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    cardContainer: {
        backgroundColor: 'transparent',
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        paddingVertical: 20,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        height: 48,
        width: 120,
    },
    badge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    badgeText: {
        color: '#1e40af',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        marginBottom: 20,
        paddingHorizontal: 4,
        height: 64,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 15,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    prefixContainer: {
        paddingHorizontal: 16,
        borderRightWidth: 1,
        borderRightColor: '#f1f5f9',
    },
    prefixText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
    },
    iconContainer: {
        paddingHorizontal: 16,
    },
    inputIcon: {
        fontSize: 20,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
    },
    typeIndicator: {
        paddingHorizontal: 12,
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    errorBannerText: {
        color: '#b91c1c',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    typeIcon: {
        fontSize: 18,
    },
    button: {
        height: 58,
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    buttonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    otpOuterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    otpBox: {
        width: (width - 48 - 40) / 6,
        maxWidth: 55,
        height: 60,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpBoxActive: {
        borderColor: '#2563eb',
        backgroundColor: '#f8faff',
    },
    otpBoxFocused: {
        borderColor: '#60a5fa',
    },
    otpInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        width: '100%',
    },
    hiddenOtpInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.02,
        color: 'transparent',
        backgroundColor: 'transparent',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    resendText: {
        color: '#64748b',
        fontSize: 14,
    },
    timerText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
    },
    resendAction: {
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 14,
    },
    backButton: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 10,
    },
    backButtonText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 18,
    },
    linkText: {
        color: '#475569',
        fontWeight: '600',
    }
});

export default LoginScreen;
