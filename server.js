const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload endpoint - REPLACE your existing app.post('/upload', ...) block with this:
app.post('/upload', upload.single('photo'), (req, res) => {
  console.log('📸 [INFO] Upload endpoint hit.');

  // 1. Check if a file was actually received
  if (!req.file) {
    console.log('❌ [ERROR] No file received in upload.');
    return res.status(400).json({ 
      success: false, 
      error: 'No photo file provided.' 
    });
  }

  // 2. Log everything we received
  console.log('📁 File received:', {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    location: req.body // Contains latitude/longitude
  });

  // 3. Build the URL for the uploaded file
  // Note: This assumes your server is correctly serving static files from /uploads
  const photoUrl = `/uploads/${req.file.filename}`;
  console.log('🔗 Generated URL:', photoUrl);

  // 4. Send success response
  res.json({
    success: true,
    message: 'Photo uploaded successfully!',
    photoUrl: photoUrl,
    location: {
      latitude: req.body.latitude || 0,
      longitude: req.body.longitude || 0
    }
  });
});

// Get all uploaded photos
app.get('/photos', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.json([]);
    }
    const photos = files.map(file => `/uploads/${file}`);
    res.json(photos);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads folder: ${path.join(__dirname, 'uploads')}`);
});
