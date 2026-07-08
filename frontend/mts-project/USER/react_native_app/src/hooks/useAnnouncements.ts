import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { announcementService } from '../utils/api';
import { Announcement } from '../types/announcement';

const POSTAL_CODE_PATTERN = /\b\d{5,6}\b/;
const REFRESH_INTERVAL_MS = 30000;

const cleanLocationPart = (value?: string | null) =>
  (value || '')
    .replace(/^Lat\s*-?\d+(\.\d+)?,\s*Lng\s*-?\d+(\.\d+)?$/i, '')
    .trim();

export const resolveAnnouncementLocation = (
  locationDetail?: string | null,
  locationName?: string | null
) => {
  const candidates = [locationDetail, locationName]
    .map(cleanLocationPart)
    .filter(Boolean);

  for (const candidate of candidates) {
    const postalCode = candidate.match(POSTAL_CODE_PATTERN)?.[0];
    if (postalCode) {
      return postalCode;
    }
  }

  const namedLocation = candidates[1] || candidates[0] || '';
  const parts = namedLocation
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[parts.length - 1] || parts[0] || '';
};

export const useAnnouncements = ({
  locationDetail,
  locationName,
}: {
  locationDetail?: string | null;
  locationName?: string | null;
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const locationIdentifier = useMemo(
    () => resolveAnnouncementLocation(locationDetail, locationName),
    [locationDetail, locationName]
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAnnouncements = useCallback(async ({ showLoading = true } = {}) => {
    if (!locationIdentifier) {
      if (isMountedRef.current) {
        setAnnouncements([]);
        setError(null);
      }
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await announcementService.getActive(locationIdentifier);
      const items = Array.isArray(response.data?.data) ? response.data.data : [];

      if (isMountedRef.current) {
        setAnnouncements(items.filter((item: Announcement) => item?.message));
      }
    } catch (fetchError: any) {
      if (isMountedRef.current) {
        setAnnouncements([]);
        setError(fetchError instanceof Error ? fetchError : new Error('Failed to fetch announcements'));
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [locationIdentifier]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements({ showLoading: announcements.length === 0 });

      const timer = setInterval(() => {
        fetchAnnouncements({ showLoading: false });
      }, REFRESH_INTERVAL_MS);

      return () => clearInterval(timer);
    }, [announcements.length, fetchAnnouncements])
  );

  return {
    announcements,
    loading,
    error,
    locationIdentifier,
    refresh: fetchAnnouncements,
  };
};
