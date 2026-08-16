import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Alert, Image } from 'react-native';
import apiClient from '../../services/api';
import { useEffect } from 'react';
import { getVendorCategoryMeta, isVendorCustomCategoryIcon } from '../../utils/categoryMeta';

const CATEGORIES = [
    { id: '1', name: 'Plumbing', icon: 'wrench' },
    { id: '2', name: 'Electrician', icon: 'lightning-bolt' },
    { id: '3', name: 'AC Repair', icon: 'air-conditioner' },
    { id: '4', name: 'Cleaning', icon: 'broom' },
    { id: '5', name: 'Carpenter', icon: 'hammer' },
];

export default function ServiceCategoriesScreen() {
    const navigation = useNavigation<any>();
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await apiClient.get('/vendors/categories');
                if (response.data.success) {
                    setCategories(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                // Fallback to local categories if backend fails or is empty during dev
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev =>
            prev.includes(id)
                ? prev.filter(cat => cat !== id)
                : [...prev, id]
        );
    };

    return (
        <View className="flex-1 bg-background pt-16 px-6">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-textPrimary">Service Type</Text>
                <Text className="text-textSecondary mt-2">What services do you provide?</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View>
                    {(categories.length > 0 ? categories : CATEGORIES).map((cat: any) => {
                        const isSelected = selectedCategories.includes(cat.id || cat.category_id);
                        const meta = getVendorCategoryMeta(cat.icon_name, cat.name || cat.category_name);
                        return (
                            <TouchableOpacity
                                key={cat.id || cat.category_id}
                                onPress={() => toggleCategory(cat.id || cat.category_id)}
                                className="flex-row items-center p-4 rounded-xl border mb-4"
                                style={{
                                    borderColor: isSelected ? '#006AE8' : '#E2E8F0',
                                    backgroundColor: isSelected ? '#E8F2FF' : '#FFFFFF'
                                }}
                            >
                                <View 
                                    className="w-6 h-6 rounded flex items-center justify-center border mr-4"
                                    style={{
                                        backgroundColor: isSelected ? '#006AE8' : '#F8FAFC',
                                        borderColor: isSelected ? '#006AE8' : '#94A3B8'
                                    }}
                                >
                                    {isSelected ? <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" /> : null}
                                </View>

                                {isVendorCustomCategoryIcon(cat.icon_name) ? (
                                    <Image source={{ uri: cat.icon_name }} style={{ width: 24, height: 24, borderRadius: 4 }} resizeMode="contain" />
                                ) : (
                                    <MaterialIcons
                                        name={(meta.icon || cat.icon || 'miscellaneous-services') as any}
                                        size={24}
                                        color={isSelected ? '#006AE8' : meta.color}
                                    />
                                )}

                                <Text 
                                    className="text-base ml-3"
                                    style={{
                                        fontWeight: isSelected ? '700' : '500',
                                        color: isSelected ? '#006AE8' : '#1E293B'
                                    }}
                                >
                                    {cat.name || cat.category_name}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </ScrollView>

            <View className="py-6 border-t border-border">
                {loading ? (
                    <ActivityIndicator size="large" color="#006AE8" />
                ) : (
                    <TouchableOpacity
                        className="w-full py-4 rounded-xl items-center"
                        style={{
                            backgroundColor: selectedCategories.length > 0 ? '#006AE8' : '#E2E8F0',
                            shadowColor: selectedCategories.length > 0 ? '#006AE8' : 'transparent',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: selectedCategories.length > 0 ? 5 : 0
                        }}
                        disabled={selectedCategories.length === 0}
                        onPress={async () => {
                            try {
                                const response = await apiClient.post('/vendors/my-services', {
                                    categories: selectedCategories
                                });
                                
                                if (response.data.success) {
                                    const parentNav = navigation.getParent();
                                    if (parentNav) {
                                        parentNav.reset({
                                            index: 0,
                                            routes: [{ name: 'Main' }],
                                        });
                                    } else {
                                        navigation.replace('Main');
                                    }
                                }
                            } catch (error: any) {
                                Alert.alert('Error', error?.response?.data?.message || 'Failed to save services');
                            }
                        }}
                    >
                        <Text 
                            className="font-semibold text-lg"
                            style={{ color: selectedCategories.length > 0 ? '#FFFFFF' : '#64748B' }}
                        >
                            Continue
                        </Text>
                    </TouchableOpacity>
                )}
                <Text className="text-center text-textSecondary text-xs mt-3">You can add more specific services later.</Text>
            </View>
        </View>
    );
}
