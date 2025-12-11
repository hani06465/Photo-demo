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

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const photoUrl = `/uploads/${req.file.filename}`;
    
    console.log('📸 Upload received:', {
      file: req.file.filename,
      location: { latitude, longitude },
      size: req.file.size
    });
    
    res.json({ 
      success: true, 
      message: 'Photo uploaded successfully!',
      photoUrl: photoUrl,
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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
