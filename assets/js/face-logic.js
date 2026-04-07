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
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 400, height: 400, facingMode: "user" } 
            });
            video.srcObject = stream;
        } catch (err) {
            App.showToast("Kamera tidak diizinkan", "error");
        }
    },

    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    },

    async processNow() {
        if (typeof faceapi === 'undefined') {
            return App.showToast("Library AI belum siap!", "error");
        }

        if (App.currentPage === 'admin') {
            Admin.processRegistration();
        } else {
            try {
                const video = document.getElementById('video');
                if (!video) return App.showToast("Kamera tidak ditemukan!", "error");

                App.showToast("Memverifikasi Wajah...", "info");

                // 1. Deteksi wajah dari kamera
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                              .withFaceLandmarks()
                                              .withFaceDescriptor();

                if (!detection) return App.showToast("Wajah tidak terdeteksi!", "error");

                // 2. Ambil Descriptor Master dari Database via API
                const res = await API.call({ action: "get_face_data", user_id: App.user.id });
                
                if (!res.success || !res.faceData) {
                    return App.showToast("Data wajah master tidak ditemukan!", "error");
                }

                // 3. Bandingkan Wajah (Face Matching)
                const masterDescriptor = new Float32Array(JSON.parse(res.faceData));
                const distance = faceapi.euclideanDistance(detection.descriptor, masterDescriptor);

                console.log("Tingkat Ketidakmiripan (Distance):", distance);

                // Batas toleransi (0.5 - 0.6). Jika lebih besar, berarti orang lain.
                if (distance > 0.5) {
                    return App.showToast("Wajah tidak cocok!", "error");
                }

                // 4. Jika Cocok, kirim presensi
                this.submitAttendance();

            } catch (error) {
                console.error("Gagal verifikasi:", error);
                App.showToast("Gagal memproses data wajah", "error");
            }
        }
    },

    async submitAttendance() {
        try {
            // Ambil koordinat (Default Jakarta jika gagal/dummy)
            const lat = -6.2000; 
            const lng = 106.8166;

            const res = await API.call({ 
                action: "process_attendance", 
                user_id: App.user.id,
                lat: lat,
                lng: lng
            });

            if (res.success) {
                App.showToast(res.message, "success");
                App.closePresence();
                // Tunggu sebentar lalu refresh status dan UI
                setTimeout(async () => {
                    await App.getAttendanceStatus();
                    App.render();
                }, 500);
            } else {
                App.showToast(res.message, "error");
            }
        } catch (e) {
            App.showToast("Gagal mengirim data presensi", "error");
        }
    }
};