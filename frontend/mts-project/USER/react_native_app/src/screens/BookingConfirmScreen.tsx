import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { getServiceMeta } from '../utils/serviceHelpers';
import api from '../utils/api';
import { detectCurrentLocation, looksLikeCoordinateAddress, syncUserLocation } from '../utils/location';

const formatDisplayDate = (dateValue: string) =>
  new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const BookingConfirmScreen = ({ navigation, route }: any) => {
  const {
    vendorId,
    vendorName = 'CleanCo Pro',
    vendorType = 'Home Cleaning',
    services = [],
    preselectedService = null,
  } = route.params || {};

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(preselectedService);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityDates, setAvailabilityDates] = useState<any[]>([]);

  const meta = getServiceMeta(selectedService?.name || vendorType);

  const fetchLiveLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const detectedLocation = await detectCurrentLocation();
      setAddress(detectedLocation.address);
      await syncUserLocation(detectedLocation);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch your location. Please enter it manually.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    const preloadAddress = async () => {
      try {
        const profileResponse = await api.get('/users/profile');
        const savedAddress = profileResponse.data?.data?.profile?.address;

        if (savedAddress && !looksLikeCoordinateAddress(savedAddress)) {
          setAddress(savedAddress);
          return;
        }
      } catch (error) {
        // Fall through to live lookup when profile fetch fails.
      }

      fetchLiveLocation();
    };

    preloadAddress();
  }, []);

  const displayServices = preselectedService ? [preselectedService] : services.length > 0 ? services : [
    { name: `${vendorType} - Basic`, price: 499, duration: '1-2 hrs', description: 'Essential service for quick needs.' },
    { name: `${vendorType} - Standard`, price: 999, duration: '2-3 hrs', description: 'Most popular, thorough coverage.' },
    { name: `${vendorType} - Premium`, price: 1799, duration: '3-5 hrs', description: 'Comprehensive full-service package.' },
  ];

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!vendorId) {
        setAvailabilityError('Vendor availability is not available for this service.');
        setAvailabilityDates([]);
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError('');
      try {
        const res = await api.get(`/users/vendors/${vendorId}/availability`);
        const dates = res.data?.data?.dates || [];
        setAvailabilityDates(dates);

        const firstAvailableDate = dates.find((date: any) => date.is_available);
        if (!firstAvailableDate) {
          setSelectedDate(null);
          setSelectedTime(null);
          setAvailabilityError('This vendor has no open booking slots right now.');
          return;
        }

        setSelectedDate((currentDate) => {
          const nextDate = currentDate && dates.some((date: any) => date.date === currentDate && date.is_available)
            ? currentDate
            : firstAvailableDate.date;
          return nextDate;
        });
      } catch (error: any) {
        setAvailabilityDates([]);
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailabilityError(error?.response?.data?.message || 'Could not load vendor availability.');
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [vendorId]);

  const selectedDateConfig = useMemo(
    () => availabilityDates.find((date) => date.date === selectedDate) || null,
    [availabilityDates, selectedDate]
  );

  const allSlots = selectedDateConfig?.slots || [];

  useEffect(() => {
    if (!selectedDateConfig) {
      setSelectedTime(null);
      return;
    }

    const stillValid = allSlots.some((slot: any) => slot.value === selectedTime && slot.available);
    if (stillValid) {
      return;
    }

    const firstAvailableSlot = allSlots.find((slot: any) => slot.available);
    setSelectedTime(firstAvailableSlot?.value || null);
  }, [allSlots, selectedDateConfig, selectedTime]);

  const handleBook = async () => {
    if (!selectedDate) return Alert.alert('Select Date', 'Please pick an available date.');
    if (!selectedTime) return Alert.alert('Select Time', 'Please pick an available time slot.');
    if (!address.trim()) return Alert.alert('Enter Address', 'Please enter your service address.');

    const vendorServiceId = selectedService?.id || services[0]?.id;
    if (!vendorServiceId || Number.isNaN(Number(vendorServiceId))) {
      return Alert.alert('Error', 'Service information is missing. Please go back and try again.');
    }

    setLoading(true);
    try {
      const totalPrice = typeof selectedService?.price === 'number' ? selectedService.price : Number(selectedService?.price) || 0;
      const scheduledAt = `${selectedDate}T${selectedTime}:00`;

      const res = await api.post('/bookings', {
        vendor_service_id: Number(vendorServiceId),
        scheduled_at: scheduledAt,
        address,
        total_price: totalPrice,
      });

      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to book');

      setIsBooked(true);
    } catch (e: any) {
      Alert.alert('Booking Error', e.message || 'Could not place booking.');
    } finally {
      setLoading(false);
    }
  };

  if (isBooked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ backgroundColor: meta.color, paddingTop: 54, paddingBottom: 44, alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="checkmark-circle-outline" size={44} color="white" />
            </View>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Booking Request Sent</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, marginTop: 6, textAlign: 'center', paddingHorizontal: 36, lineHeight: 20 }}>
              Your request is with {vendorName}. You&apos;ll be notified once they accept.
            </Text>
          </View>

          <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 18, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F3F5' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 }}>Booking Summary</Text>
            {[
              { label: 'Vendor', value: vendorName, icon: 'store' },
              { label: 'Service', value: selectedService?.name || vendorType, icon: 'miscellaneous-services' },
              { label: 'Date', value: selectedDate ? formatDisplayDate(selectedDate) : '-', icon: 'calendar-today' },
              { label: 'Time', value: selectedTimeConfigLabel(selectedDateConfig, selectedTime), icon: 'access-time' },
              { label: 'Address', value: address, icon: 'location-on' },
              { label: 'Amount', value: `₹${selectedService?.price || '-'}`, icon: 'currency-rupee' },
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MaterialIcons name={row.icon as any} size={16} color="#374151" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{row.label}</Text>
                  <Text style={{ fontSize: 13.5, color: '#111827', fontWeight: '500', marginTop: 1 }}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FDE68A' }}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" style={{ marginRight: 10, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#92400E' }}>Waiting for vendor acceptance</Text>
              <Text style={{ fontSize: 12.5, color: '#78350F', lineHeight: 18, marginTop: 3 }}>
                Contact details and tracking will be available once {vendorName} accepts your booking.
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'Bookings' })}
              style={{ backgroundColor: '#007BFF', borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 2 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>View My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.popToTop()}
              style={{ paddingVertical: 13, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>Select Service</Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{vendorName} · Step 1 of 2</Text>
          </View>
        </View>
        <View style={{ height: 3, backgroundColor: '#F1F3F5' }}>
          <View style={{ width: '50%', height: '100%', backgroundColor: '#007BFF' }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 14 }}>
            Choose a service to book from {vendorName}
          </Text>
          {displayServices.map((svc: any, i: number) => {
            const isSelected = selectedService?.name === svc.name;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedService(svc)}
                style={{ backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, padding: 16, borderWidth: 1.5, borderColor: isSelected ? '#007BFF' : '#F1F3F5', elevation: isSelected ? 3 : 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#111827' }}>{svc.name}</Text>
                    {svc.description ? <Text style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 3, lineHeight: 18 }}>{svc.description}</Text> : null}
                    {svc.duration ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 5 }}>{svc.duration}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 14 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>₹{svc.price}</Text>
                    {isSelected && (
                      <View style={{ marginTop: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#007BFF', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F3F5' }}>
          <TouchableOpacity
            onPress={() => {
              if (!selectedService) return Alert.alert('Select Service', 'Please choose a service.');
              setStep(2);
            }}
            style={{ backgroundColor: selectedService ? '#007BFF' : '#E5E7EB', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
          >
            <Text style={{ color: selectedService ? '#fff' : '#9CA3AF', fontWeight: '700', fontSize: 15 }}>
              {selectedService ? `Continue · ₹${selectedService.price}` : 'Select a Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' }}>
        <TouchableOpacity onPress={() => setStep(1)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>Schedule</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{vendorName} · Step 2 of 2</Text>
        </View>
      </View>
      <View style={{ height: 3, backgroundColor: '#F1F3F5' }}>
        <View style={{ width: '100%', height: '100%', backgroundColor: '#007BFF' }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${meta.color}10`, marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 12 }}>
        <MaterialIcons name={getServiceMeta(selectedService?.name || vendorType).icon as any} size={18} color={meta.color} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: meta.color }}>{selectedService?.name}</Text>
          <Text style={{ fontSize: 12, color: meta.color, opacity: 0.8 }}>{vendorName}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: meta.color }}>₹{selectedService?.price}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 }}>Select Date</Text>

        {availabilityLoading ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 22 }}>
            <ActivityIndicator size="small" color="#007BFF" />
            <Text style={{ color: '#6B7280', marginTop: 10 }}>Loading vendor time slots...</Text>
          </View>
        ) : availabilityError ? (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginBottom: 22, borderWidth: 1, borderColor: '#FECACA' }}>
            <Text style={{ color: '#991B1B', fontWeight: '600' }}>{availabilityError}</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
              {availabilityDates.map((dateOption) => {
                const isSelected = selectedDate === dateOption.date;
                const canInspectDate = dateOption.is_available || dateOption.slots.length > 0;
                const isFullyBlocked = !dateOption.is_available && dateOption.slots.length > 0;
                return (
                  <TouchableOpacity
                    key={dateOption.date}
                    onPress={() => canInspectDate && setSelectedDate(dateOption.date)}
                    disabled={!canInspectDate}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      backgroundColor: isSelected ? '#007BFF' : isFullyBlocked ? '#FEF2F2' : '#fff',
                      borderWidth: 1,
                      borderColor: isSelected ? '#007BFF' : isFullyBlocked ? '#FCA5A5' : '#E5E7EB',
                      opacity: canInspectDate ? 1 : 0.45,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.75)' : isFullyBlocked ? '#B91C1C' : '#9CA3AF' }}>{dateOption.label}</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: isSelected ? '#fff' : '#111827', marginVertical: 1 }}>{dateOption.day_number}</Text>
                    <Text style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.75)' : isFullyBlocked ? '#B91C1C' : '#9CA3AF' }}>{dateOption.month_label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 }}>Select Time</Text>
            {selectedDateConfig ? (
              <View style={{ marginBottom: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#007BFF', marginRight: 6 }} />
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Available</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FCA5A5', marginRight: 6 }} />
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Booked or unavailable</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {selectedDateConfig.slots.map((slot: any) => {
                  const isSelected = selectedTime === slot.value;
                  const isUnavailable = !slot.available;
                  return (
                  <TouchableOpacity
                    key={slot.value}
                    onPress={() => slot.available && setSelectedTime(slot.value)}
                    disabled={!slot.available}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: isSelected ? '#007BFF' : isUnavailable ? '#FEF2F2' : '#fff',
                      borderWidth: 1,
                      borderColor: isSelected ? '#007BFF' : isUnavailable ? '#FCA5A5' : '#E5E7EB',
                      opacity: 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? '#fff' : isUnavailable ? '#B91C1C' : '#374151' }}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                )})}
                </View>
                {selectedDateConfig.slots.length === 0 && (
                  <Text style={{ color: '#9CA3AF' }}>
                    {selectedDateConfig.is_available ? 'No slots configured for this day.' : 'Vendor is unavailable on this day.'}
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}

        <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 }}>Service Address</Text>

        <TouchableOpacity
          onPress={fetchLiveLocation}
          disabled={isFetchingLocation}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${meta.color}10`, borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: `${meta.color}30` }}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={meta.color} style={{ marginRight: 10 }} />
          ) : (
            <MaterialIcons name="my-location" size={18} color={meta.color} style={{ marginRight: 10 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: meta.color }}>
              {isFetchingLocation ? 'Fetching location...' : 'Use My Live Location'}
            </Text>
            <Text style={{ fontSize: 11.5, color: meta.color, opacity: 0.8, marginTop: 1 }}>Auto-fill your current address via GPS</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={meta.color} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginHorizontal: 10 }}>or enter manually</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: address ? meta.color : '#E5E7EB', overflow: 'hidden' }}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Flat/House no., area, landmark..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            style={{ padding: 14, fontSize: 13.5, color: '#111827', minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>Vendor will arrive at this address at the selected time.</Text>
      </ScrollView>

      <View style={{ backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F3F5' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Total</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>₹{selectedService?.price}</Text>
        </View>
        <TouchableOpacity
          onPress={handleBook}
          disabled={loading || availabilityLoading || !selectedDate || !selectedTime}
          style={{ backgroundColor: loading || availabilityLoading || !selectedDate || !selectedTime ? '#93C5FD' : '#007BFF', borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 2 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{loading ? 'Booking...' : 'Confirm Booking'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function selectedTimeConfigLabel(selectedDateConfig: any, selectedTime: string | null) {
  const selectedSlot = selectedDateConfig?.slots?.find((slot: any) => slot.value === selectedTime);
  return selectedSlot?.label || '-';
}

export default BookingConfirmScreen;
