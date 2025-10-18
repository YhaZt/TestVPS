require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://scheduler.carpeldreams.me/'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine-scheduler';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/medicines', require('./routes/getmedicine'));
app.use('/api/schedules', require('./routes/getschedule'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Medicine Scheduler API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// 404 handler (pathless to avoid path-to-regexp parsing issues)
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});