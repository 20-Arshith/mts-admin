import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  CreditCard,
  CheckCircle,
  XCircle,
  LogOut,
  TrendingUp,
  Briefcase,
  Calendar,
  PlaySquare,
  UserPlus,
  Copy,
  X,
  MapPin,
  RefreshCcw,
  ChevronRight,
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  Droplets,
  Paintbrush,
  Snowflake,
  CarFront,
  Truck,
  Phone,
  Mail,
  Clock3,
  BadgeIndianRupee,
  ShieldCheck,
  Video,
  Search,
  ArrowUpDown,
  Check,
  UploadCloud,
  Megaphone,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import './App.css';
import mtsLogo from '../../vendor/logo.png';
import {
  ADMIN_AUTH_EXPIRED_EVENT,
  ADMIN_AUTH_STORAGE_KEY,
  API_BASE_URL,
  adminApi as api,
  clearAdminSession,
  getStoredAdminToken,
  publicApi,
} from './config/api';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const sanitizeAgentForm = (formData) => ({
  full_name: formData.full_name.trim(),
  mobile: formData.mobile.trim(),
  email: formData.email.trim().toLowerCase(),
});

const validateAgentForm = (formData) => {
  const sanitized = sanitizeAgentForm(formData);

  if (!sanitized.full_name) {
    return { sanitized, message: 'Full name is required.' };
  }

  if (!sanitized.mobile && !sanitized.email) {
    return { sanitized, message: 'Enter at least one contact detail: phone number or email.' };
  }

  if (sanitized.mobile && !/^\d{10}$/.test(sanitized.mobile)) {
    return { sanitized, message: 'Mobile number must be exactly 10 digits.' };
  }

  if (sanitized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
    return { sanitized, message: 'Please enter a valid email address.' };
  }

  return { sanitized, message: '' };
};

const createEmptyVendorForm = () => ({
  business_name: '',
  full_name: '',
  mobile: '',
  email: '',
  whatsapp_number: '',
  category_id: '',
  service_name: '',
  service_price: '',
  service_description: '',
  address: '',
  description: '',
  agent_code: '',
});

const sanitizeVendorForm = (formData) => ({
  business_name: formData.business_name.trim(),
  full_name: formData.full_name.trim(),
  mobile: formData.mobile.trim(),
  email: formData.email.trim().toLowerCase(),
  whatsapp_number: formData.whatsapp_number.trim(),
  category_id: String(formData.category_id || '').trim(),
  service_name: formData.service_name.trim(),
  service_price: String(formData.service_price || '').trim(),
  service_description: formData.service_description.trim(),
  address: formData.address.trim(),
  description: formData.description.trim(),
  agent_code: formData.agent_code.trim().toUpperCase(),
});

const validateVendorForm = (formData) => {
  const sanitized = sanitizeVendorForm(formData);

  if (!sanitized.business_name) {
    return { sanitized, message: 'Business name is required.' };
  }

  if (!sanitized.full_name) {
    return { sanitized, message: 'Owner name is required.' };
  }

  if (!sanitized.mobile && !sanitized.email) {
    return { sanitized, message: 'Enter at least one login contact: mobile number or email.' };
  }

  if (sanitized.mobile && !/^\d{10}$/.test(sanitized.mobile)) {
    return { sanitized, message: 'Mobile number must be exactly 10 digits.' };
  }

  if (sanitized.whatsapp_number && !/^\d{10}$/.test(sanitized.whatsapp_number)) {
    return { sanitized, message: 'WhatsApp number must be exactly 10 digits.' };
  }

  if (sanitized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
    return { sanitized, message: 'Please enter a valid email address.' };
  }

  if (sanitized.service_price) {
    const servicePrice = Number(sanitized.service_price);
    if (!Number.isFinite(servicePrice) || servicePrice < 0) {
      return { sanitized, message: 'Service price must be a valid non-negative number.' };
    }
  }

  if (!sanitized.address) {
    return { sanitized, message: 'Business address is required.' };
  }

  return { sanitized, message: '' };
};

const normalizeStatus = (value) => {
  const normalized = String(value || 'unknown').trim().toLowerCase();

  if (['approved', 'approve', 'accepted', 'appected'].includes(normalized)) {
    return 'approved';
  }

  if (['rejected', 'reject', 'declined', 'decline'].includes(normalized)) {
    return 'rejected';
  }

  return normalized;
};

const formatStatusLabel = (value) =>
  normalizeStatus(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getInitial = (value) => (value || 'A').trim().charAt(0).toUpperCase();

const getServiceIcon = (categoryName) => {
  const label = String(categoryName || '').toLowerCase();

  if (label.includes('elect')) {
    return Zap;
  }
  if (label.includes('clean')) {
    return Sparkles;
  }
  if (label.includes('handy') || label.includes('repair') || label.includes('carp')) {
    return Hammer;
  }

  return Wrench;
};

const CATEGORY_ICON_OPTIONS = [
  { value: 'general', label: 'General', icon: Briefcase, color: '#007BFF' },
  { value: 'plumbing', label: 'Plumbing', icon: Droplets, color: '#03A9F4' },
  { value: 'electrical', label: 'Electrical', icon: Zap, color: '#FFA726' },
  { value: 'cleaning', label: 'Cleaning', icon: Sparkles, color: '#7E57C2' },
  { value: 'carpentry', label: 'Carpentry', icon: Hammer, color: '#8D6E63' },
  { value: 'painting', label: 'Painting', icon: Paintbrush, color: '#EC407A' },
  { value: 'cooling', label: 'AC / Cooling', icon: Snowflake, color: '#00BCD4' },
  { value: 'automotive', label: 'Automotive', icon: CarFront, color: '#455A64' },
  { value: 'moving', label: 'Moving', icon: Truck, color: '#43A047' },
  { value: 'security', label: 'Security', icon: ShieldCheck, color: '#0F766E' },
];

const inferCategoryIconKey = (categoryName) => {
  const normalized = String(categoryName || '').toLowerCase();

  if (normalized.includes('plumb') || normalized.includes('pipe')) return 'plumbing';
  if (normalized.includes('elect') || normalized.includes('wir')) return 'electrical';
  if (normalized.includes('clean') || normalized.includes('sweep')) return 'cleaning';
  if (normalized.includes('paint') || normalized.includes('wall')) return 'painting';
  if (normalized.includes('ac') || normalized.includes('cool')) return 'cooling';
  if (normalized.includes('carp') || normalized.includes('wood')) return 'carpentry';
  if (normalized.includes('mech') || normalized.includes('car')) return 'automotive';
  if (normalized.includes('mov') || normalized.includes('pack')) return 'moving';
  if (normalized.includes('secure') || normalized.includes('cctv')) return 'security';

  return 'general';
};

const getCategoryIconOption = (iconName, categoryName = '') =>
  CATEGORY_ICON_OPTIONS.find((option) => option.value === String(iconName || '').toLowerCase()) ||
  CATEGORY_ICON_OPTIONS.find((option) => option.value === inferCategoryIconKey(categoryName)) ||
  CATEGORY_ICON_OPTIONS[0];

const isCustomCategoryIcon = (iconName = '') => {
  const normalized = String(iconName || '').trim();
  return normalized.startsWith('data:image/') || /^https?:\/\//i.test(normalized);
};

const uploadCategoryIcon = async (file) => {
  const formData = new FormData();
  formData.append('asset_type', 'category_icon');
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStoredAdminToken()}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.data?.url) {
    throw new Error(data?.message || 'Could not upload category icon.');
  }

  return data.data.url;
};

