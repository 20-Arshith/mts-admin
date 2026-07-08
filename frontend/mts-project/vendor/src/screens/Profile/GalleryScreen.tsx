import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    ActivityIndicator, Alert, FlatList, Image, Modal,
    Text, TextInput, TouchableOpacity, View, StyleSheet, Dimensions, Platform
} from 'react-native';
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { vendorService, uploadService } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;
const CARD_IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.9);

type GalleryItem = { id: number; image_url: string; caption?: string; created_at: string };

async function buildUploadFormData(uri: string): Promise<FormData> {
    const fd = new FormData() as any;
    fd.append('asset_type', 'gallery');

    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        fd.append('file', blob, 'upload.jpg');
    } else {
        const filename = uri.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        fd.append('file', { uri, name: filename, type: mimeMap[ext] || 'image/jpeg' });
    }
    return fd;
}

export default function GalleryScreen() {
    const navigation = useNavigation<any>();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Caption modal
    const [captionModalVisible, setCaptionModalVisible] = useState(false);
    const [pendingUri, setPendingUri] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    const fetchGallery = useCallback(async () => {
        try {
            setLoading(true);
            const res = await vendorService.getGallery();
            setItems(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            Alert.alert('Error', 'Failed to load gallery.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchGallery();
        }, [fetchGallery])
    );

    const pickAndUpload = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Please allow photo library access to upload images.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setPendingUri(result.assets[0].uri);
        setCaption('');
        setCaptionModalVisible(true);
    };

    const confirmUpload = async () => {
        if (!pendingUri) return;
        setCaptionModalVisible(false);
        setUploading(true);
        try {
            const fd = await buildUploadFormData(pendingUri);
            const uploadRes = await uploadService.uploadImageDirect(fd);
            const imageUrl: string = uploadRes.data?.data?.url;
            if (!imageUrl) throw new Error('Upload failed');
            await vendorService.addGalleryImage(imageUrl, caption.trim() || undefined);
            await fetchGallery();
        } catch (err: any) {
            Alert.alert('Upload Failed', err?.response?.data?.message || 'Could not upload image. Try again.');
        } finally {
            setUploading(false);
            setPendingUri(null);
            setCaption('');
        }
    };

    const confirmDelete = (item: GalleryItem) => {
        Alert.alert(
            'Delete Image',
            'Remove this image from your portfolio?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await vendorService.deleteGalleryImage(item.id);
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                        } catch {
                            Alert.alert('Error', 'Could not delete image.');
                        }
                    },
                },
            ],
        );
    };

    const renderItem = ({ item }: { item: GalleryItem }) => (
        <View style={styles.photoCard}>
            <Image source={{ uri: item.image_url }} style={styles.photoImage} resizeMode="cover" />
            {item.caption ? (
                <Text style={styles.photoCaption} numberOfLines={2}>{item.caption}</Text>
            ) : null}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                <MaterialCommunityIcons name="trash-can" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Portfolio Gallery</Text>
                    <Text style={styles.headerSubtitle}>Photos customers will see on your profile</Text>
                </View>
                <TouchableOpacity
                    onPress={pickAndUpload}
                    disabled={uploading}
                    style={[styles.addBtn, uploading && { opacity: 0.6 }]}
                >
                    {uploading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <MaterialCommunityIcons name="plus" size={22} color="#fff" />}
                </TouchableOpacity>
            </View>

            <View style={styles.statsBar}>
                <MaterialCommunityIcons name="image-multiple-outline" size={18} color="#006AE8" />
                <Text style={styles.statsText}>{items.length} photos uploaded</Text>
            </View>

            {/* Body */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#006AE8" />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="image-off-outline" size={72} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No portfolio images yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Upload photos of your previous work to impress customers and win more bookings.
                    </Text>
                    <TouchableOpacity style={styles.uploadCta} onPress={pickAndUpload} disabled={uploading}>
                        <MaterialCommunityIcons name="camera-plus-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.uploadCtaText}>Upload First Photo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(it) => String(it.id)}
                    numColumns={2}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={styles.gridRow}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        <TouchableOpacity style={styles.addMoreBtn} onPress={pickAndUpload} disabled={uploading}>
                            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#006AE8" style={{ marginRight: 6 }} />
                            <Text style={styles.addMoreText}>Add More Photos</Text>
                        </TouchableOpacity>
                    }
                />
            )}

            {/* Caption Modal */}
            <Modal visible={captionModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add a Caption</Text>
                        <Text style={styles.modalSubtitle}>Describe this photo (optional)</Text>
                        {pendingUri && (
                            <Image source={{ uri: pendingUri }} style={styles.previewImg} resizeMode="cover" />
                        )}
                        <TextInput
                            style={styles.captionInput}
                            placeholder="E.g. Kitchen renovation completed in 2 days"
                            placeholderTextColor="#94A3B8"
                            value={caption}
                            onChangeText={setCaption}
                            maxLength={100}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => { setCaptionModalVisible(false); setPendingUri(null); }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={confirmUpload}>
                                <Text style={styles.modalConfirmText}>Upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 56, paddingBottom: 18, paddingHorizontal: 18,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: '#F1F5F9',
    },
    headerTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
    addBtn: {
        backgroundColor: '#006AE8',
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    statsBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#DBEAFE',
    },
    statsText: { color: '#006AE8', fontSize: 13, fontWeight: '600', marginLeft: 8 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    uploadCta: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#006AE8', paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 14, marginTop: 28,
        shadowColor: '#006AE8', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    uploadCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    grid: { padding: 14, paddingBottom: 28 },
    gridRow: { justifyContent: 'space-between' },
    photoCard: {
        width: CARD_WIDTH,
        marginBottom: 14,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    photoImage: { width: '100%', height: CARD_IMAGE_HEIGHT, backgroundColor: '#E2E8F0' },
    photoCaption: { color: '#334155', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 9, lineHeight: 16 },
    deleteBtn: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(239,68,68,0.85)',
        borderRadius: 12, padding: 4,
    },
    addMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 16, marginBottom: 32, paddingVertical: 14,
        borderWidth: 1.5, borderColor: '#006AE8', borderStyle: 'dashed',
        borderRadius: 14, marginHorizontal: 12,
    },
    addMoreText: { color: '#006AE8', fontWeight: '600', fontSize: 14 },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
    previewImg: { width: '100%', height: 180, borderRadius: 12, marginBottom: 14 },
    captionInput: {
        backgroundColor: '#F1F5F9', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 14, color: '#1E293B', marginBottom: 20,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalCancel: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center',
    },
    modalCancelText: { color: '#64748B', fontWeight: '600' },
    modalConfirm: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        backgroundColor: '#006AE8', alignItems: 'center',
        shadowColor: '#006AE8', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    modalConfirmText: { color: '#fff', fontWeight: '700' },
});
