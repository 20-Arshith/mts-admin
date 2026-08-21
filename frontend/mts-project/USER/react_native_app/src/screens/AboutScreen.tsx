import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AboutScreen = ({ navigation }) => {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">About MTS</Text>
            </View>

            <ScrollView className="p-4" contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
                {/* Logo placeholder */}
                <View className="w-32 h-32 bg-gray-100 rounded-full items-center justify-center p-4 mt-6 mb-4 mt-">
                    <Image
                        source={require('../../assets/logo.jpg')}
                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                    />
                </View>

                <Text className="text-2xl font-bold text-[#007BFF] mb-1">MTS India</Text>
                <Text className="text-xs text-gray-400 font-medium mb-8 tracking-wide">Version 1.0.0</Text>

                <Text className="text-[#1B3A57] font-semibold text-lg text-center leading-7 px-4">
                    Empowering local businesses and connecting users to premium at-home services seamlessly.
                </Text>

                <View className="w-full h-[1px] bg-gray-100 my-8" />

                <View className="w-full items-start space-y-4">
                    <TouchableOpacity className="flex-row items-center w-full justify-between py-2">
                        <Text className="text-base font-medium text-gray-800">Visit our Website</Text>
                        <Ionicons name="open-outline" size={18} color="#007BFF" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center w-full justify-between py-2 mt-4">
                        <Text className="text-base font-medium text-gray-800">Careers at MTS</Text>
                        <Ionicons name="open-outline" size={18} color="#007BFF" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center w-full justify-between py-2 mt-4">
                        <Text className="text-base font-medium text-gray-800">Press & Media</Text>
                        <Ionicons name="open-outline" size={18} color="#007BFF" />
                    </TouchableOpacity>
                </View>

                <Text className="text-xs text-gray-400 mt-16">&copy; 2026 MTS India. All rights reserved.</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AboutScreen;
