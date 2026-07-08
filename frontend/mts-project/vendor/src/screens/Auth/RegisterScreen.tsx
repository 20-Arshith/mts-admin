import { useNavigation, useRoute } from '@react-navigation/native';
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

export default function RegisterScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { width, height } = useWindowDimensions();

    const [input, setInput] = useState((route.params?.contact || '').trim());
    const [agentCode, setAgentCode] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resendSeconds, setResendSeconds] = useState(30);
    const [formError, setFormError] = useState('');
    const otpRefs = useRef<any[]>([]);

    const isPhone = input.trim().length > 0 && /^\d+$/.test(input.trim());
    const normalizedAgentCode = agentCode.trim().toUpperCase();
    const horizontalPadding = Math.max(18, Math.min(24, Math.round(width * 0.06)));
    const otpBoxSize = Math.max(42, Math.min(52, Math.floor((width - horizontalPadding * 2 - 28) / 6)));
    const isCompact = height < 740;
    const logoWidth = Math.min(124, Math.round(width * 0.32));
    const clearFormError = () => {
        if (formError) {
            setFormError('');
        }
    };

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (showOtp && resendSeconds > 0) {
            timer = setInterval(() => setResendSeconds((p) => p - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [showOtp, resendSeconds]);

    const handleSendOtp = async () => {
        const val = input.trim();
        setFormError('');

        if (!val) {
            setFormError('Mobile number or email is required');
            return;
        }
        if (isPhone && val.length < 10) {
            setFormError('Mobile number must be 10 digits');
            return;
        }
        if (!isPhone && !val.includes('@')) {
            setFormError('Please enter a valid email address');
            return;
        }

        try {
            // Validate agent code only if one was entered — it is OPTIONAL.
            // If the code is invalid, warn the vendor and clear it, but do NOT block the flow.
            if (normalizedAgentCode) {
                try {
                    await authService.validateAgentCode(normalizedAgentCode);
                } catch (agentError: any) {
                    const agentMsg = agentError?.response?.data?.message || 'Invalid agent code';
                    setAgentCode('');
                    Alert.alert(
                        'Invalid Agent Code',
                        `${agentMsg}\n\nYou can continue without an agent code and onboard directly.`,
                        [{ text: 'Continue Without Code' }]
                    );
                    // Do NOT return — proceed with OTP send without the invalid code
                }
            }
            await authService.sendOtp(val, { actorType: 'vendor_registration' });
            setShowOtp(true);
            setResendSeconds(30);
            setTimeout(() => otpRefs.current[0]?.focus(), 150);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to send OTP';
            setFormError(message);
            Alert.alert('Error', message);
        }
    };

    const handleVerify = async () => {
        setFormError('');
        if (otp.join('').length < 6) {
            setFormError('Enter the 6-digit OTP');
            return;
        }
        try {
            const finalOtp = otp.join('');
            const response = await authService.verifyOtp(input.trim(), finalOtp, { actorType: 'vendor_registration' });
            
            if (response.data.success) {
                if (response.data.token) {
                    await AsyncStorage.setItem('userToken', response.data.token);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
                    
                    // Already registered? Just go to main. If not, go to BusinessProfile.
                    if (!response.data.registrationRequired) {
                        const parentNav = navigation.getParent();
                        if (parentNav) {
                            parentNav.reset({ index: 0, routes: [{ name: 'Main' }] });
                        } else {
                            navigation.replace('Main');
                        }
                    } else {
                        navigation.navigate('BusinessProfile', { contact: input.trim(), agentCode: normalizedAgentCode });
                    }
                } else if (response.data.registrationRequired) {
                    navigation.navigate('BusinessProfile', { contact: input.trim(), agentCode: normalizedAgentCode });
                }
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Invalid OTP';
            setFormError(message);
            Alert.alert('Verification Failed', message);
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text.replace(/[^0-9]/g, '');
        setOtp(newOtp);
        if (text && index < 5) otpRefs.current[index + 1]?.focus();
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
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: horizontalPadding }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo */}
                    <View style={{ alignItems: 'center', marginTop: isCompact ? 28 : 48, marginBottom: 24 }}>
                        <Image
                            source={require('../../../logo.png')}
                            style={{ width: logoWidth, height: logoWidth * 0.5 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                            Partner With Us
                        </Text>
                        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
                            {showOtp
                                ? `We sent a 6-digit code to\n${input.trim()}`
                                : 'Enter your details to get started'}
                        </Text>
                    </View>

                    {!showOtp ? (
                        <View>
                            {/* Input */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: '#1E293B', marginBottom: 6 }}>
                                    Mobile Number / Email *
                                </Text>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: 'rgba(96,165,250,0.45)',
                                        borderRadius: 12,
                                        backgroundColor: '#FFFFFF',
                                        shadowColor: '#007BFF',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.07,
                                        shadowRadius: 12,
                                        elevation: 5,
                                    }}
                                >
                                    {isPhone ? (
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
                                        onChangeText={(value) => {
                                            clearFormError();
                                            setInput(value);
                                        }}
                                        onSubmitEditing={handleSendOtp}
                                    />
                                    {input.trim() !== '' && (
                                        <View style={{ backgroundColor: 'rgba(219,234,254,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 }}>
                                            <Text style={{ fontSize: 16 }}>{isPhone ? '📱' : '✉️'}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Agent Code */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: '#1E293B', marginBottom: 6 }}>
                                    Agent Code
                                </Text>
                                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                                    Optional
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: '#F8FAFC',
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        fontSize: 16,
                                        color: '#111827',
                                    }}
                                    placeholder="E.g. AGT-ABCD-EFGH"
                                    placeholderTextColor="#9CA3AF"
                                    value={agentCode}
                                    autoCapitalize="characters"
                                    onChangeText={(value) => {
                                        setAgentCode(value.toUpperCase().replace(/\s/g, ''));
                                        clearFormError();
                                    }}
                                />
                            </View>

                            {formError ? (
                                <View style={{ marginBottom: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                                    <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '500' }}>{formError}</Text>
                                </View>
                            ) : null}

                            {/* Send OTP */}
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
                                    Send OTP
                                </Text>
                            </TouchableOpacity>

                            {/* Already registered */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                                <Text style={{ color: '#6B7280', fontSize: 14 }}>Already registered?  </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={{ color: '#007BFF', fontWeight: '700', fontSize: 14 }}>Login Here</Text>
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

                            {/* Resend */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
                                <Text style={{ color: '#6B7280', fontSize: 14 }}>{"Didn't receive it?  "}</Text>
                                {resendSeconds > 0 ? (
                                    <Text style={{ color: '#007BFF', fontWeight: '600', fontSize: 14 }}>
                                        Resend in {resendSeconds}s
                                    </Text>
                                ) : (
                                    <TouchableOpacity onPress={() => {
                                        setOtp(['', '', '', '', '', '']);
                                        setResendSeconds(30);
                                        otpRefs.current[0]?.focus();
                                        handleSendOtp();
                                    }}>
                                        <Text style={{ color: '#007BFF', fontWeight: '700', fontSize: 14 }}>Resend OTP</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {formError ? (
                                <View style={{ marginBottom: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                                    <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '500' }}>{formError}</Text>
                                </View>
                            ) : null}

                            {/* Verify button */}
                            <TouchableOpacity
                                onPress={handleVerify}
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
                                    Verify & Continue
                                </Text>
                            </TouchableOpacity>

                            {/* Go back */}
                            <TouchableOpacity
                                onPress={() => { setOtp(['', '', '', '', '', '']); setShowOtp(false); }}
                                style={{ alignItems: 'center', justifyContent: 'center' }}
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
