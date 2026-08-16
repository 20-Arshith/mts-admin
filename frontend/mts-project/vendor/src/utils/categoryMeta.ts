export const VENDOR_CATEGORY_VISUALS: Record<
    string,
    { icon: string; color: string; bg: string }
> = {
    general: { icon: 'miscellaneous-services', color: '#007BFF', bg: '#E6F0FF' },
    plumbing: { icon: 'water-drop', color: '#03A9F4', bg: '#E1F5FE' },
    electrical: { icon: 'bolt', color: '#FFA726', bg: '#FFF3E0' },
    cleaning: { icon: 'cleaning-services', color: '#7E57C2', bg: '#F3E5F5' },
    carpentry: { icon: 'handyman', color: '#8D6E63', bg: '#EFEBE9' },
    painting: { icon: 'format-paint', color: '#EC407A', bg: '#FCE4EC' },
    cooling: { icon: 'ac-unit', color: '#00BCD4', bg: '#E0F7FA' },
    automotive: { icon: 'build', color: '#455A64', bg: '#ECEFF1' },
    moving: { icon: 'local-shipping', color: '#4CAF50', bg: '#E8F5E9' },
    security: { icon: 'security', color: '#0F766E', bg: '#DCFCE7' },
};

export const isVendorCustomCategoryIcon = (iconName?: string | null) => {
    const value = String(iconName || '').trim();
    return value.startsWith('data:image/') || /^https?:\/\//i.test(value);
};

export const getVendorServiceMeta = (serviceName?: string | null) => {
    const name = String(serviceName || '').toLowerCase();

    if (name.includes('clean') || name.includes('bathroom') || name.includes('sweep')) {
        return VENDOR_CATEGORY_VISUALS.cleaning;
    }
    if (name.includes('ac ') || name.includes('cool')) {
        return VENDOR_CATEGORY_VISUALS.cooling;
    }
    if (name.includes('paint') || name.includes('wall') || name.includes('texture')) {
        return VENDOR_CATEGORY_VISUALS.painting;
    }
    if (name.includes('plumb') || name.includes('pipe')) {
        return VENDOR_CATEGORY_VISUALS.plumbing;
    }
    if (name.includes('electric') || name.includes('wir')) {
        return VENDOR_CATEGORY_VISUALS.electrical;
    }
    if (name.includes('carpent') || name.includes('wood')) {
        return VENDOR_CATEGORY_VISUALS.carpentry;
    }
    if (name.includes('mechanic') || name.includes('car') || name.includes('repair')) {
        return VENDOR_CATEGORY_VISUALS.automotive;
    }
    if (name.includes('mov') || name.includes('pack')) {
        return VENDOR_CATEGORY_VISUALS.moving;
    }
    if (name.includes('secure') || name.includes('cctv')) {
        return VENDOR_CATEGORY_VISUALS.security;
    }

    return VENDOR_CATEGORY_VISUALS.general;
};

export const getVendorCategoryMeta = (iconName?: string | null, fallbackName?: string | null) => {
    const normalizedIcon = String(iconName || '').toLowerCase();

    if (normalizedIcon && normalizedIcon !== 'general' && VENDOR_CATEGORY_VISUALS[normalizedIcon]) {
        return VENDOR_CATEGORY_VISUALS[normalizedIcon];
    }

    return getVendorServiceMeta(fallbackName || '');
};
