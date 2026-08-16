import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { announcementService, uploadService } from '../services/api';

type AnnouncementKind = 'text' | 'image';

type Announcement = {
    announcement_id: number;
    message: string;
    image_url?: string | null;
    location_identifier: string;
    start_at?: string;
    expires_at?: string;
    is_active: boolean;
    approval_status?: string;
    status?: string;
    created_at?: string;
};

const postalCodePattern = /\b\d{5,6}\b/;
const dateInputPattern = /^\d{4}-\d{2}-\d{2}$/;

const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const getDefaultStartDate = () => toDateInputValue(new Date());
const getDefaultEndDate = () => toDateInputValue(addDays(new Date(), 1));

const dateInputFromIso = (value?: string | null, fallback = '') => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return toDateInputValue(parsed);
};

const startIsoFromDateInput = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const endIsoFromDateInput = (value: string) => new Date(`${value}T23:59:59.999`).toISOString();

const formatDateRange = (start?: string | null, end?: string | null) => {
    const format = (value?: string | null) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const startLabel = format(start);
    const endLabel = format(end);
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
    if (startLabel) return `From ${startLabel}`;
    if (endLabel) return `Until ${endLabel}`;
    return 'No schedule';
};

const normalizeApprovalStatus = (value?: string | null) => {
    const normalized = String(value || 'pending').trim().toLowerCase();
    if (['approved', 'approve', 'accepted'].includes(normalized)) return 'approved';
    if (['rejected', 'reject', 'declined'].includes(normalized)) return 'rejected';
    return 'pending';
};

const getApprovalStatusLabel = (value?: string | null) => {
    const normalized = normalizeApprovalStatus(value);
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return 'Pending approval';
};

const getApprovalStatusColor = (value?: string | null) => {
    const normalized = normalizeApprovalStatus(value);
    if (normalized === 'approved') return { text: '#15803D', bg: '#DCFCE7', border: '#86EFAC' };
    if (normalized === 'rejected') return { text: '#B91C1C', bg: '#FEE2E2', border: '#FCA5A5' };
    return { text: '#92400E', bg: '#FEF3C7', border: '#FCD34D' };
};

const resolveDefaultLocation = (address?: string | null) => {
    const value = String(address || '').trim();
    const postalCode = value.match(postalCodePattern)?.[0];
    if (postalCode) return postalCode;

    const parts = value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    return parts[parts.length - 1] || parts[0] || '';
};

const emptyForm = (defaultLocation: string) => ({
    announcement_id: null as number | null,
    message: '',
    image_url: '',
    location_identifier: defaultLocation,
    start_date: getDefaultStartDate(),
    end_date: getDefaultEndDate(),
    is_active: true,
    kind: 'text' as AnnouncementKind,
});

async function buildUploadFormData(uri: string): Promise<FormData> {
    const fd = new FormData() as any;
    fd.append('asset_type', 'announcement');

    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        fd.append('file', blob, 'announcement.jpg');
    } else {
        const filename = uri.split('/').pop() || 'announcement.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
        };
        fd.append('file', { uri, name: filename, type: mimeMap[ext] || 'image/jpeg' });
    }

    return fd;
}

