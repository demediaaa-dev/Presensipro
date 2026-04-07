const FaceService = {
    modelLoaded: false,
    MODEL_URL: './models', // Sesuaikan dengan folder models kamu

    async loadModels() {
        if (this.modelLoaded) return;
        
        try {
            App.showToast("Memuat AI...", "info");
            // Memanggil library face-api (pastikan script face-api.min.js sudah di-import di index.html)
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
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    },

    async processNow() {
        // 1. Validasi awal: Pastikan library face-api sudah termuat
        if (typeof faceapi === 'undefined') {
            return App.showToast("Library AI belum siap, tunggu sebentar...", "error");
        }

        // 2. Cek Siapa yang Memanggil (Admin vs User)
        if (App.currentPage === 'admin') {
            // Jika Admin sedang mendaftarkan wajah pegawai baru
            Admin.processRegistration();
        } else {
            // Jika User sedang melakukan presensi (Masuk/Pulang)
            try {
                const video = document.getElementById('video');
                if (!video) return App.showToast("Kamera tidak ditemukan!", "error");

                App.showToast("Memindai Wajah...", "info");

                // 3. Deteksi wajah dari frame video
                // Menggunakan TinyFaceDetector agar ringan di HP/Browser
                const detection = await faceapi.detectSingleFace(
                    video, 
                    new faceapi.TinyFaceDetectorOptions()
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

                // 4. Cek apakah wajah ditemukan
                if (!detection) {
                    App.showToast("Wajah tidak terdeteksi, coba lagi!", "error");
                    return;
                }

                // 5. Logika Pembanding
                // detection.descriptor adalah Array 128 angka unik (Faceprint)
                console.log("Face Descriptor Berhasil Diekstrak:", detection.descriptor);
                
                // Lanjutkan ke pengiriman data ke server
                this.submitAttendance(detection.descriptor);

            } catch (error) {
                console.error("Gagal saat memindai:", error);
                App.showToast("Terjadi kesalahan pada pemindaian AI", "error");
            }
        }
    },

    async submitAttendance(descriptor) {
        // Kirim data ke API.js
        App.showToast("Berhasil! Mengirim data...", "success");
        setTimeout(() => {
            App.closePresence();
            App.render(); // Refresh UI
        }, 1500);
    }
};