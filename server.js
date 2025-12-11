// server.js
// Simple Express server to accept photo uploads and location.
// For demo only. In production: validate, authenticate, sanitize, and store securely.

const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safeName = `${ts}_${file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'')}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

const app = express();
app.use(express.static(__dirname)); // serve index.html for convenience

app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const file = req.file;
    const lat = req.body.lat || '';
    const lon = req.body.lon || '';
    const accuracy = req.body.accuracy || '';
    // In real app: record metadata in DB, apply access controls, encryption, deletion policy
    console.log('Received upload:', { file: file && file.filename, lat, lon, accuracy });

    res.json({
      ok: true,
      file: file ? `/uploads/${file.filename}` : null,
      lat, lon, accuracy
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve uploaded images (for demo only)
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
