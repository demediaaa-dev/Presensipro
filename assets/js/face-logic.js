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

    async initCamera() {
        await this.loadModels();
        const video = document.getElementById('video');
        if (!video) return console.error("Elemen video tidak ditemukan!");
    
        // Stop stream lama jika masih ada (mencegah tabrakan)
        if (video.srcObject) {
            this.stopCamera();
        }
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 640 }, // Gunakan 1:1 agar pas dengan frame bulat/kotak
                    facingMode: "user" 
                } 
            });
            
            video.srcObject = stream;
            
            // Gunakan event listener untuk memastikan video dimainkan setelah data dimuat
            video.onloadedmetadata = () => {
                video.play().catch(e => console.error("Gagal play video:", e));
            };
    
        } catch (err) {
            console.error("Error akses kamera:", err);
            let msg = "Kamera tidak diizinkan atau tidak ditemukan.";
            if (err.name === 'NotAllowedError') msg = "Izin kamera ditolak browser.";
            App.showToast(msg, "error");
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
