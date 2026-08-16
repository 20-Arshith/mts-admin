import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import AgentRegisterScreen from './src/screens/AgentRegisterScreen';
import SplashScreen from './src/screens/SplashScreen';
import VendorRegistrationScreen from './src/screens/VendorRegistrationScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import HelpAndSupportScreen from './src/screens/HelpAndSupportScreen';
import TabNavigator from './src/navigation/TabNavigator';

const Stack = createNativeStackNavigator();

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Agent app crashed', error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <SafeAreaProvider>
                    <ScrollView contentContainerStyle={styles.errorContainer}>
                        <Text style={styles.errorTitle}>Unable to open MTS Agent</Text>
                        <Text style={styles.errorMessage}>
                            {this.state.error?.message || 'A startup error occurred. Please contact support.'}
                        </Text>
                    </ScrollView>
                </SafeAreaProvider>
            );
        }

        return this.props.children;
    }
}

function AgentApp() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Splash"
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#f8fafc' } // Slate-50 background global
                    }}
                >
                    {/* Auth Flow */}
                    <Stack.Screen name="Splash" component={SplashScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="AgentRegister" component={AgentRegisterScreen} />

                    {/* Main App Flow */}
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
                    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                    <Stack.Screen name="HelpAndSupport" component={HelpAndSupportScreen} />
                </Stack.Navigator>
                <StatusBar style="auto" />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

export default function App() {
    return (
        <AppErrorBoundary>
            <AgentApp />
        </AppErrorBoundary>
    );
}

const styles = StyleSheet.create({
    errorContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    errorTitle: {
        color: '#0f172a',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 12,
    },
    errorMessage: {
        color: '#475569',
        fontSize: 15,
        lineHeight: 22,
    },
});