const CategoryIconAvatar = ({ iconName, categoryName = '', size = 'md' }) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [iconName]);

  if (isCustomCategoryIcon(iconName) && !imageFailed) {
    return (
      <div className={`category-icon-avatar custom ${size === 'lg' ? 'large' : ''}`}>
        <img
          src={iconName}
          alt={categoryName || 'Category icon'}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const iconOption = getCategoryIconOption(iconName, categoryName);
  const IconComponent = iconOption.icon;

  return (
    <div
      className={`category-icon-avatar ${size === 'lg' ? 'large' : ''}`}
      style={{ '--category-color': iconOption.color }}
    >
      <IconComponent size={size === 'lg' ? 24 : 18} />
    </div>
  );
};

const CategoryIconLibrary = ({
  value,
  onConfirm,
}) => {
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftIconName, setDraftIconName] = useState(value || 'general');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setDraftIconName(value || 'general');
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setDraftIconName(value || 'general');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, value]);

  const handleDeviceIcon = async (file) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const uploadedUrl = await uploadCategoryIcon(file);
      setDraftIconName(uploadedUrl);
    } catch (error) {
      console.error(error);
      setUploadError(error.message || 'Could not upload category icon.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="category-icon-field" ref={containerRef}>
      <label className="field-label">Category Icon</label>
      <button
        type="button"
        className="category-icon-trigger"
        onClick={() => {
          setDraftIconName(value || 'general');
          setIsOpen((current) => !current);
        }}
        aria-label="Open icon library"
        title="Choose category icon"
      >
        <CategoryIconAvatar iconName={value} size="lg" />
      </button>

      {isOpen ? (
        <div className="category-icon-popover">
          <div className="category-icon-popover-head">
            <div>
              <h4>Category Icon</h4>
              <p>Select an icon or upload one from this device.</p>
            </div>
            <CategoryIconAvatar iconName={draftIconName} size="md" />
          </div>

          <div className="category-icon-library">
            {CATEGORY_ICON_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isSelected = draftIconName === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`category-library-item ${isSelected ? 'selected' : ''}`}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => setDraftIconName(option.value)}
                >
                  <span className="category-library-item-icon" style={{ '--category-color': option.color }}>
                    <IconComponent size={20} />
                  </span>
                  {isSelected ? (
                    <span className="category-library-check">
                      <Check size={16} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="category-icon-popover-actions">
            <button
              type="button"
              className="secondary-button btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <UploadCloud size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={(event) => handleDeviceIcon(event.target.files?.[0])}
            />
            {uploadError ? <p className="form-error category-icon-upload-error">{uploadError}</p> : null}
            <button
              type="button"
              className="secondary-button btn-secondary"
              onClick={() => {
                setDraftIconName(value || 'general');
                setIsOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={uploading}
              onClick={() => {
                onConfirm(draftIconName);
                setIsOpen(false);
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const getTimeLeftLabel = (expiryDate) => {
  if (!expiryDate) {
    return 'No expiry set';
  }

  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return 'Expiry unavailable';
  }

  const diff = expiry.getTime() - Date.now();
  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'} left`;
};

const getTopLocation = (vendors) => {
  const locationMap = {};

  vendors.forEach((vendor) => {
    const address = vendor.address || vendor.user?.profile?.address || '';
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const key = parts.length ? parts.slice(-2).join(', ') : 'India network';
    locationMap[key] = (locationMap[key] || 0) + 1;
  });

  return Object.entries(locationMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'India network';
};

const buildMonthlyVolumes = (bookings) => {
  const buckets = [];
  const now = new Date();

  for (let offset = 4; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;

    buckets.push({
      key,
      label: monthDate.toLocaleDateString('en-IN', { month: 'short' }),
      count: 0,
    });
  }

  bookings.forEach((booking) => {
    const bookingDate = new Date(booking.created_at);
    const key = `${bookingDate.getFullYear()}-${bookingDate.getMonth()}`;
    const bucket = buckets.find((item) => item.key === key);

    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets;
};

const parseTimeToMinutes = (value) => {
  if (!value) {
    return 0;
  }

  const trimmed = String(value).trim();
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const period = amPmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    return Number(twentyFourMatch[1]) * 60 + Number(twentyFourMatch[2]);
  }

  return 0;
};

const formatSlotLabel = (start, end) => `${start} - ${end}`;

const toDateInputValue = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    console.error('Copy failed', error);
  }
};

const includesQuery = (query, values) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
};

const sortRows = (items, getValue, direction = 'asc') =>
  [...items].sort((first, second) => {
    const firstValue = getValue(first);
    const secondValue = getValue(second);

    if (typeof firstValue === 'number' || typeof secondValue === 'number') {
      const normalizedFirst = Number(firstValue || 0);
      const normalizedSecond = Number(secondValue || 0);
      return direction === 'asc' ? normalizedFirst - normalizedSecond : normalizedSecond - normalizedFirst;
    }

    const normalizedFirst = String(firstValue || '').toLowerCase();
    const normalizedSecond = String(secondValue || '').toLowerCase();
    return direction === 'asc'
      ? normalizedFirst.localeCompare(normalizedSecond)
      : normalizedSecond.localeCompare(normalizedFirst);
  });

const mergeUniqueById = (currentItems, nextItems) => {
  const seen = new Set(currentItems.map((item) => String(item.id)));
  const merged = [...currentItems];

  nextItems.forEach((item) => {
    const key = String(item.id);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return merged;
};

const EmptyState = ({ title, description }) => (
  <div className="empty-state">
    <h4>{title}</h4>
    <p>{description}</p>
  </div>
);

const AvatarName = ({ name, subtitle }) => (
  <div className="table-user">
    <div className="avatar">{getInitial(name)}</div>
    <div>
      <div className="table-strong">{name || 'N/A'}</div>
      {subtitle ? <div className="table-muted">{subtitle}</div> : null}
    </div>
  </div>
);

const TableToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions = [],
  sortValue,
  onSortChange,
  sortOptions = [],
}) => (
  <div className="table-toolbar">
    <label className="search-box">
      <Search size={16} />
      <input
        type="text"
        value={searchValue}
        placeholder={searchPlaceholder}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </label>

    {filterOptions.length > 0 ? (
      <label className="dashboard-select toolbar-select">
        <ShieldCheck size={14} />
        <select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    ) : null}

    {sortOptions.length > 0 ? (
      <label className="dashboard-select toolbar-select">
        <ArrowUpDown size={14} />
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    ) : null}
  </div>
);

const ReelHoverPreview = ({ reel, className = 'reel-thumb-inline', large = false }) => {
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const handleEnter = async () => {
    setHovered(true);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      } catch (error) {
        console.error('Preview play failed', error);
      }
    }
  };

  const handleLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={`${className} ${large ? 'reel-preview-card' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {reel.thumbnail_url && !hovered ? (
        <img src={reel.thumbnail_url} alt={reel.caption || 'Reel'} />
      ) : (
        <video ref={videoRef} src={reel.video_url} muted loop playsInline preload="metadata" />
      )}
      <div className="preview-hover-note">{hovered ? 'Playing preview' : 'Hover to preview'}</div>
    </div>
  );
};

const ReelPlayerModal = ({ reel, onClose }) => {
  if (!reel) {
    return null;
  }

  return (
    <div className="reel-modal-backdrop" onClick={onClose}>
      <div className="reel-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="reel-modal-header">
          <div>
            <h3>{reel.caption || reel.vendor?.category?.category_name || 'Vendor Reel'}</h3>
            <p>{reel.vendor?.business_name || reel.vendor?.user?.full_name || 'Vendor'}</p>
          </div>
          <button type="button" className="icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="reel-modal-video-wrap">
          <video src={reel.video_url} controls autoPlay playsInline className="reel-modal-video" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [reels, setReels] = useState([]);
  const [reelsTotal, setReelsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingSort, setBookingSort] = useState('newest');
  const [selectedReel, setSelectedReel] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const loadData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    setRefreshing(true);
    setError('');

    try {
      const [statsRes, agentsRes, bookingsRes, servicesRes, vendorsRes, reelsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/agents'),
        api.get('/bookings'),
        api.get('/services'),
        api.get('/vendors'),
        api.get('/reels', { params: { page: 1, limit: 4 } }),
      ]);

      setStats(statsRes.data.data);
      setAgents(agentsRes.data.data || []);
      setBookings(bookingsRes.data.data || []);
      setServices(servicesRes.data.data || []);
      setVendors(vendorsRes.data.data || []);
      setReels(reelsRes.data.data || []);
      setReelsTotal(reelsRes.data.meta?.total ?? (reelsRes.data.data || []).length);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
    } catch (loadError) {
      console.error(loadError);
      setError('Unable to load the admin dashboard right now. Please refresh and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const filteredBookings = useMemo(() => {
    const searched = bookings
      .filter((booking) =>
        bookingFilter === 'all' ? true : normalizeStatus(booking.booking_status) === bookingFilter,
      )
      .filter((booking) =>
        includesQuery(bookingSearch, [
          booking.user?.full_name,
          booking.user?.mobile,
          booking.vendor_service?.service_title,
          booking.vendor_service?.vendor?.business_name,
          booking.vendor_service?.category?.category_name,
        ]),
      );

    if (bookingSort === 'customer-asc') {
      return sortRows(searched, (booking) => booking.user?.full_name, 'asc');
    }
    if (bookingSort === 'customer-desc') {
      return sortRows(searched, (booking) => booking.user?.full_name, 'desc');
    }
    if (bookingSort === 'oldest') {
      return sortRows(searched, (booking) => new Date(booking.scheduled_at || booking.created_at).getTime(), 'asc');
    }
    return sortRows(searched, (booking) => new Date(booking.scheduled_at || booking.created_at).getTime(), 'desc');
  }, [bookingFilter, bookingSearch, bookingSort, bookings]);

  const serviceCards = useMemo(() => {
    const categoryMap = new Map();

    services.forEach((service) => {
      const categoryName = service.category?.category_name || service.service_title || 'Uncategorized';
      const key = categoryName.toLowerCase();

      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          key,
          categoryName,
          vendorIds: new Set(),
          orderCount: 0,
          serviceCount: 0,
          approvedServiceCount: 0,
          liveServiceCount: 0,
          minPrice: Number(service.price_min || 0),
        });
      }

      const current = categoryMap.get(key);
      current.serviceCount += 1;
      current.vendorIds.add(service.vendor_id);

      if (normalizeStatus(service.status || service.approval_status) === 'approved') {
        current.approvedServiceCount += 1;
      }

      if (service.is_available) {
        current.liveServiceCount += 1;
      }

      if (Number(service.price_min || 0) > 0) {
        current.minPrice =
          current.minPrice === 0
            ? Number(service.price_min)
            : Math.min(current.minPrice, Number(service.price_min));
      }
    });

    bookings.forEach((booking) => {
      const categoryName = booking.vendor_service?.category?.category_name || booking.vendor_service?.service_title;
      if (!categoryName) {
        return;
      }

      const current = categoryMap.get(String(categoryName).toLowerCase());
      if (current) {
        current.orderCount += 1;
      }
    });

    return Array.from(categoryMap.values())
      .map((category) => ({
        ...category,
        vendorCount: category.vendorIds.size,
      }))
      .sort((first, second) => {
        if (second.vendorCount !== first.vendorCount) {
          return second.vendorCount - first.vendorCount;
        }
        if (second.orderCount !== first.orderCount) {
          return second.orderCount - first.orderCount;
        }
        return first.categoryName.localeCompare(second.categoryName);
      })
      .slice(0, 4);
  }, [bookings, services]);
  const visibleBookings = filteredBookings.slice(0, 4);
  const visibleReels = reels.slice(0, 4);
  const featuredVendor =
    vendors.find((vendor) => normalizeStatus(vendor.approval_status) === 'approved') || vendors[0] || null;
  const bookingVolume = buildMonthlyVolumes(bookings);
  const bookingStatusSummary = ['pending', 'confirmed', 'completed', 'cancelled'].map((status) => ({
    label: formatStatusLabel(status),
    value: bookings.filter((booking) => normalizeStatus(booking.booking_status) === status).length,
  }));
  const serviceApprovalSummary = ['pending', 'approved', 'rejected'].map((status) => ({
    label: formatStatusLabel(status),
    value: services.filter((service) => normalizeStatus(service.status || service.approval_status) === status).length,
  }));
  const topLocation = getTopLocation(vendors);
  const pendingVendorCount = vendors.filter((vendor) => normalizeStatus(vendor.approval_status) === 'pending').length;
  const availabilitySlots = useMemo(() => {
    const unique = new Map();

    vendors.forEach((vendor) => {
      (vendor.availability_schedule || [])
        .filter((slot) => slot.is_active)
        .forEach((slot) => {
          const key = `${slot.start_time}-${slot.end_time}`;
          if (!unique.has(key)) {
            unique.set(key, {
              key,
              start: slot.start_time,
              end: slot.end_time,
              startMinutes: parseTimeToMinutes(slot.start_time),
              endMinutes: parseTimeToMinutes(slot.end_time),
              label: formatSlotLabel(slot.start_time, slot.end_time),
            });
          }
        });
    });

    return Array.from(unique.values()).sort((first, second) => first.startMinutes - second.startMinutes);
  }, [vendors]);

  const availabilityMatrix = useMemo(
    () =>
      availabilitySlots.map((slot) => ({
        ...slot,
        days: dayNames.map((dayName, dayIndex) => {
          const activeVendors = vendors.filter((vendor) =>
            (vendor.availability_schedule || []).some((schedule) => {
              if (!schedule.is_active || schedule.day_of_week !== dayIndex) {
                return false;
              }

              const scheduleStart = parseTimeToMinutes(schedule.start_time);
              const scheduleEnd = parseTimeToMinutes(schedule.end_time);
              return scheduleStart <= slot.startMinutes && scheduleEnd >= slot.endMinutes;
            }),
          );

          const dayBookings = bookings.filter((booking) => {
            const source = booking.scheduled_at || booking.created_at;
            const date = new Date(source);
            if (Number.isNaN(date.getTime()) || date.getDay() !== dayIndex) {
              return false;
            }

            const bookingMinutes = date.getHours() * 60 + date.getMinutes();
            return bookingMinutes >= slot.startMinutes && bookingMinutes < slot.endMinutes;
          });

          const activeBookings = dayBookings.filter(
            (booking) => !['completed', 'cancelled'].includes(normalizeStatus(booking.booking_status)),
          );

          return {
            dayName,
            activeVendorCount: activeVendors.length,
            orderCount: dayBookings.length,
            activeBookingCount: activeBookings.length,
          };
        }),
      })),
    [availabilitySlots, bookings, vendors],
  );
  const selectedDateObject = new Date(`${selectedDate}T00:00:00`);
  const selectedDayIndex = selectedDateObject.getDay();
  const todayDateValue = toDateInputValue(new Date());
  const isFutureSelectedDate = selectedDate > todayDateValue;
  const selectedDateLabel = selectedDateObject.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const selectedDateBookings = bookings.filter((booking) => {
    if (isFutureSelectedDate) {
      if (!booking.scheduled_at) {
        return false;
      }

      const scheduledDate = new Date(booking.scheduled_at);
      return !Number.isNaN(scheduledDate.getTime()) && toDateInputValue(scheduledDate) === selectedDate;
    }

    const source = booking.scheduled_at || booking.created_at;
    const date = new Date(source);
    return !Number.isNaN(date.getTime()) && toDateInputValue(date) === selectedDate;
  });
  const selectedDateSummary = {
    activeVendorCount: isFutureSelectedDate
      ? 0
      : vendors.filter((vendor) =>
          normalizeStatus(vendor.approval_status) === 'approved' &&
          (vendor.is_available ?? true) &&
          (vendor.availability_schedule || []).some(
            (schedule) => schedule.day_of_week === selectedDayIndex && schedule.is_active,
          ),
        ).length,
    orderCount: selectedDateBookings.length,
    activeBookingCount: selectedDateBookings.filter(
      (booking) => !['completed', 'cancelled'].includes(normalizeStatus(booking.booking_status)),
    ).length,
  };

  if (loading) {
    return <div className="main-content">Loading dashboard...</div>;
  }

  return (
    <div className="main-content">
      <header className="dashboard-toolbar">
        <div>
          <div className="eyebrow">Admin Control Center</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Services, live order activity, vendor readiness, and reels are all visible from one place.
          </p>
        </div>

        <div className="toolbar-actions">
          <div className="toolbar-chip">
            <MapPin size={15} />
            <span>{topLocation}</span>
          </div>
          <button
            type="button"
            className="toolbar-chip toolbar-chip-button"
            onClick={() => navigate('/vendors?status=pending')}
          >
            <ShieldCheck size={15} />
            <span>{pendingVendorCount} pending vendors</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            <RefreshCcw size={15} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-alert">
          <span>{error}</span>
        </div>
      )}

      <section className="stats-grid compact-stats">
        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#0f62fe' }}>
            <BadgeIndianRupee />
          </div>
          <div>
            <div className="stat-value">{formatCurrency(stats?.pendingPayoutAmount)}</div>
            <div className="stat-label">Pending payouts</div>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#7c3aed' }}>
            <Users />
          </div>
          <div>
            <div className="stat-value">{stats?.agents || 0}</div>
            <div className="stat-label">Agents network</div>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#059669' }}>
            <Store />
          </div>
          <div>
            <div className="stat-value">{stats?.vendors || 0}</div>
            <div className="stat-label">Vendors onboarded</div>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#c2410c' }}>
            <Calendar />
          </div>
          <div>
            <div className="stat-value">{stats?.bookings || 0}</div>
            <div className="stat-label">Orders in database</div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-left">
          <section className="section-card glass dashboard-panel">
            <div className="panel-header">
              <div>
                <h3>Service Catalog Grid</h3>
                <p>Top 4 service categories ranked by the highest number of vendors providing them.</p>
              </div>

              <div className="panel-actions">
                <div className="dashboard-chip subtle">
                  <Briefcase size={14} />
                  <span>{serviceCards.length} categories shown</span>
                </div>
              </div>
            </div>

            {serviceCards.length === 0 ? (
              <EmptyState
                title="No services found"
                description="Vendor services will appear here once they are created in the platform."
              />
            ) : (
              <div className="service-grid">
                {serviceCards.map((service) => {
                  const ServiceIcon = getServiceIcon(service.categoryName);

                  return (
                    <article key={service.key} className="service-card">
                      <div className="service-card-top">
                        <div className="service-card-icon">
                          <ServiceIcon size={22} />
                        </div>
                        <span className="status-dot success">{service.vendorCount} vendors</span>
                      </div>
                      <h4>{service.categoryName}</h4>
                      <p>
                        {service.orderCount} orders placed so far across this category.
                      </p>
                      <div className="service-card-meta">
                        <span>{service.serviceCount} services listed</span>
                        <span>{service.minPrice > 0 ? formatCurrency(service.minPrice) : 'Price on request'}</span>
                      </div>
                      <div className="service-card-footer">
                        <button type="button" className="mini-button muted">
                          {service.approvedServiceCount} approved
                        </button>
                        <button type="button" className="mini-button primary">
                          {service.liveServiceCount} live now
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="panel-footer-link">
              <Link to="/services" className="panel-link">
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          <section className="section-card glass dashboard-panel">
            <div className="panel-header">
              <div>
                <h3>Multimedia & Short Videos</h3>
                <p>Hover any reel to preview it directly on the dashboard.</p>
              </div>

              <div className="panel-actions">
                <div className="dashboard-chip subtle">
                  <Video size={14} />
                  <span>{reelsTotal} reels</span>
                </div>
              </div>
            </div>

            {visibleReels.length === 0 ? (
              <EmptyState
                title="No reels uploaded yet"
                description="Vendor reels will appear here as soon as they are pushed to the backend."
              />
            ) : (
              <div className="reel-grid">
                {visibleReels.map((reel) => (
                  <article key={reel.id} className="reel-card">
                    <button type="button" className="reel-preview reel-preview-button" onClick={() => setSelectedReel(reel)}>
                      <ReelHoverPreview reel={reel} className="reel-preview-media" large />
                      <div className="reel-overlay">
                        <PlaySquare size={18} />
                        <span>{getTimeLeftLabel(reel.expiry_date)}</span>
                      </div>
                    </button>
                    <div className="reel-copy">
                      <h4>{reel.caption || reel.vendor?.category?.category_name || 'Vendor reel'}</h4>
                      <p>{reel.vendor?.business_name || reel.vendor?.user?.full_name || 'Vendor'}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="panel-footer-link">
              <Link to="/reels" className="panel-link">
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          <section className="section-card glass dashboard-panel">
            <div className="panel-header">
              <div>
                <h3>Vendor Profile Details</h3>
                <p>The card below is hydrated from the vendor table and related user profile data.</p>
              </div>
              <button
                type="button"
                className="panel-link"
                onClick={() => navigate('/vendors?status=pending')}
              >
                Pending vendors <ChevronRight size={14} />
              </button>
            </div>

            {!featuredVendor ? (
              <EmptyState
                title="No vendor profile found"
                description="Once a vendor is onboarded, their profile details will be visible here."
              />
            ) : (
              <div className="vendor-profile-card">
                <div className="vendor-profile-header">
                  <div className="vendor-profile-badge">
                    <Store size={20} />
                  </div>
                  <div>
                    <h4>{featuredVendor.business_name}</h4>
                    <p>
                      {featuredVendor.category?.category_name || 'Category not assigned'}{' '}
                      <span className={`badge badge-${normalizeStatus(featuredVendor.approval_status)}`}>
                        {formatStatusLabel(featuredVendor.approval_status)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="vendor-profile-grid">
                  <div className="vendor-detail">
                    <span>Owner</span>
                    <strong>{featuredVendor.owner_name || featuredVendor.user?.full_name || 'N/A'}</strong>
                  </div>
                  <div className="vendor-detail">
                    <span>Contact</span>
                    <strong>{featuredVendor.mobile || featuredVendor.whatsapp_number || 'N/A'}</strong>
                  </div>
                  <div className="vendor-detail">
                    <span>Email</span>
                    <strong>{featuredVendor.email || featuredVendor.user?.email || 'N/A'}</strong>
                  </div>
                  <div className="vendor-detail">
                    <span>Agent</span>
                    <strong>{featuredVendor.agent?.name || 'Direct onboarding'}</strong>
                  </div>
                  <div className="vendor-detail vendor-detail-wide">
                    <span>Address</span>
                    <strong>
                      {featuredVendor.address || featuredVendor.user?.profile?.address || 'Address not added'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-right">
          <section className="section-card glass dashboard-panel">
            <div className="panel-header">
              <div>
                <h3>Order Management Table</h3>
                <p>Compact view with cleaner alignment and search for customer, vendor, and service.</p>
              </div>
            </div>

            <TableToolbar
              searchValue={bookingSearch}
              onSearchChange={setBookingSearch}
              searchPlaceholder="Search customer, vendor, service"
              filterValue={bookingFilter}
              onFilterChange={setBookingFilter}
              filterOptions={[
                { value: 'all', label: 'All orders' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              sortValue={bookingSort}
              onSortChange={setBookingSort}
              sortOptions={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'customer-asc', label: 'Customer A-Z' },
                { value: 'customer-desc', label: 'Customer Z-A' },
              ]}
            />

            <div className="table-container dashboard-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Vendor</th>
                    <th>Schedule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          title="No bookings found"
                          description="Orders matching the selected status will appear here."
                        />
                      </td>
                    </tr>
                  )}
                  {visibleBookings.map((booking) => (
                    <tr key={booking.booking_id}>
                      <td>
                        <AvatarName name={booking.user?.full_name || 'Customer'} subtitle={booking.user?.mobile} />
                      </td>
                      <td>
                        <div className="table-strong">{booking.vendor_service?.service_title || 'Service'}</div>
                        <div className="table-muted">
                          {booking.vendor_service?.category?.category_name || 'Category pending'}
                        </div>
                      </td>
                      <td className="table-strong">{booking.vendor_service?.vendor?.business_name || 'Vendor unavailable'}</td>
                      <td>{formatDateTime(booking.scheduled_at || booking.created_at)}</td>
                      <td>
                        <span className={`badge badge-${normalizeStatus(booking.booking_status)}`}>
                          {formatStatusLabel(booking.booking_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-footer-link">
              <Link to="/orders" className="panel-link">
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          <div className="dashboard-stack">
            <section className="section-card glass dashboard-panel">
              <div className="panel-header">
                <div>
                  <h3>Performance Analytics</h3>
                  <p>Live counts derived from bookings and service approval records.</p>
                </div>
                <div className="dashboard-chip subtle">
                  <TrendingUp size={14} />
                  <span>Updated {lastUpdated || 'just now'}</span>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Bookings by month</h4>
                  <div className="bar-chart">
                    {bookingVolume.map((item) => {
                      const peak = Math.max(...bookingVolume.map((entry) => entry.count), 1);
                      const height = `${Math.max((item.count / peak) * 100, item.count > 0 ? 22 : 10)}%`;

                      return (
                        <div key={item.key} className="bar-item">
                          <span className="bar-label-top">{item.count}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ height }} />
                          </div>
                          <span className="bar-label-bottom">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>Service approvals</h4>
                  <div className="metric-list">
                    {serviceApprovalSummary.map((item) => (
                      <div key={item.label} className="metric-row">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>Order states</h4>
                  <div className="metric-list">
                    {bookingStatusSummary.map((item) => (
                      <div key={item.label} className="metric-row">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="section-card glass dashboard-panel">
              <div className="panel-header">
                <div>
                  <h3>Custom Availability Calendar</h3>
                  <p>Weekday columns and time-slot rows showing active vendors, orders placed, and active bookings.</p>
                </div>
                <label className="dashboard-select date-select">
                  <Calendar size={14} />
                  <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </label>
              </div>

              {availabilityMatrix.length === 0 ? (
                <EmptyState
                  title="No availability schedule found"
                  description="Once vendor schedules are saved, the weekly availability matrix will appear here."
                />
              ) : (
                <div className="availability-default-summary">
                  <div className="availability-summary-title">
                    <span>Selected date summary</span>
                    <strong>{selectedDateLabel}</strong>
                  </div>
                  <div className="availability-summary-metrics">
                    <div className="availability-summary-metric">
                      <span>Active vendors</span>
                      <strong>{selectedDateSummary.activeVendorCount}</strong>
                    </div>
                    <div className="availability-summary-metric">
                      <span>Orders placed</span>
                      <strong>{selectedDateSummary.orderCount}</strong>
                    </div>
                    <div className="availability-summary-metric">
                      <span>Booking active</span>
                      <strong>{selectedDateSummary.activeBookingCount}</strong>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
      <ReelPlayerModal reel={selectedReel} onClose={() => setSelectedReel(null)} />
    </div>
  );
};

const OrdersManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const loadBookings = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const searched = bookings
      .filter((booking) =>
        statusFilter === 'all' ? true : normalizeStatus(booking.booking_status) === statusFilter,
      )
      .filter((booking) =>
        includesQuery(search, [
          booking.user?.full_name,
          booking.user?.mobile,
          booking.vendor_service?.service_title,
          booking.vendor_service?.vendor?.business_name,
          booking.vendor_service?.category?.category_name,
        ]),
      );

    if (sortBy === 'customer-asc') {
      return sortRows(searched, (booking) => booking.user?.full_name, 'asc');
    }
    if (sortBy === 'customer-desc') {
      return sortRows(searched, (booking) => booking.user?.full_name, 'desc');
    }
    if (sortBy === 'oldest') {
      return sortRows(searched, (booking) => new Date(booking.scheduled_at || booking.created_at).getTime(), 'asc');
    }
    return sortRows(searched, (booking) => new Date(booking.scheduled_at || booking.created_at).getTime(), 'desc');
  }, [bookings, search, sortBy, statusFilter]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Review all customer orders, vendors, and current booking statuses.</p>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search customer, vendor, service"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All orders' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'customer-asc', label: 'Customer A-Z' },
            { value: 'customer-desc', label: 'Customer Z-A' },
          ]}
        />

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Vendor</th>
                <th>Schedule</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.booking_id}>
                  <td>
                    <AvatarName name={booking.user?.full_name || 'Customer'} subtitle={booking.user?.mobile} />
                  </td>
                  <td>
                    <div className="table-strong">{booking.vendor_service?.service_title || 'Service'}</div>
                    <div className="table-muted">
                      {booking.vendor_service?.category?.category_name || 'Category pending'}
                    </div>
                  </td>
                  <td className="table-strong">{booking.vendor_service?.vendor?.business_name || 'Vendor unavailable'}</td>
                  <td>{formatDateTime(booking.scheduled_at || booking.created_at)}</td>
                  <td>
                    <span className={`badge badge-${normalizeStatus(booking.booking_status)}`}>
                      {formatStatusLabel(booking.booking_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ mobile: '', full_name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const agentFormValidation = validateAgentForm(formData);

  const loadAgents = async () => {
    try {
      const res = await api.get('/agents');
      setAgents(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const updateStatus = async (id, status) => {
    const normalizedId = Number(id);
    const normalizedStatus = normalizeStatus(status);
    let previousAgentsSnapshot = [];

    setAgents((current) => {
      previousAgentsSnapshot = current;
      return current.map((agent) =>
        Number(agent.agent_id) === normalizedId
          ? {
              ...agent,
              approval_status: normalizedStatus,
            }
          : agent,
      );
    });

    try {
      const response = await api.patch(`/agents/${id}/status`, { status });
      const updatedAgent = response.data?.data;

      setAgents((current) =>
        current.map((agent) =>
          Number(agent.agent_id) === normalizedId
            ? {
                ...agent,
                ...updatedAgent,
                approval_status: normalizeStatus(updatedAgent?.approval_status || status),
              }
            : agent,
        ),
      );
    } catch (error) {
      console.error(error);
      setAgents(previousAgentsSnapshot);
    }
  };

  const handleOnboard = async (event) => {
    event.preventDefault();
    setFormError('');

    const { sanitized, message } = validateAgentForm(formData);
    if (message) {
      setFormError(message);
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/agents/onboard', sanitized);
      const { data } = res.data;
      setSuccess(data);
      setFormData({ mobile: '', full_name: '', email: '' });
      setShowForm(false);
      loadAgents();
    } catch (error) {
      setFormError(error?.response?.data?.message || 'Failed to onboard agent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAgents = useMemo(() => {
    const searched = agents.filter((agent) =>
      includesQuery(search, [agent.name, agent.full_name, agent.mobile, agent.email, agent.referral_code]),
    );
    const filtered = searched.filter((agent) =>
      statusFilter === 'all' ? true : normalizeStatus(agent.approval_status) === statusFilter,
    );

    if (sortBy === 'name-asc') {
      return sortRows(filtered, (agent) => agent.name || agent.full_name, 'asc');
    }
    if (sortBy === 'name-desc') {
      return sortRows(filtered, (agent) => agent.name || agent.full_name, 'desc');
    }
    if (sortBy === 'oldest') {
      return sortRows(filtered, (agent) => new Date(agent.created_at).getTime(), 'asc');
    }
    return sortRows(filtered, (agent) => new Date(agent.created_at).getTime(), 'desc');
  }, [agents, search, sortBy, statusFilter]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Agent Management</h1>
          <p className="page-subtitle">Onboard new agents and manage their approval status.</p>
        </div>
        <button
          className="btn-primary header-action"
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setSuccess(null);
            setFormError('');
          }}
        >
          <UserPlus size={18} /> Onboard New Agent
        </button>
      </header>

      {showForm && (
        <div className="section-card glass form-panel">
          <div className="panel-head-inline">
            <h3>Register New Agent</h3>
            <button
              type="button"
              className="icon-only"
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleOnboard}>
            <div className="form-grid">
              <div>
                <label className="field-label">Agent Full Name *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, full_name: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="field-label">Mobile Number</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      mobile: event.target.value.replace(/\D/g, ''),
                    }))
                  }
                  maxLength={10}
                />
              </div>

              <div>
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="e.g. rahul.agent@mts.local"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || Boolean(agentFormValidation.message)}
              >
                {submitting ? 'Onboarding...' : 'Confirm & Onboard'}
              </button>
              <button
                type="button"
                className="btn-secondary secondary-button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="glass success-banner">
          <div>
            <p className="success-title">Agent onboarded successfully</p>
            <p className="success-copy">
              <strong>{success.full_name}</strong> ({success.mobile || success.email || 'No login added'}) is ready
              for approval. Share this referral code:
            </p>
          </div>
          <div className="code-box-wrap">
            <div className="code-box">{success.referral_code}</div>
            <button type="button" className="icon-only" onClick={() => copyText(success.referral_code)}>
              <Copy size={16} />
            </button>
            <button type="button" className="icon-only" onClick={() => setSuccess(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="section-card glass">
        <div className="panel-header align-center">
          <h3>All Agents ({filteredAgents.length})</h3>
        </div>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, phone, email, code"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Referral Code</th>
                <th>Vendors</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No agents yet"
                      description='Use "Onboard New Agent" to create the first agent account.'
                    />
                  </td>
                </tr>
              )}
              {filteredAgents.map((agent) => (
                <tr key={agent.agent_id}>
                  <td className="user-cell">
                    <AvatarName name={agent.name || agent.full_name} subtitle={agent.mobile || agent.email} />
                  </td>
                  <td>{agent.mobile || 'N/A'}</td>
                  <td>{agent.email || 'N/A'}</td>
                  <td>
                    <div className="inline-actions">
                      <span className="mono">{agent.referral_code}</span>
                      <button type="button" className="icon-only small" onClick={() => copyText(agent.referral_code)}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td>{agent._count?.vendors || 0}</td>
                  <td>{formatDate(agent.created_at)}</td>
                  <td>
                    <span className={`badge badge-${normalizeStatus(agent.approval_status)}`}>
                      {formatStatusLabel(agent.approval_status)}
                    </span>
                  </td>
                  <td className="actions">
                    {normalizeStatus(agent.approval_status) === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="action-btn approve"
                          onClick={() => updateStatus(agent.agent_id, 'approved')}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          type="button"
                          className="action-btn reject"
                          onClick={() => updateStatus(agent.agent_id, 'rejected')}
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {normalizeStatus(agent.approval_status) === 'approved' && (
                      <button
                        type="button"
                        className="action-btn reject"
                        onClick={() => updateStatus(agent.agent_id, 'rejected')}
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {normalizeStatus(agent.approval_status) === 'rejected' && (
                      <button
                        type="button"
                        className="action-btn approve"
                        onClick={() => updateStatus(agent.agent_id, 'approved')}
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Payouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [statusDraft, setStatusDraft] = useState('completed');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [payoutUpdateError, setPayoutUpdateError] = useState('');
  const [updatingPayout, setUpdatingPayout] = useState(false);

  const loadPayouts = async () => {
    try {
      const res = await api.get('/payout');
      setPayouts(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview('');
      return undefined;
    }

    const nextPreview = URL.createObjectURL(proofFile);
    setProofPreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [proofFile]);

  const openStatusModal = (payout) => {
    const currentStatus = normalizeStatus(payout.status);
    setSelectedPayout(payout);
    setStatusDraft(currentStatus === 'pending' ? 'completed' : currentStatus);
    setProofFile(null);
    setPayoutUpdateError('');
  };

  const closeStatusModal = (force = false) => {
    if (updatingPayout && !force) {
      return;
    }

    setSelectedPayout(null);
    setProofFile(null);
    setPayoutUpdateError('');
  };

  const uploadPayoutProof = async () => {
    if (!proofFile) {
      throw new Error('Upload a payout proof image before updating the status.');
    }

    const formData = new FormData();
    formData.append('asset_type', 'payout_proof');
    formData.append('file', proofFile);

    const token = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    const response = await publicApi.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const uploadedUrl = response.data?.data?.url;
    if (!uploadedUrl) {
      throw new Error('Proof image upload failed. Please try again.');
    }

    return uploadedUrl;
  };

  const updateStatus = async () => {
    if (!selectedPayout) {
      return;
    }

    const normalizedId = Number(selectedPayout.payout_id);
    const normalizedStatus = normalizeStatus(statusDraft);
    let previousPayoutsSnapshot = [];

    if (!['completed', 'rejected'].includes(normalizedStatus)) {
      setPayoutUpdateError('Choose Completed or Rejected to update this payout.');
      return;
    }

    if (!proofFile) {
      setPayoutUpdateError('Upload a payout proof image before updating the status.');
      return;
    }

    setUpdatingPayout(true);
    setPayoutUpdateError('');

    setPayouts((current) => {
      previousPayoutsSnapshot = current;
      return current.map((payout) =>
        Number(payout.payout_id) === normalizedId
          ? {
              ...payout,
              status: normalizedStatus,
            }
          : payout,
      );
    });

    try {
      const proofImageUrl = await uploadPayoutProof();
      const response = await api.patch(`/payout/${selectedPayout.payout_id}/status`, {
        status: normalizedStatus,
        proof_image_url: proofImageUrl,
      });
      const updatedPayout = response.data?.data;

      setPayouts((current) =>
        current.map((payout) =>
          Number(payout.payout_id) === normalizedId
            ? {
                ...payout,
                ...updatedPayout,
                status: normalizeStatus(updatedPayout?.status || normalizedStatus),
              }
            : payout,
        ),
      );
      closeStatusModal(true);
    } catch (error) {
      console.error(error);
      setPayouts(previousPayoutsSnapshot);
      setPayoutUpdateError(error.response?.data?.message || error.message || 'Could not update payout status.');
    } finally {
      setUpdatingPayout(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    const searched = payouts.filter((payout) =>
      includesQuery(search, [payout.agent?.name, payout.account_number, payout.bank_name, payout.ifsc_code, payout.upi_id]),
    );
    const filtered = searched.filter((payout) =>
      statusFilter === 'all' ? true : normalizeStatus(payout.status) === statusFilter,
    );

    if (sortBy === 'amount-high') {
      return sortRows(filtered, (payout) => Number(payout.amount || 0), 'desc');
    }
    if (sortBy === 'amount-low') {
      return sortRows(filtered, (payout) => Number(payout.amount || 0), 'asc');
    }
    if (sortBy === 'oldest') {
      return sortRows(filtered, (payout) => new Date(payout.created_at).getTime(), 'asc');
    }
    return sortRows(filtered, (payout) => new Date(payout.created_at).getTime(), 'desc');
  }, [payouts, search, sortBy, statusFilter]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Payout Requests</h1>
          <p className="page-subtitle">Review and process agent fund withdrawals.</p>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search agent, account, bank"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'amount-high', label: 'Amount high-low' },
            { value: 'amount-low', label: 'Amount low-high' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Amount</th>
                <th>Bank Details</th>
                <th>Requested On</th>
                <th>Status</th>
                <th>Proof</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((payout) => (
                <tr key={payout.payout_id}>
                  <td>
                    <AvatarName name={payout.agent?.name || 'Agent'} subtitle={payout.agent?.mobile} />
                  </td>
                  <td className="money-text">{formatCurrency(payout.amount)}</td>
                  <td>
                    {payout.payout_method === 'UPI' ? (
                      <>
                        <div className="table-strong">UPI: {payout.upi_id || 'N/A'}</div>
                        <div className="table-muted">UPI transfer</div>
                      </>
                    ) : (
                      <>
                        <div className="table-strong">A/c: {payout.account_number || 'N/A'}</div>
                        <div className="table-muted">
                          {payout.bank_name || 'Bank'} | {payout.ifsc_code || 'IFSC pending'}
                        </div>
                      </>
                    )}
                  </td>
                  <td>{formatDate(payout.created_at)}</td>
                  <td>
                    <span className={`badge badge-${normalizeStatus(payout.status)}`}>
                      {formatStatusLabel(payout.status)}
                    </span>
                  </td>
                  <td>
                    {payout.proof_image_url ? (
                      <a className="table-text-action edit" href={payout.proof_image_url} target="_blank" rel="noreferrer">
                        View proof
                      </a>
                    ) : (
                      <span className="table-muted">Not uploaded</span>
                    )}
                  </td>
                  <td className="actions">
                    <button type="button" className="table-text-action edit" onClick={() => openStatusModal(payout)}>
                      Update status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayout ? (
        <div className="payout-modal-backdrop" onClick={closeStatusModal}>
          <div className="payout-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="reel-modal-header">
              <div>
                <h3>Update Payout Status</h3>
                <p>{selectedPayout.agent?.name || 'Agent'} | {formatCurrency(selectedPayout.amount)}</p>
              </div>
              <button type="button" className="icon-only" onClick={closeStatusModal} disabled={updatingPayout}>
                <X size={18} />
              </button>
            </div>

            <label className="field-label" htmlFor="payout-status">
              Status
            </label>
            <select
              id="payout-status"
              className="field-input payout-status-select"
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              disabled={updatingPayout}
            >
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            <label className="field-label payout-proof-label" htmlFor="payout-proof">
              Proof Image
            </label>
            <label className="payout-proof-dropzone" htmlFor="payout-proof">
              <UploadCloud size={22} />
              <span>{proofFile ? proofFile.name : 'Upload transaction proof image'}</span>
              <input
                id="payout-proof"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setProofFile(event.target.files?.[0] || null);
                  setPayoutUpdateError('');
                }}
                disabled={updatingPayout}
              />
            </label>

            {proofPreview ? (
              <img className="payout-proof-preview" src={proofPreview} alt="Payout proof preview" />
            ) : null}

            {payoutUpdateError ? <div className="form-error">{payoutUpdateError}</div> : null}

            <div className="form-actions payout-modal-actions">
              <button type="button" className="btn-primary" onClick={updateStatus} disabled={updatingPayout}>
                {updatingPayout ? 'Updating...' : 'Update Status'}
              </button>
              <button type="button" className="secondary-button btn-secondary" onClick={closeStatusModal} disabled={updatingPayout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Payins = () => {
  const [payins, setPayins] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const loadPayins = async () => {
    try {
      const res = await api.get('/payin');
      setPayins(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPayins();
  }, []);

  const filteredPayins = useMemo(() => {
    const searched = payins.filter((payin) =>
      includesQuery(search, [
        payin.user?.full_name,
        payin.user?.mobile,
        payin.vendor_service?.vendor?.business_name,
        payin.vendor_service?.service_title,
        payin.vendor_service?.category?.category_name,
      ]),
    );
    const filtered = searched.filter((payin) =>
      statusFilter === 'all' ? true : normalizeStatus(payin.booking_status) === statusFilter,
    );

    if (sortBy === 'amount-high') {
      return sortRows(filtered, (payin) => Number(payin.total_price || 0), 'desc');
    }
    if (sortBy === 'amount-low') {
      return sortRows(filtered, (payin) => Number(payin.total_price || 0), 'asc');
    }
    if (sortBy === 'oldest') {
      return sortRows(filtered, (payin) => new Date(payin.created_at).getTime(), 'asc');
    }
    return sortRows(filtered, (payin) => new Date(payin.created_at).getTime(), 'desc');
  }, [payins, search, sortBy, statusFilter]);

  const totalPayinAmount = filteredPayins.reduce((sum, payin) => sum + Number(payin.total_price || 0), 0);
  const totalCommissionAmount = filteredPayins.reduce((sum, payin) => sum + Number(payin.commission_earned || 0), 0);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Payin Transactions</h1>
          <p className="page-subtitle">Track customer payments collected through bookings.</p>
        </div>
        <div className="toolbar-actions">
          <div className="toolbar-chip">
            <BadgeIndianRupee size={16} />
            <span>{formatCurrency(totalPayinAmount)} collected</span>
          </div>
          <div className="toolbar-chip">
            <TrendingUp size={16} />
            <span>{formatCurrency(totalCommissionAmount)} commission</span>
          </div>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search customer, vendor, service"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'amount-high', label: 'Amount high-low' },
            { value: 'amount-low', label: 'Amount low-high' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vendor / Service</th>
                <th>Payin Amount</th>
                <th>Commission</th>
                <th>Booking Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayins.map((payin) => (
                <tr key={payin.booking_id}>
                  <td>
                    <AvatarName name={payin.user?.full_name || 'Customer'} subtitle={payin.user?.mobile || payin.user?.email} />
                  </td>
                  <td>
                    <div className="table-strong">{payin.vendor_service?.vendor?.business_name || 'Vendor unavailable'}</div>
                    <div className="table-muted">
                      {payin.vendor_service?.service_title || 'Service'} | {payin.vendor_service?.category?.category_name || 'Category'}
                    </div>
                  </td>
                  <td className="money-text">{formatCurrency(payin.total_price)}</td>
                  <td>{formatCurrency(payin.commission_earned)}</td>
                  <td>{formatDate(payin.created_at)}</td>
                  <td>
                    <span className={`badge badge-${normalizeStatus(payin.booking_status)}`}>
                      {formatStatusLabel(payin.booking_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ setAuth, authMessage = '' }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(authMessage);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    setError(authMessage);
  }, [authMessage]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setInfoMessage('');

    if (!mobile.trim()) {
      setError('Admin mobile is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!otpSent) {
        const otpResponse = await publicApi.post('/auth/send-otp', { mobile: mobile.trim() });
        setOtpSent(true);
        if (otpResponse?.data?.debugOtp) {
          setOtp(String(otpResponse.data.debugOtp));
          setInfoMessage(`OTP generated: ${otpResponse.data.debugOtp}. Enter it to continue.`);
        } else {
          setInfoMessage('OTP requested. Enter the OTP delivered by the backend service. If nothing arrives, OTP delivery is not configured on the server yet.');
        }
        return;
      }

      if (!otp.trim()) {
        setError('OTP is required');
        return;
      }

      const res = await publicApi.post('/auth/verify-otp', { mobile: mobile.trim(), otp: otp.trim() });
      const { user, token } = res.data;

      if (user && user.role_id === 4) {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, token);
        setAuth(true);
        setError('');
        setInfoMessage('');
      } else {
        clearAdminSession('Access denied: not an admin');
        setError('Access denied: not an admin');
      }
    } catch (loginError) {
      console.error('Login Error:', loginError);
      setError(loginError?.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeMobile = (event) => {
    setMobile(event.target.value);
    setError('');
    setInfoMessage('');
    if (otpSent) {
      setOtp('');
      setOtpSent(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="glass login-card">
        <div className="login-logo-image-wrap">
          <img src={mtsLogo} alt="MTS India" className="brand-logo login-brand-logo" />
        </div>
        <p className="login-subtitle">
          Manage the platform with the same clean MTS experience as the mobile apps.
        </p>
        <form onSubmit={handleLogin} className="login-form">
          <input
            className="field-input"
            placeholder="Admin Mobile"
            value={mobile}
            onChange={handleChangeMobile}
          />
          {otpSent ? (
            <input
              className="field-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value);
                setError('');
              }}
            />
          ) : null}
          <button type="submit" className="btn-primary">
            {isSubmitting ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>
          {infoMessage && <p className="login-subtitle">{infoMessage}</p>}
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [error, setError] = useState('');

  const readUserRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.users)) return payload.data.users;
    if (Array.isArray(payload?.users)) return payload.users;
    return [];
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoints = ['/users', '/customers', '/app-users'];
      let rows = [];
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          rows = readUserRows(response.data);
          lastError = null;
          break;
        } catch (requestError) {
          lastError = requestError;
        }
      }

      if (lastError) {
        throw lastError;
      }

      setUsers(rows);
    } catch (requestError) {
      console.error(requestError);
      setUsers([]);
      setError(requestError.response?.data?.message || 'Could not load app users right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const searched = users.filter((user) =>
      includesQuery(search, [
        user.full_name,
        user.name,
        user.mobile,
        user.phone,
        user.email,
        user.profile?.address,
        user.address,
      ]),
    );

    if (sortBy === 'name-asc') {
      return sortRows(searched, (user) => user.full_name || user.name, 'asc');
    }
    if (sortBy === 'name-desc') {
      return sortRows(searched, (user) => user.full_name || user.name, 'desc');
    }
    if (sortBy === 'oldest') {
      return sortRows(searched, (user) => new Date(user.created_at || user.createdAt || 0).getTime(), 'asc');
    }
    return sortRows(searched, (user) => new Date(user.created_at || user.createdAt || 0).getTime(), 'desc');
  }, [search, sortBy, users]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Review the customers logging in through the user app.</p>
        </div>
        <button type="button" className="toolbar-button" onClick={loadUsers}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </header>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="section-card glass">
        <div className="panel-header align-center">
          <h3>App Users ({filteredUsers.length})</h3>
        </div>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, phone, email, address"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
          ]}
        />

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="Loading users" description="Fetching user app login details." />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No users found" description="Users will appear here after they log in or register." />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const displayName = user.full_name || user.name || user.profile?.full_name || 'User';
                  const mobile = user.mobile || user.phone || user.profile?.mobile || 'N/A';
                  const email = user.email || user.profile?.email || 'N/A';
                  const address = user.profile?.address || user.address || user.city || 'N/A';
                  const status = user.is_active === false ? 'Inactive' : 'Active';

                  return (
                    <tr key={user.user_id || user.id || `${mobile}-${email}`}>
                      <td>
                        <AvatarName name={displayName} subtitle={`ID: ${user.user_id || user.id || 'N/A'}`} />
                      </td>
                      <td>
                        <div>{mobile}</div>
                        <div className="table-muted">{email}</div>
                      </td>
                      <td>{address}</td>
                      <td>{formatDate(user.created_at || user.createdAt)}</td>
                      <td>
                        <span className={`status-dot ${status === 'Active' ? 'success' : 'warning'}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VendorManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyVendorForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const vendorFormValidation = validateVendorForm(formData);

  const loadVendors = async () => {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadVendors();
    loadCategories();
  }, []);

  const updateStatus = async (id, status) => {
    const normalizedId = Number(id);
    const normalizedStatus = normalizeStatus(status);
    let previousVendorsSnapshot = [];

    setVendors((current) => {
      previousVendorsSnapshot = current;
      return current.map((vendor) =>
        Number(vendor.vendor_id) === normalizedId
          ? {
              ...vendor,
              approval_status: normalizedStatus,
            }
          : vendor,
      );
    });

    try {
      const response = await api.patch(`/vendors/${id}/status`, { status });
      const updatedVendor = response.data?.data;

      setVendors((current) =>
        current.map((vendor) =>
          Number(vendor.vendor_id) === normalizedId
            ? {
                ...vendor,
                ...updatedVendor,
                approval_status: normalizeStatus(updatedVendor?.approval_status || status),
              }
            : vendor,
        ),
      );
    } catch (error) {
      console.error(error);
      setVendors(previousVendorsSnapshot);
    }
  };

  const updateVendorFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (formError) setFormError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleAddVendor = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const { sanitized, message } = validateVendorForm(formData);
    if (message) {
      setFormError(message);
      return;
    }

    setSubmitting(true);

    const payload = {
      business_name: sanitized.business_name,
      full_name: sanitized.full_name,
      ...(sanitized.mobile ? { mobile: sanitized.mobile } : {}),
      ...(sanitized.email ? { email: sanitized.email } : {}),
      ...(sanitized.category_id ? { categories: [Number(sanitized.category_id)] } : {}),
      ...(sanitized.service_name ? { service_name: sanitized.service_name } : {}),
      ...(sanitized.service_price ? { service_price: Number(sanitized.service_price) } : {}),
      ...(sanitized.service_description ? { service_description: sanitized.service_description } : {}),
      whatsapp_number: sanitized.whatsapp_number || sanitized.mobile || undefined,
      description: sanitized.description,
      address: sanitized.address,
      ...(sanitized.agent_code ? { agent_code: sanitized.agent_code } : {}),
    };

    try {
      await api.post('/vendors/onboard', payload);
      setSuccessMessage(`${sanitized.business_name} was added successfully.`);
      setFormData(createEmptyVendorForm());
      setShowForm(false);
      loadVendors();
    } catch (error) {
      console.error(error);
      setFormError(error?.response?.data?.message || 'Failed to add vendor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'all');
  }, [searchParams]);

  const filteredVendors = useMemo(() => {
    const searched = vendors.filter((vendor) =>
      includesQuery(search, [
        vendor.business_name,
        vendor.owner_name,
        vendor.mobile,
        vendor.agent?.name,
        vendor.category?.category_name,
      ]),
    );
    const filtered = searched.filter((vendor) =>
      statusFilter === 'all' ? true : normalizeStatus(vendor.approval_status) === statusFilter,
    );

    if (sortBy === 'name-asc') {
      return sortRows(filtered, (vendor) => vendor.business_name, 'asc');
    }
    if (sortBy === 'name-desc') {
      return sortRows(filtered, (vendor) => vendor.business_name, 'desc');
    }
    if (sortBy === 'oldest') {
      return sortRows(filtered, (vendor) => new Date(vendor.created_at || vendor.user?.created_at || 0).getTime(), 'asc');
    }
    return sortRows(filtered, (vendor) => new Date(vendor.created_at || vendor.user?.created_at || 0).getTime(), 'desc');
  }, [search, sortBy, statusFilter, vendors]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">Add vendors, monitor business partners, and manage approval status.</p>
        </div>
        <button
          className="btn-primary header-action"
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setFormError('');
            setSuccessMessage('');
          }}
        >
          <UserPlus size={18} /> Add Vendor
        </button>
      </header>

      {showForm && (
        <div className="section-card glass form-panel">
          <div className="panel-head-inline">
            <h3>Add New Vendor</h3>
            <button
              type="button"
              className="icon-only"
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddVendor}>
            <div className="form-grid">
              <div>
                <label className="field-label">Business Name *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. RK Plumbing Services"
                  value={formData.business_name}
                  onChange={(event) => updateVendorFormField('business_name', event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Owner Name *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(event) => updateVendorFormField('full_name', event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Mobile Number</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={(event) => {
                    const mobile = event.target.value.replace(/\D/g, '');
                    const shouldSyncWhatsapp =
                      !formData.whatsapp_number || formData.whatsapp_number === formData.mobile;
                    setFormData((current) => ({
                      ...current,
                      mobile,
                      whatsapp_number: shouldSyncWhatsapp ? mobile : current.whatsapp_number,
                    }));
                    if (formError) setFormError('');
                    if (successMessage) setSuccessMessage('');
                  }}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="e.g. vendor@mts.local"
                  value={formData.email}
                  onChange={(event) => updateVendorFormField('email', event.target.value)}
                />
              </div>

              <div>
                <label className="field-label">WhatsApp Number</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="e.g. 9876543210"
                  value={formData.whatsapp_number}
                  onChange={(event) =>
                    updateVendorFormField('whatsapp_number', event.target.value.replace(/\D/g, ''))
                  }
                  maxLength={10}
                />
              </div>

              <div>
                <label className="field-label">Agent Code</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. AGT-ABCD-EFGH"
                  value={formData.agent_code}
                  onChange={(event) =>
                    updateVendorFormField('agent_code', event.target.value.toUpperCase().replace(/\s/g, ''))
                  }
                />
              </div>

              <div>
                <label className="field-label">Service Category</label>
                <select
                  className="field-input"
                  value={formData.category_id}
                  onChange={(event) => updateVendorFormField('category_id', event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Service Name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Deep Home Cleaning"
                  value={formData.service_name}
                  onChange={(event) => updateVendorFormField('service_name', event.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Service Price</label>
                <input
                  type="number"
                  className="field-input"
                  placeholder="e.g. 499"
                  value={formData.service_price}
                  onChange={(event) => updateVendorFormField('service_price', event.target.value)}
                  min="0"
                  step="1"
                />
              </div>

              <div className="vendor-form-wide">
                <label className="field-label">Service Description</label>
                <textarea
                  className="field-input textarea-input"
                  placeholder="Optional details about the first service assigned to this vendor"
                  value={formData.service_description}
                  onChange={(event) => updateVendorFormField('service_description', event.target.value)}
                />
              </div>

              <div className="vendor-form-wide">
                <label className="field-label">Business Address *</label>
                <textarea
                  className="field-input textarea-input"
                  placeholder="Full address, city, pincode"
                  value={formData.address}
                  onChange={(event) => updateVendorFormField('address', event.target.value)}
                  required
                />
              </div>

              <div className="vendor-form-wide">
                <label className="field-label">Business Description</label>
                <textarea
                  className="field-input textarea-input"
                  placeholder="Briefly describe the vendor services"
                  value={formData.description}
                  onChange={(event) => updateVendorFormField('description', event.target.value)}
                />
              </div>
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || Boolean(vendorFormValidation.message)}
              >
                {submitting ? 'Adding...' : 'Add Vendor'}
              </button>
              <button
                type="button"
                className="btn-secondary secondary-button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {successMessage ? (
        <div className="glass success-banner">
          <div>
            <p className="success-title">Vendor added</p>
            <p className="success-copy">{successMessage}</p>
          </div>
          <button type="button" className="icon-only" onClick={() => setSuccessMessage('')}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="section-card glass">
        <div className="panel-header align-center">
          <h3>All Vendors ({filteredVendors.length})</h3>
        </div>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search business, owner, phone, agent"
          filterValue={statusFilter}
          onFilterChange={(value) => {
            setStatusFilter(value);
            setSearchParams(value === 'all' ? {} : { status: value });
          }}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'name-asc', label: 'Business A-Z' },
            { value: 'name-desc', label: 'Business Z-A' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Referred By</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No vendors found"
                      description="Add a vendor or adjust the search and filters."
                    />
                  </td>
                </tr>
              )}
              {filteredVendors.map((vendor) => (
                <tr key={vendor.vendor_id}>
                  <td>
                    <AvatarName
                      name={vendor.business_name}
                      subtitle={vendor.owner_name || vendor.user?.full_name || 'Owner unavailable'}
                    />
                  </td>
                  <td>
                    <div>{vendor.owner_name || vendor.user?.full_name || 'N/A'}</div>
                    <div className="table-muted">{vendor.mobile || 'N/A'}</div>
                  </td>
                  <td>
                    {Array.from(
                      new Set((vendor.services || []).map((service) => service.category?.category_name).filter(Boolean)),
                    ).join(', ') ||
                      vendor.category?.category_name ||
                      'N/A'}
                  </td>
                  <td>{vendor.agent?.name || 'Direct'}</td>
                  <td>
                    <span className={`status-dot ${(vendor.is_available ?? false) ? 'success' : 'warning'}`}>
                      {(vendor.is_available ?? false) ? 'Available' : 'Not available'}
                    </span>
                  </td>
                  <td className="actions">
                    {normalizeStatus(vendor.approval_status) === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="action-btn approve"
                          onClick={() => updateStatus(vendor.vendor_id, 'approved')}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          type="button"
                          className="action-btn reject"
                          onClick={() => updateStatus(vendor.vendor_id, 'rejected')}
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {normalizeStatus(vendor.approval_status) === 'approved' && (
                      <button
                        type="button"
                        className="action-btn reject"
                        onClick={() => updateStatus(vendor.vendor_id, 'rejected')}
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {normalizeStatus(vendor.approval_status) === 'rejected' && (
                      <button
                        type="button"
                        className="action-btn approve"
                        onClick={() => updateStatus(vendor.vendor_id, 'approved')}
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReelManagement = () => {
  const REELS_PAGE_SIZE = 12;
  const [reels, setReels] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedReel, setSelectedReel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalReels, setTotalReels] = useState(0);

  const loadReels = async ({ pageToLoad = 1, append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get('/reels', {
        params: {
          page: pageToLoad,
          limit: REELS_PAGE_SIZE,
        },
      });
      const nextReels = res.data.data || [];
      const meta = res.data.meta || {};

      setReels((current) => (append ? mergeUniqueById(current, nextReels) : nextReels));
      setPage(meta.page || pageToLoad);
      setHasMore(Boolean(meta.hasMore));
      setTotalReels(meta.total ?? nextReels.length);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, []);

  const deleteReel = async (id) => {
    if (!window.confirm('Are you sure you want to remove this reel?')) {
      return;
    }

    try {
      await api.delete(`/reels/${id}`);
      setReels((current) => current.filter((reel) => reel.id !== id));
      setTotalReels((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const updateReelStatus = async (id, status) => {
    const normalizedStatus = normalizeStatus(status);
    setReels((current) =>
      current.map((reel) =>
        Number(reel.id) === Number(id)
          ? { ...reel, approval_status: normalizedStatus, status: normalizedStatus }
          : reel,
      ),
    );

    try {
      const response = await api.patch(`/reels/${id}/status`, { status: normalizedStatus });
      const updatedReel = response.data?.data;
      setReels((current) =>
        current.map((reel) =>
          Number(reel.id) === Number(id)
            ? {
                ...reel,
                ...updatedReel,
                approval_status: normalizeStatus(updatedReel?.approval_status || normalizedStatus),
                status: normalizeStatus(updatedReel?.status || normalizedStatus),
              }
            : reel,
        ),
      );
    } catch (error) {
      console.error(error);
      loadReels();
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    loadReels({ pageToLoad: page + 1, append: true });
  };

  const filteredReels = useMemo(() => {
    const searched = reels.filter((reel) =>
      includesQuery(search, [reel.caption, reel.vendor?.business_name, reel.vendor?.user?.full_name]),
    );

    const filtered = searched.filter((reel) => {
      if (filterBy === 'captioned') {
        return Boolean(reel.caption);
      }
      if (filterBy === 'uncaptioned') {
        return !reel.caption;
      }
      if (['pending', 'approved', 'rejected'].includes(filterBy)) {
        return normalizeStatus(reel.status || reel.approval_status) === filterBy;
      }
      return true;
    });

    if (sortBy === 'vendor-asc') {
      return sortRows(filtered, (reel) => reel.vendor?.business_name || reel.vendor?.user?.full_name, 'asc');
    }
    if (sortBy === 'vendor-desc') {
      return sortRows(filtered, (reel) => reel.vendor?.business_name || reel.vendor?.user?.full_name, 'desc');
    }
    if (sortBy === 'expiry') {
      return sortRows(filtered, (reel) => new Date(reel.expiry_date || 0).getTime(), 'asc');
    }
    return sortRows(filtered, (reel) => new Date(reel.created_at).getTime(), 'desc');
  }, [filterBy, reels, search, sortBy]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Reels Content Control</h1>
          <p className="page-subtitle">Manage vendor reels and remove inappropriate content. Loaded {reels.length} of {totalReels}.</p>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search vendor or caption"
          filterValue={filterBy}
          onFilterChange={setFilterBy}
          filterOptions={[
            { value: 'all', label: 'All reels' },
            { value: 'pending', label: 'Pending approval' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'captioned', label: 'With caption' },
            { value: 'uncaptioned', label: 'Without caption' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'expiry', label: 'Expiry soonest' },
            { value: 'vendor-asc', label: 'Vendor A-Z' },
            { value: 'vendor-desc', label: 'Vendor Z-A' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Vendor</th>
                <th>Caption</th>
                <th>Status</th>
                <th>Created</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState title="Loading reels" description="Fetching the latest reel batch for the admin console." />
                  </td>
                </tr>
              ) : filteredReels.length > 0 ? (
                filteredReels.map((reel) => (
                  <tr key={reel.id}>
                    <td>
                      <button type="button" className="reel-inline-open" onClick={() => setSelectedReel(reel)}>
                        <ReelHoverPreview reel={reel} />
                      </button>
                    </td>
                    <td>
                      <AvatarName
                        name={reel.vendor?.business_name || reel.vendor?.user?.full_name || 'Vendor'}
                        subtitle={reel.vendor?.category?.category_name || 'Reel'}
                      />
                    </td>
                    <td>{reel.caption || 'No caption added'}</td>
                    <td>
                      <span className={`badge badge-${normalizeStatus(reel.status || reel.approval_status)}`}>
                        {formatStatusLabel(reel.status || reel.approval_status)}
                      </span>
                    </td>
                    <td>{formatDate(reel.created_at)}</td>
                    <td>{getTimeLeftLabel(reel.expiry_date)}</td>
                    <td className="actions">
                      {normalizeStatus(reel.status || reel.approval_status) === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="action-btn approve"
                            onClick={() => updateReelStatus(reel.id, 'approved')}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            type="button"
                            className="action-btn reject"
                            onClick={() => updateReelStatus(reel.id, 'rejected')}
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      ) : null}
                      <button type="button" className="action-btn reject" onClick={() => deleteReel(reel.id)}>
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <EmptyState title="No reels found" description="Try changing the current search or filter." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMore ? (
          <div className="panel-footer-link">
            <button type="button" className="panel-link" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading more...' : 'Load More Reels'}
            </button>
          </div>
        ) : null}
      </div>
      <ReelPlayerModal reel={selectedReel} onClose={() => setSelectedReel(null)} />
    </div>
  );
};

const BroadcastManagement = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements', { params: { limit: 50 } });
      setBroadcasts(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const updateBroadcastStatus = async (id, status) => {
    const normalizedStatus = normalizeStatus(status);
    setBroadcasts((current) =>
      current.map((broadcast) =>
        Number(broadcast.announcement_id) === Number(id)
          ? { ...broadcast, approval_status: normalizedStatus, status: normalizedStatus }
          : broadcast,
      ),
    );

    try {
      const response = await api.patch(`/announcements/${id}/status`, { status: normalizedStatus });
      const updatedBroadcast = response.data?.data;
      setBroadcasts((current) =>
        current.map((broadcast) =>
          Number(broadcast.announcement_id) === Number(id)
            ? {
                ...broadcast,
                ...updatedBroadcast,
                approval_status: normalizeStatus(updatedBroadcast?.approval_status || normalizedStatus),
                status: normalizeStatus(updatedBroadcast?.status || normalizedStatus),
              }
            : broadcast,
        ),
      );
    } catch (error) {
      console.error(error);
      loadBroadcasts();
    }
  };

  const filteredBroadcasts = useMemo(() => {
    const searched = broadcasts.filter((broadcast) =>
      includesQuery(search, [
        broadcast.message,
        broadcast.location_identifier,
        broadcast.vendor?.business_name,
        broadcast.vendor?.user?.full_name,
      ]),
    );
    const filtered = searched.filter((broadcast) =>
      statusFilter === 'all' ? true : normalizeStatus(broadcast.status || broadcast.approval_status) === statusFilter,
    );

    if (sortBy === 'oldest') {
      return sortRows(filtered, (broadcast) => new Date(broadcast.created_at || 0).getTime(), 'asc');
    }
    if (sortBy === 'vendor-asc') {
      return sortRows(filtered, (broadcast) => broadcast.vendor?.business_name || broadcast.vendor?.user?.full_name, 'asc');
    }
    return sortRows(filtered, (broadcast) => new Date(broadcast.created_at || 0).getTime(), 'desc');
  }, [broadcasts, search, sortBy, statusFilter]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Broadcast Review</h1>
          <p className="page-subtitle">Approve or reject vendor broadcasts and updates before users can see them.</p>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search vendor, location, or message"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'vendor-asc', label: 'Vendor A-Z' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Message</th>
                <th>Location</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState title="Loading broadcasts" description="Fetching vendor updates awaiting review." />
                  </td>
                </tr>
              ) : filteredBroadcasts.length > 0 ? (
                filteredBroadcasts.map((broadcast) => {
                  const effectiveStatus = normalizeStatus(broadcast.status || broadcast.approval_status);
                  return (
                    <tr key={broadcast.announcement_id}>
                      <td>
                        <AvatarName
                          name={broadcast.vendor?.business_name || broadcast.vendor?.user?.full_name || 'Vendor'}
                          subtitle={broadcast.vendor?.mobile || broadcast.vendor?.user?.email || 'Broadcast'}
                        />
                      </td>
                      <td>
                        <div className="table-strong">{broadcast.message || 'No message'}</div>
                        {broadcast.image_url ? (
                          <a href={broadcast.image_url} target="_blank" rel="noreferrer" className="table-muted">
                            View image
                          </a>
                        ) : null}
                      </td>
                      <td>{broadcast.location_identifier || 'All locations'}</td>
                      <td>
                        <span className={`badge badge-${effectiveStatus}`}>{formatStatusLabel(effectiveStatus)}</span>
                      </td>
                      <td>{formatDate(broadcast.start_at)} - {formatDate(broadcast.expires_at)}</td>
                      <td className="actions">
                        {effectiveStatus === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="action-btn approve"
                              onClick={() => updateBroadcastStatus(broadcast.announcement_id, 'approved')}
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              type="button"
                              className="action-btn reject"
                              onClick={() => updateBroadcastStatus(broadcast.announcement_id, 'rejected')}
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState title="No broadcasts found" description="Try changing the current search or filter." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ServiceCategoryManagement = () => {
  const formPanelRef = useRef(null);
  const categoryInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [categoryName, setCategoryName] = useState('');
  const [selectedIconName, setSelectedIconName] = useState('general');
  const [editingCategory, setEditingCategory] = useState(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete "${category.category_name}"?`)) {
      return;
    }

    setFormError('');
    setSuccessMessage('');

    try {
      await api.delete(`/categories/${category.category_id}`);
      setSuccessMessage(`Category "${category.category_name}" deleted successfully.`);
      loadCategories();
    } catch (error) {
      console.error(error);
      setFormError(error.response?.data?.message || 'Could not delete this service category right now.');
    }
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    const normalizedName = categoryName.trim();

    if (!normalizedName) {
      setFormError('Category name is required.');
      return;
    }

    setSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.category_id}`, {
          category_name: normalizedName,
          icon_name: selectedIconName,
        });
      } else {
        await api.post('/categories', {
          category_name: normalizedName,
          icon_name: selectedIconName,
        });
      }
      setCategoryName('');
      setSelectedIconName('general');
      setEditingCategory(null);
      setSuccessMessage(
        editingCategory
          ? `Category "${normalizedName}" updated successfully.`
          : `Category "${normalizedName}" added successfully.`,
      );
      loadCategories();
    } catch (error) {
      console.error(error);
      setFormError(error.response?.data?.message || 'Could not save service category right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.category_name || '');
    setSelectedIconName(
      isCustomCategoryIcon(category.icon_name)
        ? category.icon_name
        : getCategoryIconOption(category.icon_name, category.category_name).value,
    );
    setFormError('');
    setSuccessMessage('');
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      categoryInputRef.current?.focus();
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSelectedIconName('general');
    setFormError('');
    setSuccessMessage('');
  };

  const filteredCategories = useMemo(() => {
    const searched = categories.filter((category) =>
      includesQuery(search, [category.category_name, category.category_id]),
    );

    if (sortBy === 'name-desc') {
      return sortRows(searched, (category) => category.category_name, 'desc');
    }
    if (sortBy === 'services-high') {
      return sortRows(searched, (category) => category._count?.services || 0, 'desc');
    }
    if (sortBy === 'vendors-high') {
      return sortRows(searched, (category) => category._count?.vendors || 0, 'desc');
    }
    if (sortBy === 'oldest') {
      return sortRows(searched, (category) => category.category_id, 'asc');
    }
    return sortRows(searched, (category) => category.category_name, 'asc');
  }, [categories, search, sortBy]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Service Categories</h1>
          <p className="page-subtitle">Add and review the categories that appear across admin, vendor, and user flows.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="toolbar-button" onClick={loadCategories}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {successMessage ? (
        <div className="success-banner">
          <div>
            <div className="success-title">Category saved</div>
            <p className="success-copy">{successMessage}</p>
          </div>
        </div>
      ) : null}

        <div className="section-card glass form-panel" ref={formPanelRef}>
          <div className="panel-header align-center">
            <div>
              <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <p>
                {editingCategory
                  ? 'Update the selected service category.'
                  : 'Create a new service category for vendors and users.'}
              </p>
            </div>
          </div>

          <form className="form-grid single-row-form" onSubmit={handleSaveCategory}>
            <div className="category-name-column">
              <label className="field-label" htmlFor="category_name">
                Category Name
              </label>
              <input
                ref={categoryInputRef}
                id="category_name"
                type="text"
                className="field-input"
                placeholder="E.g. Pest Control"
                value={categoryName}
                onChange={(event) => {
                  setCategoryName(event.target.value);
                  if (formError) setFormError('');
                  if (successMessage) setSuccessMessage('');
                }}
              />
            </div>
            <CategoryIconLibrary
              value={selectedIconName}
              onConfirm={(nextIconName) => {
                setSelectedIconName(nextIconName);
                if (formError) setFormError('');
                if (successMessage) setSuccessMessage('');
              }}
            />
            <div className="form-actions inline-form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingCategory ? 'Save Category' : 'Add Category'}
              </button>
              {editingCategory ? (
                <button type="button" className="secondary-button btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

        {formError ? <div className="form-error">{formError}</div> : null}
      </div>

      <div className="section-card glass">
          <div className="panel-header align-center">
            <div>
              <h3>Category Directory</h3>
              <p>{categories.length} categories available in the platform.</p>
            </div>
          </div>

        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search category name or ID"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
            { value: 'services-high', label: 'Most services' },
            { value: 'vendors-high', label: 'Most vendors' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
        />

        <div className="table-container">
          <table>
            <thead>
                <tr>
                  <th>Category</th>
                  <th>Vendor Services</th>
                  <th>Primary Vendors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                    <tr key={category.category_id}>
                      <td>
                        {(() => {
                          const iconOption = getCategoryIconOption(category.icon_name, category.category_name);

                          return (
                            <div className="table-user">
                              <CategoryIconAvatar iconName={category.icon_name} categoryName={category.category_name} />
                              <div>
                                <div className="table-strong">{category.category_name}</div>
                                <div className="table-muted">{iconOption.label}</div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>{category._count?.services || 0}</td>
                      <td>{category._count?.vendors || 0}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="table-text-action edit"
                          onClick={() => handleEditCategory(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="table-text-action delete"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">
                      <EmptyState
                        title="No categories found"
                        description="Try a different search or add the first service category above."
                      />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [serviceStatusOverrides, setServiceStatusOverrides] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const loadServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data.data || []);
      setServiceStatusOverrides({});
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const updateStatus = async (id, status) => {
    const normalizedId = Number(id);
    const normalizedStatus = normalizeStatus(status);
    let previousServicesSnapshot = [];
    const previousOverride = serviceStatusOverrides[normalizedId];

    setServiceStatusOverrides((current) => ({
      ...current,
      [normalizedId]: normalizedStatus,
    }));

    setServices((current) => {
      previousServicesSnapshot = current;
      return current.map((service) =>
        Number(service.id) === normalizedId
          ? {
              ...service,
              approval_status: normalizedStatus,
              status: normalizedStatus,
            }
          : service,
      );
    });

    try {
      const response = await api.patch(`/services/${id}/status`, { status: normalizedStatus });
      const updatedService = response.data?.data;
      const updatedStatus = normalizeStatus(updatedService?.status || updatedService?.approval_status || normalizedStatus);

      setServices((current) =>
        current.map((service) =>
          Number(service.id) === normalizedId
            ? {
                ...service,
                ...updatedService,
                approval_status: updatedStatus,
                status: updatedStatus,
              }
            : service,
        ),
      );
      setServiceStatusOverrides((current) => ({
        ...current,
        [normalizedId]: updatedStatus,
      }));
    } catch (error) {
      console.error(error);
      setServices(previousServicesSnapshot);
      setServiceStatusOverrides((current) => {
        const next = { ...current };
        if (previousOverride === undefined) {
          delete next[normalizedId];
        } else {
          next[normalizedId] = previousOverride;
        }
        return next;
      });
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this service?')) {
      return;
    }

    try {
      await api.delete(`/services/${id}`);
      loadServices();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredServices = useMemo(() => {
    const searched = services
      .map((service) => ({
        ...service,
        effective_approval_status:
          serviceStatusOverrides[Number(service.id)] || normalizeStatus(service.status || service.approval_status),
      }))
      .filter((service) =>
        includesQuery(search, [
          service.service_title,
          service.vendor?.business_name,
          service.category?.category_name,
        ]),
      );
    const filtered = searched.filter((service) =>
      statusFilter === 'all' ? true : service.effective_approval_status === statusFilter,
    );

    if (sortBy === 'price-high') {
      return sortRows(filtered, (service) => Number(service.price_min || 0), 'desc');
    }
    if (sortBy === 'price-low') {
      return sortRows(filtered, (service) => Number(service.price_min || 0), 'asc');
    }
    if (sortBy === 'name-asc') {
      return sortRows(filtered, (service) => service.service_title, 'asc');
    }
    return sortRows(filtered, (service) => service.id, 'desc');
  }, [search, serviceStatusOverrides, services, sortBy, statusFilter]);

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Service Catalog Review</h1>
          <p className="page-subtitle">Approve new service offerings from vendors.</p>
        </div>
      </header>

      <div className="section-card glass">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search service, vendor, category"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Newest first' },
            { value: 'name-asc', label: 'Service A-Z' },
            { value: 'price-high', label: 'Price high-low' },
            { value: 'price-low', label: 'Price low-high' },
          ]}
        />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Service Title</th>
                <th>Category</th>
                <th>Price (Min)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => (
                <tr key={service.id}>
                  <td>
                    <AvatarName
                      name={service.vendor?.business_name || 'Vendor'}
                      subtitle={service.category?.category_name || 'Category pending'}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{service.service_title}</div>
                    {service.image_urls && service.image_urls.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {service.image_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" title="Click to view full image">
                            <img src={url} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid #E2E8F0' }} alt={`Thumb ${i}`} />
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{service.category?.category_name || 'N/A'}</td>
                  <td>{formatCurrency(service.price_min)}</td>
                  <td>
                    <span className={`badge badge-${service.effective_approval_status}`}>
                      {formatStatusLabel(service.effective_approval_status)}
                    </span>
                  </td>
                  <td className="actions">
                    {service.effective_approval_status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="action-btn approve"
                          onClick={() => updateStatus(service.id, 'approved')}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          type="button"
                          className="action-btn reject"
                          onClick={() => updateStatus(service.id, 'rejected')}
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    <button type="button" className="action-btn reject" onClick={() => deleteService(service.id)}>
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdsManagement = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAdId, setEditingAdId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subtitle: '',
    buttonText: '',
    redirectLink: '',
    status: 'Active',
    position: 'Top',
    imageUrl: '',
    colors: ['#1565C0', '#0D47A1']
  });

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://res.cloudinary.com/dge2s1ncr/raw/upload/v1/mts-india/ads-config.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      } else {
        setAds([]);
      }
    } catch (e) {
      console.error(e);
      setAds([]);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await publicApi.get('/users/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch categories for ads', e);
    }
  };

  useEffect(() => {
    fetchAds();
    fetchCategories();
  }, []);

  const uploadImage = async (file) => {
    setIsUploading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const apiSecret = '7XossQqazW-scgCTeX-4zWZbJ-E';
      const str = `folder=mts-india/ads&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(str).toString();

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', '716266853254851');
      form.append('timestamp', timestamp);
      form.append('signature', signature);
      form.append('folder', 'mts-india/ads');

      const res = await fetch('https://api.cloudinary.com/v1_1/dge2s1ncr/image/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
    } catch (e) {
      console.error(e);
    }
    setIsUploading(false);
  };

  const saveAdsConfig = async (newAds) => {
    setLoading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const apiSecret = '7XossQqazW-scgCTeX-4zWZbJ-E';
      const str = `invalidate=true&overwrite=true&public_id=mts-india/ads-config.json&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(str).toString();

      const form = new FormData();
      const blob = new Blob([JSON.stringify(newAds)], { type: 'application/json' });
      form.append('file', blob);
      form.append('api_key', '716266853254851');
      form.append('timestamp', timestamp);
      form.append('signature', signature);
      form.append('public_id', 'mts-india/ads-config.json');
      form.append('overwrite', 'true');
      form.append('invalidate', 'true');

      const res = await fetch('https://api.cloudinary.com/v1_1/dge2s1ncr/raw/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (data.secure_url) {
        setAds(newAds);
        setShowForm(false);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    let newAds = [...ads];
    if (editingAdId) {
      newAds = newAds.map(ad => ad.id === editingAdId ? formData : ad);
    } else {
      newAds.push({ ...formData, id: Date.now().toString() });
    }
    saveAdsConfig(newAds);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this ad?')) {
      const newAds = ads.filter(ad => ad.id !== id);
      saveAdsConfig(newAds);
    }
  };

  const toggleStatus = (id) => {
    const newAds = ads.map(ad => {
      if (ad.id === id) {
        return { ...ad, status: ad.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return ad;
    });
    saveAdsConfig(newAds);
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ads Management</h1>
          <p className="page-subtitle">Manage promotional banners and ads shown on the user app.</p>
        </div>
        <button
          className="btn-primary header-action"
          type="button"
          onClick={() => {
            setFormData({
              id: '', title: '', subtitle: '', buttonText: '', redirectLink: '',
              status: 'Active', position: 'Top', imageUrl: '', colors: ['#1565C0', '#0D47A1']
            });
            setEditingAdId(null);
            setShowForm(!showForm);
          }}
        >
          <Sparkles size={18} /> Add New Banner
        </button>
      </header>

      {showForm && (
        <div className="section-card glass form-panel">
          <div className="panel-head-inline">
            <h3>{editingAdId ? 'Edit Banner' : 'Add New Banner'}</h3>
            <button
              type="button"
              className="icon-only"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div>
                <label className="field-label">Banner Title *</label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g., AC Service Special"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Subtitle *</label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g., Starting from Rs.499"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">CTA Button Text *</label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g., Offer Now"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Linked Service (Category)</label>
                <select
                  className="field-input"
                  value={formData.redirectLink}
                  onChange={(e) => setFormData({ ...formData, redirectLink: e.target.value })}
                >
                  <option value="">None</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_name}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select
                  className="field-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="field-label">Placement Position</label>
                <select
                  className="field-input"
                  value={formData.position || 'Top'}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                >
                  <option value="Top">Top Header Banner</option>
                  <option value="Bottom">Bottom Footer Banner</option>
                  <option value="Both">Both (Top & Bottom)</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Banner Image (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Banner" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #ccc' }}>
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadImage(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="panel-footer-link">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                style={{ marginRight: '0.5rem' }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading || isUploading}>
                {loading ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="section-card dashboard-panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Banner</th>
                <th>Title & Subtitle</th>
                <th>Linked Service</th>
                <th>Position</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && ads.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading ads...</td></tr>
              ) : ads.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No ads found. Add a new banner!</td></tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      {ad.imageUrl ? (
                        <img src={ad.imageUrl} alt={ad.title} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, backgroundColor: ad.colors?.[0] || '#ccc', borderRadius: 8 }} />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ad.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{ad.subtitle}</div>
                      <div style={{ fontSize: '0.8rem', color: '#0f62fe', marginTop: 4 }}>Button: {ad.buttonText}</div>
                    </td>
                    <td>
                      <span className="eyebrow" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                        {ad.redirectLink || 'None'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#36506c' }}>
                        {ad.position === 'Both' ? 'Top & Bottom' : (ad.position || 'Top')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleStatus(ad.id)}
                        className={`status-dot ${ad.status === 'Active' ? 'success' : 'warning'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        {ad.status}
                      </button>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => {
                          setFormData(ad);
                          setEditingAdId(ad.id);
                          setShowForm(true);
                        }}
                      >
                        <Wrench size={18} />
                      </button>
                      <button
                        type="button"
                        className="action-btn reject"
                        onClick={() => handleDelete(ad.id)}
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)));
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const handleAuthExpired = (event) => {
      setAuthMessage(event.detail?.message || 'Your admin session expired. Please log in again.');
      setIsAuthenticated(false);
    };

    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage setAuth={setIsAuthenticated} authMessage={authMessage} />;
  }

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar glass">
          <div className="brand-lockup">
            <img src={mtsLogo} alt="MTS India" className="brand-logo sidebar-brand-logo" />
          </div>

          <nav>
            <ul className="nav-links">
              <li>
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <LayoutDashboard size={20} />
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Calendar size={20} />
                  Orders
                </NavLink>
              </li>
              <li>
                <NavLink to="/agents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Users size={20} />
                  Agents
                </NavLink>
              </li>
              <li>
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Users size={20} />
                  Users
                </NavLink>
              </li>
              <li>
                <NavLink to="/vendors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Store size={20} />
                  Vendors
                </NavLink>
              </li>
              <li>
                <NavLink to="/services" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Briefcase size={20} />
                  Services
                </NavLink>
              </li>
              <li>
                <NavLink to="/service-categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Sparkles size={20} />
                  Service Categories
                </NavLink>
              </li>
              <li>
                <NavLink to="/reels" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <PlaySquare size={20} />
                  Reels
                </NavLink>
              </li>
              <li>
                <NavLink to="/broadcasts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Megaphone size={20} />
                  Broadcasts
                </NavLink>
              </li>
              <li>
                <NavLink to="/payin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <BadgeIndianRupee size={20} />
                  Payin
                </NavLink>
              </li>
              <li>
                <NavLink to="/payout" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <CreditCard size={20} />
                  Payout
                </NavLink>
              </li>
              <li>
                <NavLink to="/ads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Megaphone size={20} />
                  Ads
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-support">
              <Phone size={16} />
              <span>Support</span>
            </div>
            <div className="sidebar-support">
              <Mail size={16} />
              <span>admin@mts.local</span>
            </div>
            <button
              type="button"
              className="nav-item logout-button"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </aside>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/agents" element={<AgentManagement />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/vendors" element={<VendorManagement />} />
          <Route path="/services" element={<ServiceManagement />} />
          <Route path="/service-categories" element={<ServiceCategoryManagement />} />
          <Route path="/reels" element={<ReelManagement />} />
          <Route path="/broadcasts" element={<BroadcastManagement />} />
          <Route path="/payin" element={<Payins />} />
          <Route path="/payout" element={<Payouts />} />
          <Route path="/payouts" element={<Navigate to="/payout" />} />
          <Route path="/ads" element={<AdsManagement />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
