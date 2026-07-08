import * as Location from 'expo-location';
import { Platform } from 'react-native';
import api, { getStoredUserToken } from './api';

const joinLocationParts = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .filter((part, index, list) => list.indexOf(part) === index)
    .join(', ');

const isPostalCode = (value?: string | null) => Boolean(value && /^\d{5,6}$/.test(value.trim()));

export const looksLikeCoordinateAddress = (value?: string | null) =>
  Boolean(value && /^Lat\s*-?\d+(\.\d+)?,\s*Lng\s*-?\d+(\.\d+)?$/i.test(value.trim()));

export const deriveShortLabelFromAddress = (address?: string | null) => {
  if (!address) return 'Location found';

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'Location found';
  if (parts.length === 1) return parts[0];

  let trimmed = [...parts];
  if (isPostalCode(trimmed[trimmed.length - 1])) trimmed.pop();
  if (trimmed.length >= 2) {
    const maybeState = trimmed[trimmed.length - 1];
    if (/^[A-Za-z\s]{3,}$/.test(maybeState) && trimmed.length >= 3) {
      trimmed.pop();
    }
  }

  if (trimmed.length >= 2) {
    return `${trimmed[trimmed.length - 2]}, ${trimmed[trimmed.length - 1]}`;
  }

  return trimmed[0] || parts[0];
};

export const formatShortLocation = (geocode?: Location.LocationGeocodedAddress | null) => {
  if (!geocode) return 'Location found';

  const locality =
    geocode.subregion ||
    geocode.district ||
    geocode.city ||
    geocode.street ||
    geocode.name;
  const city = geocode.city || geocode.region || geocode.district;

  if (locality && city && locality !== city) return `${locality}, ${city}`;
  if (city) return city;
  if (locality) return locality;
  return 'Location found';
};

export const formatFullAddress = (geocode?: Location.LocationGeocodedAddress | null) => {
  if (!geocode) return '';

  return joinLocationParts([
    geocode.streetNumber,
    geocode.street,
    geocode.name,
    geocode.subregion,
    geocode.district,
    geocode.city,
    geocode.region,
    geocode.postalCode,
  ]);
};

const reverseGeocodeFromNominatim = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};

    const fullAddress =
      data.display_name ||
      joinLocationParts([
        address.house_number,
        address.road,
        address.neighbourhood || address.suburb,
        address.city || address.town || address.village,
        address.state_district,
        address.state,
        address.postcode,
      ]);

    const shortLabel = joinLocationParts([
      address.suburb || address.neighbourhood || address.state_district || address.county,
      address.city || address.town || address.village || address.state,
    ]);

    return {
      address: fullAddress,
      shortLabel: shortLabel || deriveShortLabelFromAddress(fullAddress),
    };
  } catch (error) {
    return null;
  }
};

const reverseGeocodeFromBigDataCloud = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );

    if (!response.ok) return null;

    const data = await response.json();

    const fullAddress = joinLocationParts([
      data.locality,
      data.city,
      data.principalSubdivision,
      data.postcode,
      data.countryName,
    ]);

    const shortLabel = joinLocationParts([
      data.locality || data.city,
      data.city || data.principalSubdivision,
    ]);

    return {
      address: fullAddress,
      shortLabel: shortLabel || deriveShortLabelFromAddress(fullAddress),
    };
  } catch (error) {
    return null;
  }
};

export const detectCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  let geocode: Location.LocationGeocodedAddress[] = [];
  if (Platform.OS !== 'web') {
    try {
      geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      geocode = [];
    }
  }

  const firstResult = geocode?.[0] || null;
  const resolvedFromExpo = {
    address: formatFullAddress(firstResult),
    shortLabel: formatShortLocation(firstResult),
  };

  let fallbackResolved = null;
  if (!resolvedFromExpo.address || !resolvedFromExpo.shortLabel || resolvedFromExpo.shortLabel === 'Location found') {
    fallbackResolved =
      (await reverseGeocodeFromNominatim(location.coords.latitude, location.coords.longitude)) ||
      (await reverseGeocodeFromBigDataCloud(location.coords.latitude, location.coords.longitude));
  }

  const fallbackAddress = `Lat ${location.coords.latitude.toFixed(5)}, Lng ${location.coords.longitude.toFixed(5)}`;
  const resolvedAddress = resolvedFromExpo.address || fallbackResolved?.address || fallbackAddress;
  const resolvedShortLabel =
    (resolvedFromExpo.shortLabel && resolvedFromExpo.shortLabel !== 'Location found'
      ? resolvedFromExpo.shortLabel
      : fallbackResolved?.shortLabel || deriveShortLabelFromAddress(resolvedAddress)) || fallbackAddress;

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    address: resolvedAddress,
    shortLabel: resolvedShortLabel,
    geocode: firstResult,
  };
};

export const syncUserLocation = async (location: {
  latitude: number;
  longitude: number;
  address: string;
}) => {
  try {
    const token = await getStoredUserToken();
    if (!token) {
      return;
    }

    await api.put('/users/profile', {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    });
  } catch (error) {
    console.warn('Could not sync user location', error);
  }
};
