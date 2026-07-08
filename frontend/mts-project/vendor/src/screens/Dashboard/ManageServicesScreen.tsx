import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../services/api';
import { getVendorCategoryMeta } from '../../utils/categoryMeta';

export default function ManageServicesScreen() {
    const navigation = useNavigation<any>();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formatPrice = (service: any) => {
        const min = service.price_min ?? service.price;
        const max = service.price_max;

        if (min === null || min === undefined || min === '') {
            return 'Rs N/A';
        }

        if (max !== null && max !== undefined && max !== '' && Number(max) !== Number(min)) {
            return `Rs ${min} - ${max}`;
        }

        return `Rs ${min}`;
    };

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/vendors/profile');
            const vendorData = response.data?.data?.vendor ?? response.data?.data;
            setServices(vendorData?.services || []);
        } catch {
            console.error('Failed to fetch services');
            Alert.alert('Error', 'Could not load your services.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchServices();
        }, [])
    );

    const toggleServiceAvailability = async (serviceId: number, isCurrentlyAvailable: boolean) => {
        try {
            await apiClient.patch(`/vendors/services/${serviceId}/availability`, { is_available: !isCurrentlyAvailable });
            fetchServices();
        } catch {
            Alert.alert('Error', 'Could not update service availability.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Services</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#006AE8" style={{ marginTop: 40 }} />
                ) : services.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="briefcase-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>No services found</Text>
                        <Text style={styles.emptySubtitle}>You have not added any services yet.</Text>
                    </View>
                ) : (
                    services.map((service, index) => {
                        const meta = getVendorCategoryMeta(service.category?.icon_name, service.category?.category_name);
                        const isApproved = service.approval_status === 'approved';
                        return (
                            <View key={service.id || index} style={styles.serviceCard}>
                                <View style={styles.serviceHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
                                        <MaterialIcons name={meta.icon as any} size={24} color={meta.color} />
                                    </View>
                                    <View style={styles.serviceInfo}>
                                        <Text style={styles.serviceTitle}>{service.service_title || service.category?.category_name}</Text>
                                        <Text style={styles.servicePrice}>{formatPrice(service)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: service.approval_status === 'approved' ? '#DCFCE7' : '#FEF9C3' }]}>
                                        <Text style={[styles.statusText, { color: service.approval_status === 'approved' ? '#166534' : '#854D0E' }]}>
                                            {service.approval_status === 'approved' ? 'Approved' : 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.serviceActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, !isApproved && styles.actionButtonDisabled]}
                                        disabled={!isApproved}
                                        onPress={() => toggleServiceAvailability(service.id, service.is_available)}
                                    >
                                        <MaterialCommunityIcons 
                                            name={isApproved ? (service.is_available ? "eye-outline" : "eye-off-outline") : "timer-sand"} 
                                            size={20} 
                                            color="#64748B" 
                                        />
                                        <Text style={styles.actionText}>
                                            {!isApproved ? 'Awaiting admin approval' : service.is_available ? 'Visible to users' : 'Hidden from users'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => navigation.navigate('AddService', { service })}
                                    >
                                        <MaterialCommunityIcons name="pencil-outline" size={20} color="#006AE8" />
                                        <Text style={[styles.actionText, { color: '#006AE8' }]}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddService')}>
                    <Text style={styles.addButtonText}>Add New Service</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 8,
    },
    serviceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    servicePrice: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    serviceActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    actionButtonDisabled: {
        opacity: 0.75,
    },
    actionText: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginLeft: 8,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    addButton: {
        backgroundColor: '#006AE8',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
