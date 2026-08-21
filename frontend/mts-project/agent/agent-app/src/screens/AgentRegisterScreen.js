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
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';
import { getErrorMessage } from '../utils/error';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;

const AgentRegisterScreen = ({ navigation }) => {
    // Steps: 'details' -> 'otp' -> 'complete'
    const [step, setStep] = useState('details');
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [resendSeconds, setResendSeconds] = useState(30);
    const otpInputRef = useRef(null);

    const isValid = fullName.trim().length >= 2 && mobile.trim().length >= 10;

    useEffect(() => {
        let timer;
        if (step === 'otp' && resendSeconds > 0) {
            timer = setInterval(() => {
                setResendSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, resendSeconds]);

    useEffect(() => {
        if (step === 'otp') {
            setTimeout(() => otpInputRef.current?.focus?.(), 100);
        }
    }, [step]);

    const handleSendOtp = async () => {
        setErrorMessage('');
        if (!fullName.trim()) {
            setErrorMessage('Full name is required.');
            return;
        }
        if (mobile.trim().length < 10) {
            setErrorMessage('Mobile number must be at least 10 digits.');
            return;
        }

        setLoading(true);
        try {
            await authService.sendRegistrationOtp(mobile.trim());
            setStep('otp');
            setOtp('');
            setResendSeconds(30);
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to send OTP.');
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp('');
        setResendSeconds(30);
        try {
            await authService.sendRegistrationOtp(mobile.trim());
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to resend OTP.');
            setErrorMessage(message);
        }
    };

    const handleVerifyAndRegister = async () => {
        setErrorMessage('');
        if (otp.length < OTP_LENGTH) {
            setErrorMessage('Enter the 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            // Step 1: verify OTP (uses 'agent_registration' actorType — no access checks)
            await authService.verifyRegistrationOtp(mobile.trim(), otp);

            // Step 2: register agent
            const response = await authService.registerAgent({
                full_name: fullName.trim(),
                mobile: mobile.trim(),
                email: email.trim() || undefined,
            });

            // Backend returns HTTP 201 with { success: true, token, user, agent }
            // Show the success screen on any 2xx response (axios won't reach here for errors)
            const agentData = response.data?.agent || response.data?.user || null;
            const token = response.data?.token;

            if (token) {
                await AsyncStorage.setItem('userToken', token);
            }
            if (agentData) {
                await AsyncStorage.setItem('userData', JSON.stringify(agentData));
            }

            // Always transition to the pending-approval screen on success
            setStep('complete');
        } catch (error) {
            const message = getErrorMessage(error, 'Registration failed. Please try again.');
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (text) => {
        const digits = text.replace(/[^0-9]/g, '');
        if (errorMessage) setErrorMessage('');
        const normalizedOtp = digits.slice(0, OTP_LENGTH);
        setOtp(normalizedOtp);
        if (normalizedOtp.length >= OTP_LENGTH) {
            otpInputRef.current?.blur?.();
        }
    };

    const handleGoToDashboard = () => {
        navigation.replace('MainTabs', { screen: 'Home' });
    };

    // ─── Step 3: Pending Approval Screen ───
    if (step === 'complete') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <LinearGradient
                    colors={['#f0f9ff', '#e0f2fe', '#f8fafc']}
                    style={StyleSheet.absoluteFill}
                />
                <SafeAreaView style={styles.safeArea}>
                    <ScrollView contentContainerStyle={[styles.scrollContent, { justifyContent: 'center' }]}>
                        <View style={styles.cardContainer}>
                            <View style={{ alignItems: 'center', marginBottom: 32 }}>
                                <Image
                                    source={require('../../assets/logo.jpg')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            {/* Pending Icon */}
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={{
                                    width: 100, height: 100, borderRadius: 50,
                                    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 3, borderColor: '#FDE68A',
                                }}>
                                    <Text style={{ fontSize: 48 }}>⏳</Text>
                                </View>
                            </View>

                            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 12 }}>
                                Registration Successful!
                            </Text>
                            <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 28, paddingHorizontal: 10 }}>
                                Your agent account has been created and is{' '}
                                <Text style={{ color: '#d97706', fontWeight: '800' }}>pending admin approval</Text>.
                            </Text>

                            {/* Status Card */}
                            <View style={{
                                backgroundColor: '#FFFBEB', borderRadius: 20, padding: 20,
                                borderWidth: 1, borderColor: '#FDE68A', marginBottom: 24,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 18, marginRight: 8 }}>📋</Text>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400E' }}>What happens next?</Text>
                                </View>
                                <View style={{ marginLeft: 4 }}>
                                    {[
                                        'Admin will review your application',
                                        'You\'ll be notified once approved',
                                        'After approval, you\'ll get a unique referral code',
                                        'Use it to onboard vendors & earn commissions',
                                    ].map((item, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <View style={{
                                                width: 22, height: 22, borderRadius: 11,
                                                backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center',
                                                marginRight: 10, marginTop: 1,
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>{i + 1}</Text>
                                            </View>
                                            <Text style={{ fontSize: 13.5, color: '#78350F', lineHeight: 20, flex: 1 }}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Important Notice */}
                            <View style={{
                                backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16,
                                borderWidth: 1, borderColor: '#FECACA', marginBottom: 28,
                            }}>
                                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '700', textAlign: 'center' }}>
                                    ⚠️  You cannot onboard vendors until your account is approved by admin.
                                </Text>
                            </View>

                            {/* Go to Dashboard */}
                            <TouchableOpacity onPress={handleGoToDashboard} activeOpacity={0.8} style={styles.button}>
                                <LinearGradient
                                    colors={['#2563eb', '#1d4ed8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    <Text style={styles.buttonText}>Go to Dashboard</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    }

    // ─── Steps 1 & 2: Details + OTP ───
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
                            {/* Logo */}
                            <View style={styles.logoSection}>
                                <Image
                                    source={require('../../assets/logo.jpg')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>AGENT REGISTRATION</Text>
                                </View>
                            </View>

                            {/* Header */}
                            <View style={styles.headerSection}>
                                <Text style={styles.title}>
                                    {step === 'details' ? 'Become an Agent' : 'Verify OTP'}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {step === 'details'
                                        ? 'Register to onboard vendors and earn commissions'
                                        : `Enter the 6-digit code sent to\n${mobile.trim()}`}
                                </Text>
                            </View>

                            {/* Step indicator */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 28 }}>
                                <View style={[styles.stepDot, step === 'details' && styles.stepDotActive]} />
                                <View style={{ width: 40, height: 2, backgroundColor: step === 'otp' ? '#059669' : '#e2e8f0', alignSelf: 'center' }} />
                                <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
                            </View>

                            {step === 'details' ? (
                                <View style={styles.formContainer}>
                                    {/* Full Name */}
                                    <Text style={styles.fieldLabel}>Full Name *</Text>
                                    <View style={[styles.inputWrapper, fullName ? styles.inputWrapperActive : null]}>
                                        <View style={styles.iconContainer}>
                                            <Text style={styles.inputIcon}>👤</Text>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your full name"
                                            placeholderTextColor="#94a3b8"
                                            value={fullName}
                                            onChangeText={setFullName}
                                            autoCapitalize="words"
                                        />
                                    </View>

                                    {/* Mobile */}
                                    <Text style={styles.fieldLabel}>Mobile Number *</Text>
                                    <View style={[styles.inputWrapper, mobile ? styles.inputWrapperActive : null]}>
                                        <View style={styles.prefixContainer}>
                                            <Text style={styles.prefixText}>+91</Text>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter mobile number"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            value={mobile}
                                            onChangeText={setMobile}
                                        />
                                        {mobile.trim() !== '' && (
                                            <View style={styles.typeIndicator}>
                                                <Text style={styles.typeIcon}>📱</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Email */}
                                    <Text style={styles.fieldLabel}>
                                        Email <Text style={{ color: '#94a3b8' }}>(optional)</Text>
                                    </Text>
                                    <View style={[styles.inputWrapper, email ? styles.inputWrapperActive : null]}>
                                        <View style={styles.iconContainer}>
                                            <Text style={styles.inputIcon}>✉️</Text>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter email address"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>

                                    {/* Error */}
                                    {errorMessage ? (
                                        <View style={styles.errorBanner}>
                                            <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}

                                    {/* Continue Button */}
                                    <TouchableOpacity
                                        onPress={handleSendOtp}
                                        activeOpacity={0.8}
                                        disabled={!isValid || loading}
                                        style={[styles.button, !isValid && styles.buttonDisabled]}
                                    >
                                        <LinearGradient
                                            colors={isValid ? ['#059669', '#047857'] : ['#94a3b8', '#94a3b8']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonGradient}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            ) : (
                                                <Text style={styles.buttonText}>Continue</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {/* Back to Login */}
                                    <View style={styles.loginLinkContainer}>
                                        <Text style={styles.loginLinkText}>Already have an account?  </Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                            <Text style={styles.loginLinkAction}>Login</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.formContainer}>
                                    {/* OTP Display */}
                                    <TouchableOpacity activeOpacity={1} onPress={() => otpInputRef.current?.focus?.()}>
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
                                                        <Text style={styles.otpText}>{digit}</Text>
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
                                                autoFocus
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Resend */}
                                    <View style={styles.resendContainer}>
                                        <Text style={styles.resendText}>Didn't receive code? </Text>
                                        {resendSeconds > 0 ? (
                                            <Text style={styles.timerText}>Resend in {resendSeconds}s</Text>
                                        ) : (
                                            <TouchableOpacity onPress={handleResendOtp}>
                                                <Text style={styles.resendAction}>Resend OTP</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Error */}
                                    {errorMessage ? (
                                        <View style={styles.errorBanner}>
                                            <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}

                                    {/* Verify & Register */}
                                    <TouchableOpacity
                                        onPress={handleVerifyAndRegister}
                                        activeOpacity={0.8}
                                        disabled={otp.length < OTP_LENGTH || loading}
                                        style={[styles.button, otp.length < OTP_LENGTH && styles.buttonDisabled]}
                                    >
                                        <LinearGradient
                                            colors={otp.length >= OTP_LENGTH ? ['#059669', '#047857'] : ['#94a3b8', '#94a3b8']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonGradient}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            ) : (
                                                <Text style={styles.buttonText}>Verify & Register</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {/* Go back */}
                                    <TouchableOpacity
                                        onPress={() => { setStep('details'); setOtp(''); setErrorMessage(''); }}
                                        style={{ alignItems: 'center', marginTop: 20 }}
                                    >
                                        <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '500' }}>← Change details</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    By registering, you agree to MTS India's{'\n'}
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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    cardContainer: { backgroundColor: 'transparent', width: '100%', maxWidth: 450, alignSelf: 'center', paddingVertical: 20 },
    logoSection: { alignItems: 'center', marginBottom: 32 },
    logo: { height: 70, width: 180 },
    badge: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: '#86efac' },
    badgeText: { color: '#166534', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    headerSection: { alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0', borderWidth: 2, borderColor: '#e2e8f0' },
    stepDotActive: { backgroundColor: '#059669', borderColor: '#059669' },
    formContainer: { width: '100%' },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
        borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
        marginBottom: 16, paddingHorizontal: 4, height: 58,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15 },
            android: { elevation: 2 },
        }),
    },
    inputWrapperActive: { borderColor: '#059669' },
    prefixContainer: { paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: '#f1f5f9' },
    prefixText: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    iconContainer: { paddingHorizontal: 14 },
    inputIcon: { fontSize: 18 },
    input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 15, color: '#1e293b', fontWeight: '500' },
    typeIndicator: { paddingHorizontal: 12 },
    typeIcon: { fontSize: 18 },
    errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
    errorBannerText: { color: '#b91c1c', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    button: {
        height: 58, borderRadius: 16, overflow: 'hidden', marginTop: 4,
        ...Platform.select({
            ios: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 4 },
        }),
    },
    buttonDisabled: { opacity: 0.7 },
    buttonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
    loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    loginLinkText: { color: '#64748b', fontSize: 14 },
    loginLinkAction: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
    otpOuterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    otpBox: {
        width: (width - 48 - 40) / 6, maxWidth: 55, height: 60,
        backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5,
        borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
    },
    otpBoxActive: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
    otpBoxFocused: { borderColor: '#34d399' },
    otpText: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
    hiddenOtpInput: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.02, color: 'transparent', backgroundColor: 'transparent',
    },
    resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    resendText: { color: '#64748b', fontSize: 14 },
    timerText: { color: '#059669', fontWeight: 'bold', fontSize: 14 },
    resendAction: { color: '#059669', fontWeight: '800', fontSize: 14 },
    footer: { marginTop: 32, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
    linkText: { color: '#475569', fontWeight: '600' },
});

export default AgentRegisterScreen;
