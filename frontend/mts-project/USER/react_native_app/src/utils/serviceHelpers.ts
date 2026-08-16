export const CATEGORY_VISUALS: Record<string, { icon: string; color: string; gradient: string[]; bg: string; fg: string }> = {
    general: { icon: 'miscellaneous-services', color: '#007BFF', gradient: ['#3395FF', '#004BB8'], bg: '#E6F0FF', fg: '#007BFF' },
    plumbing: { icon: 'water-drop', color: '#03A9F4', gradient: ['#29B6F6', '#0277BD'], bg: '#E1F5FE', fg: '#0288D1' },
    electrical: { icon: 'bolt', color: '#FFA726', gradient: ['#FFB74D', '#F57C00'], bg: '#FFF3E0', fg: '#E65100' },
    cleaning: { icon: 'cleaning-services', color: '#7E57C2', gradient: ['#9575CD', '#512DA8'], bg: '#F3E5F5', fg: '#7E57C2' },
    carpentry: { icon: 'handyman', color: '#8D6E63', gradient: ['#A1887F', '#5D4037'], bg: '#EFEBE9', fg: '#6D4C41' },
    painting: { icon: 'format-paint', color: '#EC407A', gradient: ['#F06292', '#C2185B'], bg: '#FCE4EC', fg: '#D81B60' },
    cooling: { icon: 'ac-unit', color: '#00BCD4', gradient: ['#26C6DA', '#00838F'], bg: '#E0F7FA', fg: '#0097A7' },
    automotive: { icon: 'build', color: '#455A64', gradient: ['#607D8B', '#37474F'], bg: '#ECEFF1', fg: '#455A64' },
    moving: { icon: 'local-shipping', color: '#4CAF50', gradient: ['#66BB6A', '#2E7D32'], bg: '#E8F5E9', fg: '#388E3C' },
    security: { icon: 'security', color: '#0F766E', gradient: ['#14B8A6', '#0F766E'], bg: '#DCFCE7', fg: '#0F766E' },
};

export const isCustomCategoryIcon = (iconName?: string | null) => {
    const value = String(iconName || '').trim();
    return value.startsWith('data:image/') || /^https?:\/\//i.test(value);
};

export const getCategoryMeta = (iconName?: string | null, fallbackName?: string) => {
    const normalizedIcon = (iconName || '').toLowerCase();
    if (normalizedIcon && normalizedIcon !== 'general' && CATEGORY_VISUALS[normalizedIcon]) {
        return CATEGORY_VISUALS[normalizedIcon];
    }

    return getServiceMeta(fallbackName || '');
};

export const getServiceMeta = (serviceName) => {
    const name = (serviceName || '').toLowerCase();
    
    if (name.includes('clean') || name.includes('bathroom') || name.includes('sweep')) {
        return { icon: 'cleaning-services', color: '#7E57C2', gradient: ['#9575CD', '#512DA8'], bg: '#F3E5F5', fg: '#7E57C2' };
    }
    if (name.includes('ac ') || name.includes('cooling')) {
        return { icon: 'ac-unit', color: '#00BCD4', gradient: ['#26C6DA', '#00838F'], bg: '#E0F7FA', fg: '#0097A7' };
    }
    if (name.includes('paint') || name.includes('wall') || name.includes('texture')) {
        return { icon: 'format-paint', color: '#EC407A', gradient: ['#F06292', '#C2185B'], bg: '#FCE4EC', fg: '#D81B60' };
    }
    if (name.includes('plumb') || name.includes('pipe')) {
        return { icon: 'water-drop', color: '#03A9F4', gradient: ['#29B6F6', '#0277BD'], bg: '#E1F5FE', fg: '#0288D1' };
    }
    if (name.includes('electric') || name.includes('wir')) {
        return { icon: 'bolt', color: '#FFA726', gradient: ['#FFB74D', '#F57C00'], bg: '#FFF3E0', fg: '#E65100' };
    }
    if (name.includes('carpent') || name.includes('wood')) {
        return { icon: 'handyman', color: '#8D6E63', gradient: ['#A1887F', '#5D4037'], bg: '#EFEBE9', fg: '#6D4C41' };
    }
    if (name.includes('mechanic') || name.includes('car') || name.includes('repair')) {
        return { icon: 'build', color: '#455A64', gradient: ['#607D8B', '#37474F'], bg: '#ECEFF1', fg: '#455A64' };
    }
    if (name.includes('mov') || name.includes('pack')) {
        return { icon: 'local-shipping', color: '#4CAF50', gradient: ['#66BB6A', '#2E7D32'], bg: '#E8F5E9', fg: '#388E3C' };
    }
    
    // Default fallback
    return { icon: 'miscellaneous-services', color: '#007BFF', gradient: ['#3395FF', '#004BB8'], bg: '#E6F0FF', fg: '#007BFF' };
};
