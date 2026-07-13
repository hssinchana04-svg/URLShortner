require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Url = require('./models/Url');

const app = express();

// Middleware
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : '*' }));
app.use(express.json());

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/urls', require('./routes/urls'));

// Redirect short URLs
app.get('/:code', async (req, res, next) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code, isActive: true });
    if (!url) return next();

    if (url.expiresAt && new Date() > url.expiresAt) {
      return res.status(410).json({ success: false, message: 'This link has expired.' });
    }

    // Track click
    url.clicks.push({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || ''
    });
    url.clickCount += 1;
    await url.save();

    res.redirect(url.originalUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

// Connect DB & start server
const startServer = async () => {
  let dbUri = process.env.MONGODB_URI;

  if (process.env.NODE_ENV !== 'production' && dbUri) {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 3000 });
      console.log('MongoDB connected.');
    } catch (err) {
      console.log('Local MongoDB not running. Starting in-memory MongoDB server...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        dbUri = mongoServer.getUri();
        await mongoose.connect(dbUri);
        console.log('In-memory MongoDB connected successfully.');
      } catch (memErr) {
        console.error('Failed to start in-memory MongoDB:', memErr.message);
        console.error('Original connection error:', err.message);
        process.exit(1);
      }
    }
  } else {
    try {
      await mongoose.connect(dbUri);
      console.log('MongoDB connected.');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    }
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();