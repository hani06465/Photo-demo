async function takePhotoAndUpload() {
    const btn = document.getElementById('actionBtn');
    const status = document.getElementById('status');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const gallery = document.getElementById('gallery');
    
    // Disable button and show status
    btn.disabled = true;
    btn.textContent = 'Processing...';
    status.textContent = 'Requesting camera and location access...';
    status.className = 'info';
    
    try {
        // 1. REQUEST PERMISSIONS SIMULTANEOUSLY
        // The browser will show its own permission dialogs here
        const [stream, position] = await Promise.all([
            navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            }),
            new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    resolve(null); // Continue without location
                    return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 8000,
                    enableHighAccuracy: true
                });
            }).catch(() => null) // Continue even if location fails
        ]);
        
        // 2. SET UP CAMERA
        video.srcObject = stream;
        status.textContent = 'Camera ready. Capturing photo...';
        
        // Wait a moment for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 3. CAPTURE PHOTO FROM VIDEO
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Stop camera immediately after capture
        stream.getTracks().forEach(track => track.stop());
        
        // 4. PREPARE UPLOAD DATA
        const location = position ? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        } : { latitude: 0, longitude: 0 };
        
        status.textContent = 'Uploading to server...';
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => 
            canvas.toBlob(resolve, 'image/jpeg', 0.9)
        );
        
        const formData = new FormData();
        formData.append('photo', blob, `photo-${Date.now()}.jpg`);
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
        
        // 5. UPLOAD TO SERVER
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            status.textContent = '✅ Photo uploaded successfully!';
            status.className = 'success';
            
            // Show the uploaded photo in gallery
            const img = document.createElement('img');
            img.src = result.photoUrl;
            img.style.maxWidth = '300px';
            img.style.margin = '10px';
            img.style.borderRadius = '5px';
            gallery.prepend(img);
            
        } else {
            throw new Error(result.error || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Error:', error);
        status.textContent = `❌ Error: ${error.message}`;
        status.className = 'error';
    } finally {
        // 6. RESET BUTTON
        btn.disabled = false;
        btn.textContent = 'Take & Upload Another Photo';
        video.srcObject = null;
    }
}

// Optional: Load existing photos on page load
async function loadExistingPhotos() {
    try {
        const response = await fetch('/photos');
        const photos = await response.json();
        const gallery = document.getElementById('gallery');
        
        photos.forEach(photoUrl => {
            const img = document.createElement('img');
            img.src = photoUrl;
            img.style.maxWidth = '200px';
            img.style.margin = '5px';
            gallery.appendChild(img);
        });
    } catch (error) {
        console.log('No existing photos or server error');
    }
}

// Load photos when page opens
loadExistingPhotos();
