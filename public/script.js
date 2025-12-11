let stream = null;
let currentLocation = null;

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const stopBtn = document.getElementById('stopBtn');
const consentCheckbox = document.getElementById('consentCheckbox');
const statusDiv = document.getElementById('status');
const previewImg = document.getElementById('previewImg');
const uploadedPhotoDiv = document.getElementById('uploadedPhoto');
const photoGrid = document.getElementById('photoGrid');

// Update status message
function updateStatus(message, type = 'info') {
    statusDiv.textContent = `Status: ${message}`;
    statusDiv.className = `status ${type}`;
}

// Start camera
async function startCamera() {
    if (!consentCheckbox.checked) {
        updateStatus('Please check the consent box first', 'error');
        return;
    }
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: 1280, height: 720 },
            audio: false 
        });
        video.srcObject = stream;
        
        // Get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    updateStatus(`Location acquired: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`);
                },
                (error) => {
                    console.warn('Location error:', error);
                    currentLocation = { latitude: 0, longitude: 0 };
                    updateStatus('Using default location (permission denied)', 'info');
                }
            );
        } else {
            currentLocation = { latitude: 0, longitude: 0 };
            updateStatus('Geolocation not supported, using default location', 'info');
        }
        
        startBtn.disabled = true;
        captureBtn.disabled = false;
        stopBtn.disabled = false;
        updateStatus('Camera started. Say cheese! 📸');
    } catch (error) {
        console.error('Camera error:', error);
        updateStatus(`Camera error: ${error.message}`, 'error');
    }
}

// Capture photo
function capturePhoto() {
    if (!stream) {
        updateStatus('Camera not started', 'error');
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob and upload
    canvas.toBlob(async (blob) => {
        await uploadPhoto(blob);
    }, 'image/jpeg', 0.8);
}

// Upload photo to server
async function uploadPhoto(blob) {
    updateStatus('Uploading...', 'info');
    
    const formData = new FormData();
    formData.append('photo', blob, `photo-${Date.now()}.jpg`);
    formData.append('latitude', currentLocation?.latitude || 0);
    formData.append('longitude', currentLocation?.longitude || 0);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStatus('✅ Photo uploaded successfully!', 'success');
            
            // Show preview
            previewImg.src = data.photoUrl;
            uploadedPhotoDiv.style.display = 'block';
            
            // Refresh photo gallery
            loadPhotos();
        } else {
            updateStatus(`Upload failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        updateStatus(`Upload failed: ${error.message}`, 'error');
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        
        startBtn.disabled = false;
        captureBtn.disabled = true;
        stopBtn.disabled = true;
        
        updateStatus('Camera stopped', 'info');
    }
}

// Load all uploaded photos
async function loadPhotos() {
    try {
        const response = await fetch('/photos');
        const photos = await response.json();
        
        photoGrid.innerHTML = '';
        photos.forEach(photoUrl => {
            const img = document.createElement('img');
            img.src = photoUrl;
            img.alt = 'Uploaded photo';
            img.loading = 'lazy';
            
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.appendChild(img);
            
            photoGrid.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

// Initial load
loadPhotos();

// Auto-refresh photos every 30 seconds
setInterval(loadPhotos, 30000);
