import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
    Alert, Image, Platform, ScrollView, Text,
    TextInput, TouchableOpacity, View, ActivityIndicator,
    StyleSheet, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { vendorService, uploadService } from '../../services/api';
import { getVendorCategoryMeta, isVendorCustomCategoryIcon } from '../../utils/categoryMeta';

const MAX_SERVICE_IMAGES = 5;

const normalizeCategoryId = (value: any) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function buildUploadFormData(uri: string, assetType: string): Promise<FormData> {
    const fd = new FormData() as any;
    fd.append('asset_type', assetType);

    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        fd.append('file', blob, 'upload.jpg');
    } else {
        const filename = uri.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
        };
        fd.append('file', { uri, name: filename, type: mimeMap[ext] || 'image/jpeg' });
    }
    return fd;
}

export default function AddServiceScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const existingService = route.params?.service;

    // ── Form State ────────────────────────────────────────────────────────────
    const [serviceName, setServiceName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState('');

    // ── Image State ───────────────────────────────────────────────────────────
    const [serviceImages, setServiceImages] = useState<string[]>([]);   // final Cloudinary URLs
    const [localPreviews, setLocalPreviews] = useState<string[]>([]);   // local URIs while uploading
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);

    const returnAfterSave = () => {
        if (navigation.canGoBack()) { navigation.goBack(); return; }
        navigation.navigate('Tabs', { screen: 'ProfileMain', params: { screen: 'EditProfile' } });
    };

    const showSuccessAndReturn = () => {
        const message = `"${serviceName}" has been sent to admin for approval. It will be visible to users only after approval.`;
        if (Platform.OS === 'web') { Alert.alert('Success', message); returnAfterSave(); return; }
        Alert.alert('Success', message, [{ text: 'OK', onPress: returnAfterSave }]);
    };

    // ── Load categories ───────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            setCategoriesLoading(true);
            setCategoriesError('');
            try {
                const res = await vendorService.getCategories();
                setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
            } catch {
                setCategories([]);
                setCategoriesError('Unable to load service categories. Please try again.');
            } finally {
                setCategoriesLoading(false);
            }
        })();
    }, []);

    // ── Populate edit mode ────────────────────────────────────────────────────
    useEffect(() => {
        if (!existingService) return;
        setServiceName(existingService.service_title || '');
        setDescription(existingService.description || '');
        setPrice(existingService.price_min ? String(existingService.price_min) : '');
        const existingCategoryId = normalizeCategoryId(existingService.category_id || existingService.category?.category_id);
        setSelectedCategory(existingService.category ? { ...existingService.category, category_id: existingCategoryId } : null);
        const existing: string[] = Array.isArray(existingService.image_urls) ? existingService.image_urls : [];
        setServiceImages(existing);
        setLocalPreviews(existing);
    }, [existingService]);

    useEffect(() => {
        if (!existingService || categories.length === 0) return;
        const existingCategoryId = normalizeCategoryId(existingService.category_id || existingService.category?.category_id);
        const match = categories.find((c) => normalizeCategoryId(c.category_id) === existingCategoryId);
        if (match) setSelectedCategory(match);
    }, [categories, existingService]);

    // ── Image Picker ──────────────────────────────────────────────────────────
    const pickServiceImage = async () => {
        if (localPreviews.length >= MAX_SERVICE_IMAGES) {
            Alert.alert('Limit Reached', `You can add up to ${MAX_SERVICE_IMAGES} images per service.`);
            return;
        }
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Please allow photo library access.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const uri = result.assets[0].uri;
        const idx = localPreviews.length;
        setLocalPreviews((prev) => [...prev, uri]);
        setUploadingIdx(idx);
        try {
            const fd = await buildUploadFormData(uri, 'service_image');
            const res = await uploadService.uploadImageDirect(fd);
            const cloudUrl: string = res.data?.data?.url;
            if (!cloudUrl) throw new Error('Upload failed');
            setServiceImages((prev) => [...prev, cloudUrl]);
        } catch (err: any) {
            // Remove the local preview on failure
            setLocalPreviews((prev) => prev.filter((_, i) => i !== idx));
            Alert.alert('Upload Failed', err?.response?.data?.message || 'Could not upload image.');
        } finally {
            setUploadingIdx(null);
        }
    };

    const removeServiceImage = (idx: number) => {
        setLocalPreviews((prev) => prev.filter((_, i) => i !== idx));
        setServiceImages((prev) => prev.filter((_, i) => i !== idx));
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const trimmedName = serviceName.trim();
        const numericPrice = Number(price);
        if (!trimmedName || !price.trim() || !selectedCategory) {
            Alert.alert('Missing Fields', 'Please fill in service name, category, and price.');
            return;
        }
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            Alert.alert('Invalid Price', 'Please enter a valid price.');
            return;
        }
        if (uploadingIdx !== null) {
            Alert.alert('Please Wait', 'An image is still uploading. Wait for it to finish.');
            return;
        }
        setLoading(true);
        try {
            const selectedCategoryId = normalizeCategoryId(selectedCategory.category_id);
            if (!selectedCategoryId) {
                Alert.alert('Missing Fields', 'Please choose a valid service category.');
                return;
            }
            const payload = {
                category_id: selectedCategoryId,
                service_title: trimmedName,
                description: description.trim(),
                price_min: numericPrice,
                price_max: numericPrice,
                image_urls: serviceImages,
            };
            if (existingService?.id) {
                await vendorService.updateService(existingService.id, payload);
            } else {
                await vendorService.addService(payload);
            }
            showSuccessAndReturn();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to save service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {existingService ? 'Edit Service' : 'Add New Service'}
                </Text>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Category Picker */}
                <Text style={styles.label}>Category *</Text>
                {categoriesLoading && <Text style={styles.hint}>Loading categories...</Text>}
                {!categoriesLoading && categories.length === 0 && (
                    <Text style={styles.errorText}>{categoriesError || 'No categories available.'}</Text>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {categories.map((cat) => {
                        const meta = getVendorCategoryMeta(cat.icon_name, cat.category_name);
                        const selected = normalizeCategoryId(selectedCategory?.category_id) === normalizeCategoryId(cat.category_id);
                        const customIcon = isVendorCustomCategoryIcon(cat.icon_name);
                        return (
                            <TouchableOpacity
                                key={cat.category_id}
                                onPress={() => setSelectedCategory(cat)}
                                style={[styles.chip, selected && styles.chipSelected]}
                            >
                                {customIcon ? (
                                    <Image
                                        source={{ uri: cat.icon_name }}
                                        resizeMode="cover"
                                        style={{ width: 18, height: 18, borderRadius: 9, marginRight: 6 }}
                                    />
                                ) : (
                                    <MaterialIcons
                                        name={meta.icon as any}
                                        size={16}
                                        color={selected ? '#FFFFFF' : meta.color}
                                        style={{ marginRight: 6 }}
                                    />
                                )}
                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                    {cat.category_name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Service Name */}
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="E.g. Deep House Cleaning"
                    placeholderTextColor="#94A3B8"
                    value={serviceName}
                    onChangeText={setServiceName}
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, { height: 90 }]}
                    placeholder="What does this service include?"
                    placeholderTextColor="#94A3B8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                />

                {/* Price */}
                <Text style={styles.label}>Price (₹) *</Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24 }]}
                    placeholder="500"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />

                {/* ── Service Images ─────────────────────────────────────── */}
                <Text style={styles.label}>Service Images</Text>
                <Text style={styles.hint}>
                    Add up to {MAX_SERVICE_IMAGES} photos that showcase this service. These help customers
                    understand what to expect.
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {localPreviews.map((uri, idx) => (
                        <View key={idx} style={styles.imgThumb}>
                            <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                            {uploadingIdx === idx ? (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="small" color="#fff" />
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.removeBtn} onPress={() => removeServiceImage(idx)}>
                                    <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    {localPreviews.length < MAX_SERVICE_IMAGES && (
                        <TouchableOpacity style={styles.addImgBtn} onPress={pickServiceImage}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={28} color="#006AE8" />
                            <Text style={styles.addImgText}>Add Photo</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="information-outline" size={18} color="#006AE8" style={{ marginTop: 1 }} />
                    <Text style={styles.infoText}>
                        New or edited services are sent to admin for approval and become visible to users only after approval.
                    </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading || categoriesLoading}
                    style={[styles.saveBtn, (loading || categoriesLoading) && { opacity: 0.7 }]}
                >
                    <Text style={styles.saveBtnText}>
                        {loading ? 'Saving...' : existingService ? 'Update Service' : 'Save Service'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#006AE8',
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center',
    },
    headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
    label: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
    hint: { fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 18 },
    errorText: { fontSize: 13, color: '#EF4444', marginBottom: 14 },
    input: {
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
        fontSize: 15, color: '#1E293B', marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8,
        borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF',
        flexDirection: 'row', alignItems: 'center',
    },
    chipSelected: { borderColor: '#006AE8', backgroundColor: '#006AE8' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    chipTextSelected: { color: '#FFFFFF' },
    // Image row
    imgThumb: {
        width: 100, height: 100, borderRadius: 12, marginRight: 10,
        overflow: 'hidden', backgroundColor: '#E2E8F0',
    },
    thumbImg: { width: '100%', height: '100%' },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center', justifyContent: 'center',
    },
    removeBtn: {
        position: 'absolute', top: 4, right: 4,
        backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 12,
    },
    addImgBtn: {
        width: 100, height: 100, borderRadius: 12,
        borderWidth: 2, borderColor: '#006AE8', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
        backgroundColor: '#EFF6FF',
    },
    addImgText: { fontSize: 11, fontWeight: '600', color: '#006AE8', marginTop: 4 },
    infoBanner: {
        backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
        flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24,
    },
    infoText: { marginLeft: 10, color: '#3B82F6', fontSize: 13, flex: 1, lineHeight: 19 },
    saveBtn: {
        backgroundColor: '#006AE8', paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', marginBottom: 32,
        shadowColor: '#006AE8', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
