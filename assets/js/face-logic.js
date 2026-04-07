const FaceService = {
    modelLoaded: false,
    MODEL_URL: './models', 

    async loadModels() {
        if (this.modelLoaded) return;
        try {
            App.showToast("Memuat AI...", "info");
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL)
            ]);
            this.modelLoaded = true;
            console.log("Model AI Berhasil Dimuat");
        } catch (e) {
            console.error("Gagal memuat model:", e);
            App.showToast("Gagal memuat AI", "error");
        }
    },

// Update di face-logic.js
    async initCamera() {
        await this.loadModels();
        const video = document.getElementById('video');
        if (!video) {
            console.error("Elemen video tidak ditemukan di DOM!");
            return;
        }
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 }, 
                    facingMode: "user" 
                } 
            });
            
            video.srcObject = stream;
            
            // Paksa Play
            try {
                await video.play();
                console.log("Stream kamera berhasil dijalankan");
            } catch (e) {
                console.warn("Autoplay dicegah, mencoba play manual...", e);
                video.play();
            }
    
        } catch (err) {
            console.error("Error getUserMedia:", err);
            App.showToast("Kamera error: " + err.name, "error");
        }
    },
    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    },

    async processNow() {
        if (typeof faceapi === 'undefined') return App.showToast("AI belum siap!", "error");
    
        const video = document.getElementById('video');
        if (!video) return;
    
        // JIKA USER BELUM PUNYA DATA WAJAH -> JALANKAN PENDAFTARAN
        if (!App.hasFaceData || App.currentPage === 'admin') {
            Admin.processRegistration();
            return;
        }
    
        // JIKA USER SUDAH PUNYA DATA WAJAH -> JALANKAN PRESENSI
        try {
            App.showToast("Memverifikasi Wajah...", "info");
    
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                          .withFaceLandmarks()
                                          .withFaceDescriptor();
    
            if (!detection) return App.showToast("Wajah tidak terdeteksi!", "error");
    
            // Ambil data master untuk dibandingan
            const res = await API.call({ action: "get_face_data", user_id: App.user.id });
            
            if (res.success && res.faceData) {
                const masterDescriptor = new Float32Array(JSON.parse(res.faceData));
                const distance = faceapi.euclideanDistance(detection.descriptor, masterDescriptor);
    
                if (distance > 0.5) return App.showToast("Wajah tidak cocok!", "error");
                
                // Lolos verifikasi, panggil submit presensi
                this.submitAttendance();
            } else {
                App.showToast("Data wajah tidak ditemukan di server", "error");
            }
        } catch (error) {
            console.error(error);
            App.showToast("Gagal memproses wajah", "error");
        }
    },
    
    async submitAttendance() {
        try {
            const res = await API.call({ 
                action: "process_attendance", 
                user_id: App.user.id,
                lat: -6.2, lng: 106.8 // Ganti dengan logika navigasi asli nanti
            });
    
            if (res.success) {
                App.showToast(res.message, "success");
                App.closePresence();
                setTimeout(async () => {
                    await App.getAttendanceStatus();
                    App.render();
                }, 500);
            }
        } catch (e) { App.showToast("Gagal kirim data", "error"); }
    }