export default function VendorAnnouncementManager({ vendorAddress }: { vendorAddress?: string | null }) {
    const defaultLocation = useMemo(() => resolveDefaultLocation(vendorAddress), [vendorAddress]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [form, setForm] = useState(emptyForm(defaultLocation));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<number | null>(null);

    useEffect(() => {
        setForm((current) => ({
            ...current,
            location_identifier: current.location_identifier || defaultLocation,
        }));
    }, [defaultLocation]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await announcementService.getMine();
            setAnnouncements(Array.isArray(response.data?.data) ? response.data.data : []);
        } catch (error) {
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const resetForm = () => {
        setForm(emptyForm(defaultLocation));
    };

    const loadAnnouncement = (announcement: Announcement) => {
        setForm({
            announcement_id: announcement.announcement_id,
            message: announcement.message || '',
            image_url: announcement.image_url || '',
            location_identifier: announcement.location_identifier || defaultLocation,
            start_date: dateInputFromIso(announcement.start_at, getDefaultStartDate()),
            end_date: dateInputFromIso(announcement.expires_at, getDefaultEndDate()),
            is_active: Boolean(announcement.is_active),
            kind: announcement.image_url ? 'image' : 'text',
        });
    };

    const pickAnnouncementImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow photo library access.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: true,
            aspect: [16, 9],
        });

        if (result.canceled || !result.assets?.[0]?.uri) return;

        setUploadingImage(true);
        try {
            const formData = await buildUploadFormData(result.assets[0].uri);
            const response = await uploadService.uploadImageDirect(formData);
            const imageUrl = response.data?.data?.url;
            if (!imageUrl) throw new Error('Upload failed');

            setForm((current) => ({
                ...current,
                image_url: imageUrl,
                kind: 'image',
            }));
        } catch (error: any) {
            Alert.alert('Upload failed', error?.response?.data?.message || 'Could not upload photo.');
        } finally {
            setUploadingImage(false);
        }
    };

    const saveAnnouncement = async () => {
        const message = form.message.trim();
        const locationIdentifier = form.location_identifier.trim();

        if (!message) {
            Alert.alert('Message required', 'Add the broadcast text users should see.');
            return;
        }

        if (!locationIdentifier) {
            Alert.alert('Location required', 'Add a pincode, city, or region for this broadcast.');
            return;
        }

        if (form.kind === 'image' && !form.image_url.trim()) {
            Alert.alert('Photo required', 'Upload a photo or switch to text only.');
            return;
        }

        if (!dateInputPattern.test(form.start_date) || !dateInputPattern.test(form.end_date)) {
            Alert.alert('Date format required', 'Use YYYY-MM-DD for start and end dates.');
            return;
        }

        const startAt = new Date(`${form.start_date}T00:00:00`);
        const expiresAt = new Date(`${form.end_date}T23:59:59.999`);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startAt) {
            Alert.alert('Invalid date range', 'End date must be after the start date.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                message,
                location_identifier: locationIdentifier,
                is_active: form.is_active,
                image_url: form.kind === 'image' ? form.image_url.trim() : null,
                start_at: startIsoFromDateInput(form.start_date),
                expires_at: endIsoFromDateInput(form.end_date),
            };

            if (form.announcement_id) {
                await announcementService.update(form.announcement_id, payload);
            } else {
                await announcementService.create(payload);
            }

            await fetchAnnouncements();
            resetForm();
            Alert.alert('Broadcast sent for review', 'Admin approval is required before users can see this broadcast.');
        } catch (error: any) {
            Alert.alert('Could not save broadcast', error?.response?.data?.message || 'Please try again later.');
        } finally {
            setSaving(false);
        }
    };

    const toggleAnnouncementStatus = async (announcement: Announcement) => {
        try {
            const nextStatus = !announcement.is_active;
            setAnnouncements((current) =>
                current.map((item) =>
                    item.announcement_id === announcement.announcement_id
                        ? { ...item, is_active: nextStatus }
                        : item
                )
            );
            await announcementService.update(announcement.announcement_id, { is_active: nextStatus });
        } catch (error: any) {
            await fetchAnnouncements();
            Alert.alert('Status not updated', error?.response?.data?.message || 'Please try again later.');
        }
    };

    const deleteAnnouncement = async (announcement: Announcement) => {
        const deletedId = announcement.announcement_id;
        if (deletingAnnouncementId) {
            return;
        }

        setDeletingAnnouncementId(deletedId);
        setAnnouncements((current) =>
            current.filter((item) => item.announcement_id !== deletedId)
        );

        if (form.announcement_id === deletedId) {
            resetForm();
        }

        try {
            await announcementService.delete(deletedId);
        } catch (error: any) {
            Alert.alert(
                'Broadcast removed from this screen',
                error?.response?.data?.message || 'It could not be deleted from the server. Please try again later.'
            );
        } finally {
            setDeletingAnnouncementId(null);
        }
    };

    return (
        <View
            style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 7,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800' }}>Broadcast to customers</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                        Updates are sent to admin for approval before they appear in the user app.
                    </Text>
                </View>
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        backgroundColor: '#EAF2FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MaterialCommunityIcons name="bullhorn-outline" size={24} color="#0E63D7" />
                </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14, backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 }}>
                {(['text', 'image'] as AnnouncementKind[]).map((kind) => (
                    <TouchableOpacity
                        key={kind}
                        onPress={() => setForm((current) => ({ ...current, kind }))}
                        style={{
                            flex: 1,
                            borderRadius: 11,
                            paddingVertical: 9,
                            alignItems: 'center',
                            backgroundColor: form.kind === kind ? '#0E63D7' : 'transparent',
                        }}
                    >
                        <Text style={{ color: form.kind === kind ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: '800' }}>
                            {kind === 'text' ? 'Text only' : 'Image + text'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 7 }}>
                Broadcast text
            </Text>
            <TextInput
                value={form.message}
                onChangeText={(value) => setForm((current) => ({ ...current, message: value }))}
                placeholder="Example: Service unavailable in some areas today"
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                    minHeight: 84,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: '#111827',
                    fontSize: 14,
                    textAlignVertical: 'top',
                    backgroundColor: '#F8FAFC',
                }}
            />

            {form.kind === 'image' ? (
                <>
                    <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 7 }}>
                        Broadcast photo
                    </Text>
                    {form.image_url ? (
                        <View
                            style={{
                                borderRadius: 16,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                                backgroundColor: '#F8FAFC',
                            }}
                        >
                            <Image
                                source={{ uri: form.image_url }}
                                resizeMode="cover"
                                style={{ width: '100%', height: 148 }}
                            />
                            <View style={{ flexDirection: 'row', padding: 10 }}>
                                <TouchableOpacity
                                    onPress={pickAnnouncementImage}
                                    disabled={uploadingImage}
                                    style={{
                                        flex: 1,
                                        borderRadius: 12,
                                        paddingVertical: 10,
                                        backgroundColor: '#EAF2FF',
                                        alignItems: 'center',
                                        marginRight: 8,
                                    }}
                                >
                                    <Text style={{ color: '#0E63D7', fontWeight: '800', fontSize: 12 }}>
                                        Replace photo
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setForm((current) => ({ ...current, image_url: '' }))}
                                    disabled={uploadingImage}
                                    style={{
                                        width: 88,
                                        borderRadius: 12,
                                        paddingVertical: 10,
                                        borderWidth: 1,
                                        borderColor: '#CBD5E1',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#475569', fontWeight: '800', fontSize: 12 }}>
                                        Remove
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={pickAnnouncementImage}
                            disabled={uploadingImage}
                            activeOpacity={0.85}
                            style={{
                                minHeight: 112,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: '#93C5FD',
                                backgroundColor: '#F8FAFC',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 14,
                            }}
                        >
                            {uploadingImage ? (
                                <ActivityIndicator size="small" color="#0E63D7" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="image-plus" size={28} color="#0E63D7" />
                                    <Text style={{ color: '#0E63D7', fontWeight: '800', fontSize: 13, marginTop: 8 }}>
                                        Upload photo
                                    </Text>
                                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                                        Saved to Cloudinary after selection
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    {uploadingImage && form.image_url ? (
                        <View
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                top: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ActivityIndicator size="small" color="#0E63D7" />
                        </View>
                    ) : null}
                </>
            ) : null}

            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: form.is_active ? '#F0FDF4' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: form.is_active ? '#BBF7D0' : '#E2E8F0',
                }}
            >
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: form.is_active ? '#15803D' : '#475569', fontWeight: '800', fontSize: 13 }}>
                        {form.is_active ? 'Active broadcast' : 'Inactive draft'}
                    </Text>
                    <Text style={{ color: form.is_active ? '#166534' : '#64748B', fontSize: 11, marginTop: 3 }}>
                        {form.is_active ? 'Will become visible after admin approval.' : 'Saved inactive and hidden from users.'}
                    </Text>
                </View>
                <Switch
                    value={form.is_active}
                    onValueChange={(value) => setForm((current) => ({ ...current, is_active: value }))}
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor="#FFFFFF"
                />
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 7 }}>
                        Start date
                    </Text>
                    <TextInput
                        value={form.start_date}
                        onChangeText={(value) => setForm((current) => ({ ...current, start_date: value.trim() }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: '#111827',
                            fontSize: 13,
                            backgroundColor: '#F8FAFC',
                        }}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 7 }}>
                        End date
                    </Text>
                    <TextInput
                        value={form.end_date}
                        onChangeText={(value) => setForm((current) => ({ ...current, end_date: value.trim() }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: '#111827',
                            fontSize: 13,
                            backgroundColor: '#F8FAFC',
                        }}
                    />
                </View>
            </View>
            <Text style={{ color: '#64748B', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                Broadcasts are visible from the start date through the end date.
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <TouchableOpacity
                    onPress={saveAnnouncement}
                    disabled={saving}
                    style={{
                        flex: 1,
                        backgroundColor: saving ? '#93C5FD' : '#0E63D7',
                        borderRadius: 16,
                        paddingVertical: 13,
                        alignItems: 'center',
                        marginRight: 10,
                    }}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                            {form.announcement_id ? 'Update broadcast' : 'Save broadcast'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={resetForm}
                    disabled={saving}
                    style={{
                        width: 96,
                        borderRadius: 16,
                        paddingVertical: 13,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                    }}
                >
                    <Text style={{ color: '#475569', fontWeight: '800', fontSize: 14 }}>Clear</Text>
                </TouchableOpacity>
            </View>

            <View style={{ marginTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: '#111827', fontSize: 14, fontWeight: '800' }}>Your broadcasts</Text>
                    {loading ? <ActivityIndicator size="small" color="#0E63D7" /> : null}
                </View>

                {announcements.length === 0 && !loading ? (
                    <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18 }}>
                        No broadcasts yet. Save one above and it will appear here.
                    </Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {announcements.map((announcement) => (
                            <View
                                key={announcement.announcement_id}
                                style={{
                                    width: 240,
                                    marginRight: 10,
                                    borderRadius: 18,
                                    borderWidth: 1,
                                    borderColor: announcement.is_active ? '#BBF7D0' : '#E2E8F0',
                                    backgroundColor: announcement.is_active ? '#F0FDF4' : '#F8FAFC',
                                    padding: 12,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {(() => {
                                        const statusColors = getApprovalStatusColor(announcement.status || announcement.approval_status);
                                        return (
                                            <Text
                                                style={{
                                                    color: statusColors.text,
                                                    backgroundColor: statusColors.bg,
                                                    borderColor: statusColors.border,
                                                    borderWidth: 1,
                                                    borderRadius: 999,
                                                    overflow: 'hidden',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    fontWeight: '800',
                                                    fontSize: 11,
                                                }}
                                            >
                                                {getApprovalStatusLabel(announcement.status || announcement.approval_status)}
                                            </Text>
                                        );
                                    })()}
                                    <Text
                                        style={{
                                            color: announcement.is_active ? '#15803D' : '#64748B',
                                            fontWeight: '800',
                                            fontSize: 12,
                                        }}
                                    >
                                        {announcement.is_active ? 'Active' : 'Inactive'}
                                    </Text>
                                    <TouchableOpacity onPress={() => toggleAnnouncementStatus(announcement)}>
                                        <Text style={{ color: '#0E63D7', fontSize: 12, fontWeight: '800' }}>
                                            {announcement.is_active ? 'Turn off' : 'Turn on'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 8 }} numberOfLines={3}>
                                    {announcement.message}
                                </Text>
                                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 8 }} numberOfLines={1}>
                                    Location: {announcement.location_identifier}
                                </Text>
                                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                                    Visible: {formatDateRange(announcement.start_at, announcement.expires_at)}
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => loadAnnouncement(announcement)}
                                        style={{
                                            flex: 1,
                                            borderRadius: 12,
                                            paddingVertical: 8,
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: '#BFDBFE',
                                            backgroundColor: '#EFF6FF',
                                            marginRight: 8,
                                        }}
                                    >
                                        <Text style={{ color: '#0E63D7', fontSize: 12, fontWeight: '800' }}>
                                            Edit
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => deleteAnnouncement(announcement)}
                                        disabled={deletingAnnouncementId === announcement.announcement_id}
                                        style={{
                                            flex: 1,
                                            borderRadius: 12,
                                            paddingVertical: 8,
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: '#FCA5A5',
                                            backgroundColor: deletingAnnouncementId === announcement.announcement_id ? '#FEE2E2' : '#FEF2F2',
                                        }}
                                    >
                                        <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '800' }}>
                                            {deletingAnnouncementId === announcement.announcement_id ? 'Deleting...' : 'Delete'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
