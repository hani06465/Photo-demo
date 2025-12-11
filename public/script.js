// script.js - Mobile Front Camera Photo Upload
let currentStream = null;
let currentLocation = null;

async function takePhotoAndUpload() {
    const btn = document.getElementById('actionBtn');
    const status = document.getElementById('status');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const gallery = document.getElementById('gallery');
    
    // Disable button and update UI
    btn.disabled = true;
    btn.textContent = 'Processing...';
    status.textContent = 'Requesting camera access...';
    status.className = 'info';
    
    try {
        // 1. GET FRONT CAMERA SPECIFICALLY
        currentStream = await getFrontCamera();
        
        // Setup video element
        video.srcObject = currentStream;
        video.style.display = 'block';
        video.style.transform = 'scaleX(-1)'; // Mirror for selfie view
        
        status.textContent = 'Getting location...';
        
        // 2. GET LOCATION (optional - won't block if denied)
        currentLocation = await getCurrentLocation();
        
        if (currentLocation) {
            status.textContent = `Location ready. Smile!`;
        } else {
            status.textContent = 'Camera ready. Smile!';
        }
        
        // Small delay for camera to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. CAPTURE PHOTO
        status.textContent = 'Capturing photo...';
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Mirror canvas to match video
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Stop camera immediately after capture
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            video.style.display = 'none';
            video.srcObject = null;
            currentStream = null;
        }
        
        // 4. UPLOAD TO SERVER
        status.textContent = 'Uploading...';
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
        
        const formData = new FormData();
        formData.append('photo', blob, `selfie-${Date.now()}.jpg`);
        formData.append('latitude', currentLocation?.latitude || 0);
        formData.append('longitude', currentLocation?.longitude || 0);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            status.textContent = '✅ Selfie uploaded!';
            status.className = 'success';
            
            // Display the uploaded selfie
            displayPhoto(result.photoUrl, gallery);
            
        } else {
            throw new Error(result.error || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Clean up camera on error
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            video.style.display = 'none';
            video.srcObject = null;
            currentStream = null;
        }
        
        status.textContent = `❌ ${getErrorMessage(error)}`;
        status.className = 'error';
        
    } finally {
        // Reset button
        btn.disabled = false;
        btn.textContent = 'Take Another Selfie';
    }
}

// FUNCTION: Get front-facing camera specifically
async function getFrontCamera() {
    try {
        // First try to get devices list
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        // Try to find front camera by label
        let frontCameraId = null;
        for (const device of videoDevices) {
            const label = device.label.toLowerCase();
            if (label.includes('front') || 
                label.includes('selfie') || 
                label.includes('face') ||
                (label.includes('camera') && !label.includes('back'))) {
                frontCameraId = device.deviceId;
                console.log('Found front camera:', device.label);
                break;
            }
        }
        
        // Try different methods to get front camera
        try {
            if (frontCameraId) {
                // Method 1: Exact device ID
                return await navigator.mediaDevices.getUserMedia({
                    video: { 
                        deviceId: { exact: frontCameraId },
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
            }
        } catch (e) {
            console.log('Exact device failed, trying facingMode...');
        }
        
        // Method 2: Facing mode fallback
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user',  // Front camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
        } catch (e) {
            console.log('FacingMode failed, trying any camera...');
        }
        
        // Method 3: Any camera as last resort
        return await navigator.mediaDevices.getUserMedia({ 
            video: true 
        });
        
    } catch (error) {
        console.error('Camera setup error:', error);
        throw new Error('Could not access camera. Please ensure camera permissions are granted.');
    }
}

// FUNCTION: Get current location
async function getCurrentLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            resolve(null);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.log('Location permission denied or error:', error.message);
                resolve(null); // Continue without location
            },
            { 
                timeout: 10000,
                enableHighAccuracy: true,
                maximumAge: 0
            }
        );
    });
}

// FUNCTION: Display photo in gallery
function displayPhoto(photoUrl, gallery) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'photo-item';
    imgContainer.style.display = 'inline-block';
    imgContainer.style.margin = '10px';
    imgContainer.style.textAlign = 'center';
    
    const img = document.createElement('img');
    img.src = photoUrl;
    img.style.maxWidth = '250px';
    img.style.height = '250px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '10px';
    img.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    img.style.transform = 'scaleX(-1)'; // Mirror for display
    
    const timestamp = document.createElement('div');
    timestamp.textContent = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    timestamp.style.fontSize = '12px';
    timestamp.style.color = '#666';
    timestamp.style.marginTop = '5px';
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(timestamp);
    
    // Add to beginning of gallery
    gallery.insertBefore(imgContainer, gallery.firstChild);
    
    // Limit gallery to 10 photos
    const allPhotos = gallery.querySelectorAll('.photo-item');
    if (allPhotos.length > 10) {
        gallery.removeChild(allPhotos[allPhotos.length - 1]);
    }
}

// FUNCTION: User-friendly error messages
function getErrorMessage(error) {
    if (error.name === 'NotAllowedError') {
        return 'Camera access was denied. Please allow camera permissions and try again.';
    } else if (error.name === 'NotFoundError') {
        return 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
        return 'Camera is already in use by another application.';
    } else if (error.message.includes('network')) {
        return 'Network error. Please check your connection.';
    } else {
        return error.message || 'An unexpected error occurred.';
    }
}

// FUNCTION: Load existing photos on page load
async function loadExistingPhotos() {
    try {
        const response = await fetch('/photos');
        const photos = await response.json();
        const gallery = document.getElementById('gallery');
        
        photos.forEach(photoUrl => {
            displayPhoto(photoUrl, gallery);
        });
    } catch (error) {
        console.log('No existing photos or server error:', error.message);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Photo Upload App Initialized');
    
    // Load any existing photos
    loadExistingPhotos();
    
    // Add click event to button if not already in HTML
    const btn = document.getElementById('actionBtn');
    if (btn && !btn.onclick) {
        btn.onclick = takePhotoAndUpload;
    }
    
    // Optional: Add a camera flip button if you want both cameras
    // addCameraFlipButton();
});

// OPTIONAL: Camera flip function for future enhancement
/*
async function switchCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    // Implementation for switching between front/back cameras
    // Would need to track current camera state
}
*/