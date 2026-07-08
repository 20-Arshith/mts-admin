import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { API_BASE } from '../utils/config';
import { detectCurrentLocation, syncUserLocation } from '../utils/location';
import { saveUserSession } from '../utils/api';

const LoginScreen = ({ navigation }) => {
    const { width, height } = useWindowDimensions();
    const [input, setInput] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resendSeconds, setResendSeconds] = useState(30);
    const [otpError, setOtpError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const otpRefs = useRef([]);

    const isPhone = input.trim().length > 0 && /^\d+$/.test(input.trim());
    const isCompact = height < 760;
    const logoWidth = Math.min(width * 0.44, 170);
    const otpBoxSize = Math.max(44, Math.min(56, Math.floor((width - 94) / 6)));
    const otpGap = width < 360 ? 6 : 10;

    useEffect(() => {
        let timer;
        if (showOtp && resendSeconds > 0) {
            timer = setInterval(() => {
                setResendSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showOtp, resendSeconds]);

    const handleContinue = async () => {
        const val = input.trim();
        setOtpError('');
        if (!val) return;
        if (isPhone && val.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        if (!isPhone && !val.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: val, actorType: 'user' }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to send OTP');
            }
            setShowOtp(true);
            setOtp(['', '', '', '', '', '']);
            setResendSeconds(30);
            setTimeout(() => { otpRefs.current[0]?.focus(); }, 150);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not send OTP. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        const otpCode = otp.join('');
        setOtpError('');
        if (otpCode.length < 6) {
            setOtpError('Invalid OTP');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: input.trim(), otp: otpCode, actorType: 'user' }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Invalid OTP');
            }

            await saveUserSession(json.token, json.user);

            if (json.registrationRequired) {
                navigation.replace('EditProfile', {
                    mode: 'registration',
                    contact: input.trim(),
                });
                return;
            }

            try {
                const detectedLocation = await detectCurrentLocation();
                await syncUserLocation(detectedLocation);
            } catch (locationError) {
                console.warn('Location was not captured during login', locationError);
            }

            navigation.replace('Main', {
                screen: 'Home',
                params: { autoFetchLocation: true },
            });
        } catch (e: any) {
            const message = e.message || 'Invalid OTP';
            setOtpError(message);
            Alert.alert('Login Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (text, index) => {
        if (otpError) {
            setOtpError('');
        }
        const newOtp = [...otp];
        newOtp[index] = text.replace(/[^0-9]/g, '');
        setOtp(newOtp);

        if (text && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const renderIntro = () => (
        <View
            style={{
                alignItems: 'center',
                paddingTop: isCompact ? 36 : 52,
                paddingBottom: showOtp ? 24 : 42,
            }}
        >
            <Image
                source={require('../../assets/logo.png')}
                style={{ width: logoWidth, height: logoWidth * 0.5 }}
                resizeMode="contain"
            />
            <Text className="text-slate-500 text-sm text-center mt-8">
                {showOtp
                    ? `We sent a 6-digit code to ${input.trim()}`
                    : 'Enter your mobile number or email'}
            </Text>
        </View>
    );

    const renderInputStep = () => (
        <View>
            <View
                className="flex-row items-center rounded-xl bg-white mb-5"
                style={{
                    borderWidth: 1,
                    borderColor: '#CFE0FF',
                    minHeight: 56,
                    shadowColor: '#007BFF',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 10,
                    elevation: 3,
                }}
            >
                <View className="pl-4 pr-3">
                    <MaterialIcons
                        name="person"
                        size={22}
                        color="#006AE8"
                    />
                </View>
                <TextInput
                    className="flex-1 px-1 py-4 text-base text-slate-900"
                    placeholder="Mobile number or email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={handleContinue}
                    autoCapitalize="none"
                />
            </View>

            <TouchableOpacity
                onPress={handleContinue}
                disabled={isLoading}
                style={{
                    height: 54,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#007BFF',
                    shadowColor: '#007BFF',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.22,
                    shadowRadius: 18,
                    elevation: 5,
                }}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-bold text-base">Continue</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderOtpStep = () => (
        <View>
            <Text className="text-slate-500 text-sm text-center mb-5">
                Enter the 6-digit code sent to {input.trim()}
            </Text>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                    gap: otpGap,
                }}
            >
                {otp.map((digit, i) => (
                    <TextInput
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        style={{
                            width: otpBoxSize,
                            height: otpBoxSize + 8,
                            borderWidth: 1,
                            borderColor: digit ? '#007BFF' : otpError ? '#DC2626' : '#CBD5E1',
                            borderRadius: 12,
                            textAlign: 'center',
                            fontSize: width < 360 ? 21 : 24,
                            fontWeight: '700',
                            color: '#007BFF',
                            backgroundColor: digit ? '#EFF6FF' : '#F8FAFC',
                            shadowColor: '#007BFF',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.04,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(t) => handleOtpChange(t, i)}
                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    />
                ))}
            </View>

            {otpError ? (
                <Text className="text-[#DC2626] text-sm text-center mb-4 font-medium">
                    {otpError}
                </Text>
            ) : null}

            <View className="flex-row justify-center items-center mb-8">
                <Text className="text-gray-500 text-sm">Didn&apos;t receive it? </Text>
                {resendSeconds > 0 ? (
                    <Text className="text-[#007BFF] font-semibold text-sm">
                        Resend in {resendSeconds}s
                    </Text>
                ) : (
                    <TouchableOpacity
                        onPress={async () => {
                            setOtp(['', '', '', '', '', '']);
                            setResendSeconds(30);
                            otpRefs.current[0]?.focus();
                            try {
                                await fetch(`${API_BASE}/auth/send-otp`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contact: input.trim(), actorType: 'user' }),
                                });
                            } catch (e) {}
                        }}
                    >
                        <Text className="text-[#007BFF] font-bold text-sm">Resend OTP</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={{
                    height: 54,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    backgroundColor: '#007BFF',
                    shadowColor: '#007BFF',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.22,
                    shadowRadius: 18,
                    elevation: 5,
                }}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-bold text-base">Login</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => {
                    setOtp(['', '', '', '', '', '']);
                    setOtpError('');
                    setShowOtp(false);
                }}
                className="items-center justify-center flex-row"
            >
                <Ionicons name="arrow-back" size={15} color="#007BFF" />
                <Text className="text-[#007BFF] text-sm font-medium ml-1.5">Go back</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: Math.max(24, width * 0.06),
                        paddingBottom: 22,
                        paddingTop: isCompact ? 4 : 10,
                        backgroundColor: '#FFFFFF',
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderIntro()}

                    <View style={{ width: '100%' }}>
                        {showOtp ? renderOtpStep() : renderInputStep()}
                    </View>

                    <View
                        style={{
                            marginTop: 'auto',
                            paddingTop: isCompact ? 18 : 26,
                            paddingBottom: 4,
                        }}
                    >
                        <Text className="text-slate-400 text-center text-xs leading-5 px-4">
                            By continuing, you agree to MTS India&apos;s Terms of Service and Privacy Policy.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;
