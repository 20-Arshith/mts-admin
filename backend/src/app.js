const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vendorRoutes = require('./routes/vendor.routes');
const agentRoutes = require('./routes/agent.routes');
const bookingRoutes = require('./routes/booking.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const reelRoutes = require('./routes/reel.routes');
const uploadRoutes = require('./routes/upload.routes');
const announcementRoutes = require('./routes/announcement.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/announcements', announcementRoutes);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to MTS India API' });
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
