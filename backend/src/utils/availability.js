const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_VENDOR_SCHEDULE = DAY_LABELS.map((label, index) => ({
    day_of_week: index,
    day_label: label,
    short_label: DAY_SHORT_LABELS[index],
    is_active: index >= 1 && index <= 5,
    start_time: '09:00',
    end_time: '18:00',
}));

const pad = (value) => String(value).padStart(2, '0');

const formatLocalDateKey = (date) => (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

const parseTimeString = (value) => {
    if (!value || typeof value !== 'string') {
        throw new Error('Time value is required');
    }

    const trimmed = value.trim();
    const twelveHour = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(trimmed);
    if (twelveHour) {
        let hours = Number(twelveHour[1]);
        const minutes = Number(twelveHour[2]);
        const meridiem = twelveHour[3].toUpperCase();

        if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
            throw new Error('Invalid time value');
        }

        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        return { hours, minutes };
    }

    const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!twentyFourHour) {
        throw new Error('Invalid time value');
    }

    const hours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time value');
    }

    return { hours, minutes };
};

const normalizeTimeString = (value) => {
    const { hours, minutes } = parseTimeString(value);
    return `${pad(hours)}:${pad(minutes)}`;
};

const formatTimeLabel = (value) => {
    const { hours, minutes } = parseTimeString(value);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${pad(minutes)} ${suffix}`;
};

const minutesFromTime = (value) => {
    const { hours, minutes } = parseTimeString(value);
    return (hours * 60) + minutes;
};

const mergeScheduleWithDefaults = (schedule = []) => {
    const byDay = new Map(
        schedule.map((item) => [Number(item.day_of_week), item])
    );

    return DEFAULT_VENDOR_SCHEDULE.map((defaultItem) => {
        const saved = byDay.get(defaultItem.day_of_week);
        return {
            ...defaultItem,
            is_active: saved?.is_active ?? defaultItem.is_active,
            start_time: saved?.start_time ?? defaultItem.start_time,
            end_time: saved?.end_time ?? defaultItem.end_time,
        };
    });
};

const validateScheduleInput = (schedule) => {
    if (!Array.isArray(schedule)) {
        throw new Error('Schedule must be an array');
    }

    const seenDays = new Set();

    return schedule.map((item) => {
        const dayOfWeek = Number(item.day_of_week);
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
            throw new Error('Invalid day_of_week value');
        }
        if (seenDays.has(dayOfWeek)) {
            throw new Error('Schedule contains duplicate day entries');
        }
        seenDays.add(dayOfWeek);

        const isActive = Boolean(item.is_active);
        const startTime = normalizeTimeString(item.start_time || '09:00');
        const endTime = normalizeTimeString(item.end_time || '18:00');

        if (minutesFromTime(endTime) <= minutesFromTime(startTime)) {
            throw new Error(`End time must be after start time for ${DAY_LABELS[dayOfWeek]}`);
        }

        return {
            day_of_week: dayOfWeek,
            is_active: isActive,
            start_time: startTime,
            end_time: endTime,
        };
    });
};

const buildTimeSlots = (startTime, endTime) => {
    const slots = [];
    let current = minutesFromTime(startTime);
    const end = minutesFromTime(endTime);

    while (current < end) {
        const hours = Math.floor(current / 60);
        const minutes = current % 60;
        const value = `${pad(hours)}:${pad(minutes)}`;
        slots.push({
            value,
            label: formatTimeLabel(value),
        });
        current += 120; // 2-hour slots Urban Company style
    }

    return slots;
};

const buildDateSlots = ({ schedule, bookings = [], days = 7, vendorAvailable = true, startDate = null }) => {
    const mergedSchedule = mergeScheduleWithDefaults(schedule);
    const bookingsByDate = new Map();

    bookings.forEach((booking) => {
        if (!booking.scheduled_at) {
            return;
        }

        const scheduled = new Date(booking.scheduled_at);
        const key = formatLocalDateKey(scheduled);
        const timeValue = `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`;
        if (!bookingsByDate.has(key)) {
            bookingsByDate.set(key, new Set());
        }
        bookingsByDate.get(key).add(timeValue);
    });

    const now = new Date();
    const firstDate = startDate ? new Date(startDate) : new Date(now);
    const dateOptions = [];

    for (let offset = 0; offset < days; offset += 1) {
        const date = new Date(firstDate);
        date.setHours(0, 0, 0, 0);
        date.setDate(firstDate.getDate() + offset);

        const daySchedule = mergedSchedule.find((item) => item.day_of_week === date.getDay()) || DEFAULT_VENDOR_SCHEDULE[date.getDay()];
        const dateKey = formatLocalDateKey(date);
        const blocked = bookingsByDate.get(dateKey) || new Set();
        const rawSlots = vendorAvailable && daySchedule.is_active
            ? buildTimeSlots(daySchedule.start_time, daySchedule.end_time)
            : [];

        const slots = rawSlots.map((slot) => {
            const slotDate = new Date(`${dateKey}T${slot.value}:00`);
            const available = slotDate > now && !blocked.has(slot.value);
            return {
                ...slot,
                available,
            };
        });

        dateOptions.push({
            date: dateKey,
            day_of_week: daySchedule.day_of_week,
            label: offset === 0 ? 'Today' : daySchedule.short_label,
            day_label: daySchedule.day_label,
            day_number: date.getDate(),
            month_label: date.toLocaleString('en-IN', { month: 'short' }),
            is_available: vendorAvailable && daySchedule.is_active && slots.some((slot) => slot.available),
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            slots,
        });
    }

    return dateOptions;
};

module.exports = {
    DAY_LABELS,
    DEFAULT_VENDOR_SCHEDULE,
    mergeScheduleWithDefaults,
    validateScheduleInput,
    normalizeTimeString,
    formatTimeLabel,
    buildDateSlots,
    formatLocalDateKey,
};
