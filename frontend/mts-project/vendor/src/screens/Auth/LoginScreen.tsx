import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/api';

export default function LoginScreen() {
    const navigation = useNavigation<any>();
    const { width, height } = useWindowDimensions();

    const [input, setInput] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resendSeconds, setResendSeconds] = useState(30);
    const [otpError, setOtpError] = useState('');
    const otpRefs = useRef<any[]>([]);

    const isPhone = input.trim().length > 0 && /^\d+$/.test(input.trim());
    const showPrefix = isPhone;
    const horizontalPadding = Math.max(18, Math.min(24, Math.round(width * 0.06)));
    const otpBoxSize = Math.max(42, Math.min(52, Math.floor((width - horizontalPadding * 2 - 28) / 6)));
    const isCompact = height < 720;
    const logoWidth = Math.min(95, Math.round(width * 0.24));

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (showOtp && resendSeconds > 0) {
            timer = setInterval(() => {
                setResendSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showOtp, resendSeconds]);

    const handleSendOtp = async () => {
        const val = input.trim();
        setOtpError('');
        if (!val) return;
        if (isPhone && val.length < 10) return;
        if (!isPhone && !val.includes('@')) return;

        try {
            await authService.sendOtp(val, { actorType: 'vendor' });
            
            // Bypass OTP screen directly using the default OTP
            const response = await authService.verifyOtp(val, '123456', { actorType: 'vendor' });
            
            if (response.data.success) {
                if (response.data.token) {
                    await AsyncStorage.setItem('userToken', response.data.token);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

                    const parentNav = navigation.getParent();
                    if (parentNav) {
                        parentNav.reset({ index: 0, routes: [{ name: 'Main' }] });
                    } else {
                        navigation.replace('Main');
                    }
                } else if (response.data.registrationRequired) {
                    Alert.alert(
                        'New Registration',
                        'It looks like you are a new vendor. Please complete your registration to continue.',
                        [
                            {
                                text: 'Continue',
                                onPress: () => navigation.navigate('Register', { contact: val })
                            }
                        ]
                    );
                }
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || '';
            const status = error?.response?.status;
            
            if (status === 403 || msg.includes('admin') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('register')) {
                // Automatically redirect to registration on Web since Alert can sometimes fail or be suppressed
                navigation.navigate('Register', { contact: val });
            } else {
                try {
                    Alert.alert('Login Failed', msg || 'Could not sign in');
                } catch(e) {
                    console.log('Login failed: ', msg);
                }
            }
        }
    };

    const handleVerifyOtp = async () => {
        const val = input.trim();
        const enteredOtp = otp.join('');
        setOtpError('');
        if (enteredOtp.length < 6) {
            setOtpError('Please enter full 6-digit OTP');
            return;
        }

        try {
            const response = await authService.verifyOtp(val, enteredOtp, { actorType: 'vendor' });

            if (response.data.success) {
                if (response.data.token) {
                    await AsyncStorage.setItem('userToken', response.data.token);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

                    const parentNav = navigation.getParent();
                    if (parentNav) {
                        parentNav.reset({ index: 0, routes: [{ name: 'Main' }] });
                    } else {
                        navigation.replace('Main');
                    }
                } else if (response.data.registrationRequired) {
                    navigation.navigate('Register', { contact: val });
                }
            }
        } catch (error: any) {
            setOtpError(error?.response?.data?.message || 'Invalid OTP');
        }
    };

    const handleOtpChange = (text: string, index: number) => {
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

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: horizontalPadding }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo */}
                    <View style={{ alignItems: 'center', marginTop: isCompact ? 28 : 48, marginBottom: isCompact ? 24 : 32 }}>
                        <Image
                            source={require('../../../logo.png')}
                            style={{ width: logoWidth, height: logoWidth * 0.5 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Subtitle */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
                            {showOtp
                                ? `We sent a 6-digit code to\n${input.trim()}`
                                : 'Enter your mobile number or email'}
                        </Text>
                    </View>

                    {!showOtp ? (
                        <View>
                            {/* Input */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(96,165,250,0.45)',
                                    borderRadius: 12,
                                    backgroundColor: '#FFFFFF',
                                    marginBottom: 20,
                                    shadowColor: '#007BFF',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.07,
                                    shadowRadius: 12,
                                    elevation: 5,
                                }}
                            >
                                {showPrefix ? (
                                    <View style={{
                                        backgroundColor: 'rgba(239,246,255,0.5)',
                                        paddingHorizontal: 16,
                                        paddingVertical: 16,
                                        borderTopLeftRadius: 12,
                                        borderBottomLeftRadius: 12,
                                        borderRightWidth: 1,
                                        borderRightColor: '#BFDBFE'
                                    }}>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#007BFF' }}>+91</Text>
                                    </View>
                                ) : (
                                    <View style={{ paddingLeft: 16 }}>
                                        <Text style={{ fontSize: 20 }}>👤</Text>
                                    </View>
                                )}
                                <TextInput
                                    style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 16, fontSize: 16, color: '#111827' }}
                                    placeholder="Mobile number or email"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={input}
                                    onChangeText={setInput}
                                    onSubmitEditing={handleSendOtp}
                                />
                                {input.trim() !== '' && (
                                    <View style={{
                                        backgroundColor: 'rgba(219,234,254,0.5)',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        marginRight: 12
                                    }}>
                                        <Text style={{ fontSize: 16 }}>{isPhone ? '📱' : '✉️'}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Continue button */}
                            <TouchableOpacity
                                onPress={handleSendOtp}
                                style={{
                                    backgroundColor: '#007BFF',
                                    height: 56,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>
                                    Login
                                </Text>
                            </TouchableOpacity>

                            {/* Register link */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                                <Text style={{ color: '#6B7280', fontSize: 14 }}>{"Don't have an account?  "}</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={{ color: '#007BFF', fontWeight: '700', fontSize: 14 }}>Register</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    ) : (
                        <View>
                            {/* OTP boxes */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 4 }}>
                                {otp.map((digit, i) => (
                                    <TextInput
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        style={{
                                            width: otpBoxSize,
                                            height: otpBoxSize + 10,
                                            borderWidth: 1,
                                            borderColor: digit ? '#007BFF' : '#D1D5DB',
                                            borderRadius: 12,
                                            textAlign: 'center',
                                            fontSize: width < 360 ? 21 : 24,
                                            fontWeight: '700',
                                            color: '#007BFF',
                                            backgroundColor: '#F0F5FF',
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
                                <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: '600' }}>
                                    {otpError}
                                </Text>
                            ) : null}

                            {/* Resend */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
                                <Text style={{ color: '#6B7280', fontSize: 14 }}>{"Didn't receive it?  "}</Text>
                                {resendSeconds > 0 ? (
                                    <Text style={{ color: '#007BFF', fontWeight: '600', fontSize: 14 }}>
                                        Resend in {resendSeconds}s
                                    </Text>
                                ) : (
                                    <TouchableOpacity onPress={async () => {
                                        setOtp(['', '', '', '', '', '']);
                                        setResendSeconds(30);
                                        otpRefs.current[0]?.focus();
                                        try {
                                            await authService.sendOtp(input.trim(), { actorType: 'vendor' });
                                        } catch (e) {}
                                    }}>
                                        <Text style={{ color: '#007BFF', fontWeight: '700', fontSize: 14 }}>Resend OTP</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Login button */}
                            <TouchableOpacity
                                onPress={handleVerifyOtp}
                                style={{
                                    height: 56,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                    backgroundColor: '#007BFF',
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>
                                    Login
                                </Text>
                            </TouchableOpacity>

                            {/* Go back */}
                            <TouchableOpacity
                                onPress={() => { setOtp(['', '', '', '', '', '']); setOtpError(''); setShowOtp(false); }}
                                style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                            >
                                <Text style={{ color: '#007BFF', fontSize: 14, fontWeight: '500' }}>{'<  Go back'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={{ marginTop: 'auto', paddingTop: isCompact ? 24 : 32, paddingBottom: 16 }}>
                        <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 12, lineHeight: 18 }}>
                            {"By continuing, you agree to MTS India's\nTerms of Service and Privacy Policy."}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
