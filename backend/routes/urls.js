const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const validator = require('validator');
const Url = require('../models/Url');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/urls — create short URL
router.post('/', protect, async (req, res) => {
  try {
    const { originalUrl, customAlias, expiresIn } = req.body;

    if (!originalUrl)
      return res.status(400).json({ success: false, message: 'Original URL is required.' });

    if (!validator.isURL(originalUrl, { require_protocol: true }))
      return res.status(400).json({ success: false, message: 'Please provide a valid URL including http:// or https://' });

    let shortCode;
    if (customAlias) {
      const clean = customAlias.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (!clean || clean.length < 3 || clean.length > 20)
        return res.status(400).json({ success: false, message: 'Custom alias must be 3-20 alphanumeric characters.' });
      const exists = await Url.findOne({ shortCode: clean });
      if (exists)
        return res.status(400).json({ success: false, message: 'That alias is already taken. Try another.' });
      shortCode = clean;
    } else {
      shortCode = nanoid(6);
      while (await Url.findOne({ shortCode })) shortCode = nanoid(6);
    }

    let expiresAt = null;
    if (expiresIn && expiresIn !== 'never') {
      const days = parseInt(expiresIn);
      if (!isNaN(days) && days > 0) {
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl, { width: 200, margin: 1 });

    const url = await Url.create({
      originalUrl,
      shortCode,
      customAlias: !!customAlias,
      user: req.user._id,
      expiresAt,
      qrCode
    });

    res.status(201).json({
      success: true,
      data: {
        _id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl,
        qrCode: url.qrCode,
        expiresAt: url.expiresAt,
        clickCount: 0,
        createdAt: url.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// GET /api/urls — get all URLs for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-clicks -qrCode');

    const base = process.env.BASE_URL;
    const data = urls.map(u => ({
      _id: u._id,
      originalUrl: u.originalUrl,
      shortCode: u.shortCode,
      shortUrl: `${base}/${u.shortCode}`,
      clickCount: u.clickCount,
      expiresAt: u.expiresAt,
      isActive: u.isActive,
      customAlias: u.customAlias,
      createdAt: u.createdAt
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// GET /api/urls/:id — get single URL with analytics
router.get('/:id', protect, async (req, res) => {
  try {
    const url = await Url.findOne({ _id: req.params.id, user: req.user._id });
    if (!url)
      return res.status(404).json({ success: false, message: 'URL not found.' });

    const clicksByDay = {};
    url.clicks.slice(-100).forEach(click => {
      const day = click.timestamp.toISOString().split('T')[0];
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        _id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        qrCode: url.qrCode,
        clickCount: url.clickCount,
        expiresAt: url.expiresAt,
        isActive: url.isActive,
        createdAt: url.createdAt,
        analytics: { clicksByDay }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// DELETE /api/urls/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const url = await Url.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!url)
      return res.status(404).json({ success: false, message: 'URL not found.' });
    res.json({ success: true, message: 'URL deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

module.exports = router;