import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ShadowIconBox from '../components/ShadowIconBox';
import { getCategoryMeta, getServiceMeta, isCustomCategoryIcon } from '../utils/serviceHelpers';
import api from '../utils/api';
import { deriveShortLabelFromAddress } from '../utils/location';

const PRICE_FILTERS = [
  { id: 'all', label: 'All Prices' },
  { id: 'budget', label: 'Under Rs.500' },
  { id: 'mid', label: 'Rs.500-1000' },
  { id: 'premium', label: 'Rs.1000+' },
];

const RATING_FILTERS = [
  { id: 'all', label: 'All Ratings' },
  { id: '4', label: '4.0+' },
  { id: '4.5', label: '4.5+' },
];

const LOCATION_FILTERS = [
  { id: 'all', label: 'Anywhere' },
  { id: '10', label: 'Within 10 km' },
  { id: '25', label: 'Within 25 km' },
];

const SORT_OPTIONS = [
  { id: 'relevant', label: 'Relevant' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'price-low', label: 'Low Price' },
  { id: 'nearby', label: 'Nearby' },
];

const getInitialFilter = (search?: string) => {
  if (!search) return 'All';
  const normalized = search.toLowerCase();
  if (normalized.includes('plumb')) return 'Plumbing';
  if (normalized.includes('electric')) return 'Electrician';
  if (normalized.includes('paint')) return 'Painting';
  if (normalized.includes('clean')) return 'Cleaning';
  if (normalized.includes('ac')) return 'AC Repair';
  if (normalized.includes('carpent')) return 'Carpenter';
  if (normalized.includes('mechanic')) return 'Mechanic';
  if (normalized.includes('mov')) return 'Moving';
  return 'All';
};

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateDistanceKm = (
  originLat?: number | null,
  originLng?: number | null,
  targetLat?: number | null,
  targetLng?: number | null
) => {
  if (
    originLat == null ||
    originLng == null ||
    targetLat == null ||
    targetLng == null
  ) {
    return null;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(targetLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(1));
};

const matchesPriceFilter = (price: number, priceFilter: string) => {
  if (priceFilter === 'budget') return price > 0 && price < 500;
  if (priceFilter === 'mid') return price >= 500 && price <= 1000;
  if (priceFilter === 'premium') return price > 1000;
  return true;
};

const matchesRatingFilter = (rating: number | null, ratingFilter: string) => {
  if (ratingFilter === 'all') return true;
  return (rating || 0) >= Number(ratingFilter);
};

const matchesLocationFilter = (distanceKm: number | null, locationFilter: string) => {
  if (locationFilter === 'all') return true;
  if (distanceKm == null) return false;
  return distanceKm <= Number(locationFilter);
};

const formatDistance = (distanceKm: number | null) => {
  if (distanceKm == null) return '';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const FilterGroup = ({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (nextValue: string) => void;
}) => (
  <View style={{ marginTop: 14 }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>
      {title}
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              marginRight: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: selected ? '#007BFF' : '#EFF6FF',
              borderWidth: 1,
              borderColor: selected ? '#007BFF' : '#BFDBFE',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#FFFFFF' : '#1D4ED8' }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const SearchScreen = ({ route, navigation }: any) => {
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(getInitialFilter(route.params?.initialSearch));
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Array<{ label: string; id?: number; icon_name?: string }>>([{ label: 'All' }]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevant');
  const [userLocation, setUserLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const recentSearches = useMemo(
    () => ['Deep Home Cleaning', 'AC Service', 'Electrician near me'],
    []
  );

  useFocusEffect(
    React.useCallback(() => {
      const incomingSearch = route.params?.initialSearch;
      if (incomingSearch !== undefined && incomingSearch !== null) {
        const nextFilter = getInitialFilter(incomingSearch);
        setSelectedFilter(nextFilter);
        setSearchText(nextFilter === 'All' ? incomingSearch : '');

        setTimeout(() => {
          navigation.setParams({ initialSearch: undefined });
        }, 50);
      }
    }, [navigation, route.params?.initialSearch])
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/users/categories');
        if (Array.isArray(res.data?.data)) {
          setFilters([
            { label: 'All' },
            ...res.data.data.map((item: any) => ({
              label: item.category_name,
              id: item.category_id,
              icon_name: item.icon_name,
            })),
          ]);
        }
      } catch (error) {
        console.warn('Failed to load categories', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const res = await api.get('/users/profile');
        const profile = res.data?.data?.profile;
        setUserLocation({
          latitude: profile?.latitude != null ? Number(profile.latitude) : null,
          longitude: profile?.longitude != null ? Number(profile.longitude) : null,
        });
      } catch (error) {
        setUserLocation({ latitude: null, longitude: null });
      }
    };

    fetchUserLocation();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const selectedCategory = filters.find((item) => item.label === selectedFilter);
        let res;

        if (searchText.trim()) {
          res = await api.get('/users/services/search', {
            params: { q: searchText.trim() },
          });
        } else if (selectedFilter !== 'All' && selectedCategory?.id) {
          res = await api.get('/users/services', {
            params: { category_id: selectedCategory.id },
          });
        } else {
          res = await api.get('/users/services');
        }

        if (cancelled) return;

        const mapped = (res.data?.data || []).map((service: any) => {
          const vendorLatitude =
            service.vendor?.latitude != null ? Number(service.vendor.latitude) : null;
          const vendorLongitude =
            service.vendor?.longitude != null ? Number(service.vendor.longitude) : null;
          const distanceKm = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            vendorLatitude,
            vendorLongitude
          );
          const ratingValue =
            service.rating != null ? Number(service.rating) : null;
          const reviewCount = toNumber(service.review_count ?? service.reviewCount, 0);
          const priceValue = toNumber(service.price_min, 0);
          const vendorAddress = service.vendor?.address || '';

          return {
            id: service.id,
            name: service.service_title,
            description: service.description || '',
            vendor: service.vendor?.business_name || 'Vendor',
            vendorId: service.vendor?.vendor_id,
            category: service.category?.category_name || 'Other',
            categoryIcon: service.category?.icon_name,
            rating: ratingValue,
            reviewCount,
            price: priceValue,
            priceLabel: priceValue > 0 ? `Starting from Rs.${priceValue}` : 'Price on request',
            vendorAddress,
            locationLabel: vendorAddress
              ? deriveShortLabelFromAddress(vendorAddress)
              : 'Location unavailable',
            distanceKm,
            imageUrl: service.vendor?.logo_url || service.image_urls?.[0] || null,
          };
        });

        setResults(mapped);
      } catch (error: any) {
        if (!cancelled) {
          console.warn('Failed to search services, are you running the backend?', error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, searchText, selectedFilter, userLocation.latitude, userLocation.longitude]);

  const filteredResults = useMemo(() => {
    const nextResults = results.filter((item) => {
      const matchesFilter = selectedFilter === 'All' || item.category === selectedFilter;
      if (!matchesFilter) return false;

      if (!matchesPriceFilter(item.price, priceFilter)) return false;
      if (!matchesRatingFilter(item.rating, ratingFilter)) return false;
      if (!matchesLocationFilter(item.distanceKm, locationFilter)) return false;

      if (!searchText.trim()) return true;

      const haystack = [
        item.name,
        item.description,
        item.vendor,
        item.category,
        item.locationLabel,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchText.trim().toLowerCase());
    });

    const sorted = [...nextResults];
    if (sortBy === 'price-low') {
      sorted.sort((a, b) => {
        if (a.price === 0) return 1;
        if (b.price === 0) return -1;
        return a.price - b.price;
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount);
    } else if (sortBy === 'nearby') {
      sorted.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount);
    }

    return sorted;
  }, [results, selectedFilter, priceFilter, ratingFilter, locationFilter, sortBy, searchText]);

  const resetAdvancedFilters = () => {
    setPriceFilter('all');
    setRatingFilter('all');
    setLocationFilter('all');
    setSortBy('relevant');
  };

  const activeFilterCount = [priceFilter, ratingFilter, locationFilter, sortBy !== 'relevant' ? sortBy : '']
    .filter((value) => value && value !== 'all')
    .length;

  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F6FA]"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <View className="bg-white px-4 py-3 pb-3 flex-row items-center">
        <View className="flex-1 flex-row items-center bg-[#F5F6FA] rounded-xl px-4 py-3 border border-gray-200">
          <Ionicons name="search" size={22} color="#007BFF" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-800 p-0"
            placeholder="Search for services, vendors, or areas..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          className="ml-3 px-3 py-2.5 bg-blue-100/50 rounded-xl flex-row items-center"
          onPress={() => setShowAdvancedFilters((current) => !current)}
        >
          <Ionicons name="options" size={20} color="#007BFF" />
          {activeFilterCount > 0 ? (
            <View
              style={{
                marginLeft: 6,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#007BFF',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                {activeFilterCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View className="bg-white pl-4 pb-3 pt-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filterItem, index) => {
            const selected = selectedFilter === filterItem.label;
            const hasCustomIcon = filterItem.label !== 'All' && isCustomCategoryIcon(filterItem.icon_name);
            const meta =
              filterItem.label === 'All'
                ? { color: '#007BFF', icon: 'apps' }
                : getCategoryMeta(filterItem.icon_name, filterItem.label);

            return (
              <TouchableOpacity
                key={`${filterItem.label}-${index}`}
                onPress={() => setSelectedFilter(filterItem.label)}
                className={`mr-2 px-4 py-2 rounded-full border ${selected ? 'border-transparent' : 'bg-gray-100 border-gray-300'}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...(selected ? { backgroundColor: meta.color, borderColor: meta.color } : {}),
                }}
              >
                {hasCustomIcon ? (
                  <Image
                    source={{ uri: filterItem.icon_name }}
                    style={{ width: 16, height: 16, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialIcons
                    name={meta.icon as any}
                    size={15}
                    color={selected ? '#FFFFFF' : meta.color}
                  />
                )}
                <Text className={`text-[13px] ${selected ? 'text-white font-semibold' : 'text-gray-700'}`}>
                  {filterItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {showAdvancedFilters ? (
        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>Smart Filters</Text>
            <TouchableOpacity onPress={resetAdvancedFilters}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Reset</Text>
            </TouchableOpacity>
          </View>

          <FilterGroup title="Sort By" options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
          <FilterGroup title="Price" options={PRICE_FILTERS} value={priceFilter} onChange={setPriceFilter} />
          <FilterGroup title="Rating" options={RATING_FILTERS} value={ratingFilter} onChange={setRatingFilter} />
          <FilterGroup title="Vendor Distance" options={LOCATION_FILTERS} value={locationFilter} onChange={setLocationFilter} />
        </View>
      ) : null}

      <ScrollView className="flex-1 p-4">
        {searchText.length === 0 && selectedFilter === 'All' && !showAdvancedFilters && (
          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-3">Recent Searches</Text>
            {recentSearches.map((recent, index) => (
              <TouchableOpacity
                key={`${recent}-${index}`}
                onPress={() => setSearchText(recent)}
                className="flex-row items-center justify-between mb-4"
              >
                <View className="flex-row items-center">
                  <View className="bg-gray-100 p-2 rounded-full mr-3">
                    <MaterialIcons name="history" size={18} color="#9CA3AF" />
                  </View>
                  <Text className="text-sm text-gray-800">{recent}</Text>
                </View>
                <MaterialIcons name="north-west" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}

            <Text className="text-base font-bold text-gray-900 mt-5 mb-3">Trending Services</Text>
            <View className="flex-row flex-wrap gap-2">
              {filters
                .filter((item) => item.label !== 'All')
                .slice(0, 6)
                .map((item, index) => (
                  <TouchableOpacity
                    key={`${item.label}-${index}`}
                    onPress={() => setSelectedFilter(item.label)}
                    className="flex-row items-center px-3.5 py-2 rounded-full border border-blue-400/30 bg-blue-100/30"
                  >
                    <MaterialIcons name="trending-up" size={14} color="#007BFF" />
                    <Text className="text-[13px] font-medium text-[#007BFF] ml-1">{item.label}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text className="text-base font-bold text-gray-900">
            {searchText
              ? `Results for "${searchText}"`
              : selectedFilter === 'All'
                ? 'Available Services'
                : `${selectedFilter} Services`}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>
            {filteredResults.length} found
          </Text>
        </View>

        {loading ? (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={{ marginTop: 12, color: '#6B7280' }}>Searching services...</Text>
          </View>
        ) : filteredResults.length === 0 ? (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <MaterialIcons name="search-off" size={42} color="#93C5FD" />
            <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111827' }}>
              No matching services
            </Text>
            <Text style={{ marginTop: 6, textAlign: 'center', color: '#6B7280', lineHeight: 20 }}>
              Try a different search, widen the distance, or reset the filters.
            </Text>
          </View>
        ) : (
          filteredResults.map((item, index) => {
            const meta = getServiceMeta(`${item.category} ${item.name}`);
            const customCategoryUri = isCustomCategoryIcon(item.categoryIcon) ? item.categoryIcon : undefined;
            return (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                onPress={() =>
                  navigation.navigate('VendorProfile', {
                    vendorName: item.vendor,
                    type: item.category,
                    rating: item.rating || 4.5,
                    reviews: item.reviewCount,
                    serviceId: item.id,
                    vendorId: item.vendorId,
                    price: item.price,
                  })
                }
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {item.imageUrl ? (
                     <View style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: meta.color + '15' }}>
                         <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                     </View>
                  ) : (
                     <ShadowIconBox icon={meta.icon} color={meta.color} imageUri={customCategoryUri} />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                          {item.vendor}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: meta.color, fontWeight: '700', marginTop: 2 }}>
                          {item.name} • {item.category}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                          {item.price > 0 ? `Rs.${item.price}` : 'Quote'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          {item.priceLabel}
                        </Text>
                      </View>
                    </View>

                    {item.description ? (
                      <Text style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 18, marginTop: 8 }}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                      <Ionicons name="storefront-outline" size={14} color="#6B7280" />
                      <Text style={{ fontSize: 12.5, color: '#374151', fontWeight: '600', marginLeft: 6 }}>
                        {item.vendor}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 }}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={{ fontSize: 12, color: '#374151', marginLeft: 4 }}>
                          {item.rating ? item.rating.toFixed(1) : 'New'} {item.reviewCount ? `(${item.reviewCount})` : ''}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 }}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={{ fontSize: 12, color: '#374151', marginLeft: 4 }}>
                          {item.locationLabel}
                        </Text>
                      </View>

                      {item.distanceKm != null ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Ionicons name="navigate-outline" size={14} color="#6B7280" />
                          <Text style={{ fontSize: 12, color: '#374151', marginLeft: 4 }}>
                            {formatDistance(item.distanceKm)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen;
