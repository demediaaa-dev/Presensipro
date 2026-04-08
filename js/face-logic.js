const FaceService = {
    trackInterval: null,
    isFrozen: false,
    mode: 'presence', // 'register' atau 'presence'

    async initCamera(mode = 'presence') {
        this.mode = mode;
        const video = document.getElementById('video');
        const canvas = document.getElementById('overlay-canvas');
        this.isFrozen = false;
        
        if (document.getElementById('freeze-canvas')) {
            document.getElementById('freeze-canvas').classList.add('hidden');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user", width: 640, height: 480 } 
            });
            video.srcObject = stream;
            await new Promise((resolve) => video.onloadedmetadata = resolve);
            video.play();
            
            // Aktifkan tombol scan (karena ini gimmick, kita lgsg aktifkan saja)
            const btnAction = document.getElementById('btn-camera-action');
            if (btnAction) btnAction.classList.remove('opacity-50', 'pointer-events-none');
            
            this.startGimmickTracking(video, canvas);
        } catch (err) {
            App.showToast("Gagal akses kamera", "error");
        }
    },

    // Animasi kotak scan palsu agar terlihat canggih
    startGimmickTracking(video, canvas) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let scanLineY = 0;

        if (this.trackInterval) clearInterval(this.trackInterval);

        this.trackInterval = setInterval(() => {
            if (this.isFrozen) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Gambar Kotak Fokus (Gimmick)
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            const size = 200;
            const x = (canvas.width - size) / 2;
            const y = (canvas.height - size) / 2;
            ctx.strokeRect(x, y, size, size);

            // Animasi Garis Scan Naik Turun
            ctx.beginPath();
            ctx.moveTo(x, y + scanLineY);
            ctx.lineTo(x + size, y + scanLineY);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.stroke();

            scanLineY += 4;
            if (scanLineY > size) scanLineY = 0;
        }, 30);
    },

    async handleAction() {
        if (this.isFrozen) return;

        const btnText = document.getElementById('btn-text-camera');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        // 1. Capture Foto & Freeze
        const photoCanvas = this.captureAndFreeze();
        this.isFrozen = true;

        // 2. UI Loading Gimmick
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        if (btnText) btnText.innerText = "Menganalisis Wajah...";

        try {
            // Drama sedikit (delay 1.5 detik agar seolah-olah AI sedang berpikir)
            await new Promise(r => setTimeout(r, 1500));

            // 3. Kompresi Gambar (JPEG Quality 0.5 = < 100kb)
            const imageData = photoCanvas.toDataURL('image/jpeg', 0.5);
            
            // Ambil Lokasi GPS
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const payload = {
                    action: (this.mode === 'register') ? "register_face" : "submit_presence",
                    user_id: App.user.id,
                    image: imageData, // Foto asli dikirim ke DB
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                const res = await API.call(payload);

                if (res.success) {
                    App.showToast("Berhasil diproses!", "success");
                    
                    if (this.mode === 'register') {
                        App.hasFaceData = true; 
                        // TAMBAHKAN INI: Paksa UI dashboard update detik ini juga
                        if (typeof App.updateDashboardUI === "function") {
                            App.updateDashboardUI();
                        }
                    }
                    
                    App.closePresence();
                    setTimeout(() => App.syncData(), 1000);
                }
            }, (err) => {
                App.showToast("GPS harus aktif!", "error");
                this.resetUI();
            });

        } catch (e) {
            App.showToast("Gagal memproses data", "error");
            this.resetUI();
        }
    },

    captureAndFreeze() {
        const video = document.getElementById('video');
        const freezeCanvas = document.getElementById('freeze-canvas');
        freezeCanvas.width = video.videoWidth;
        freezeCanvas.height = video.videoHeight;
        const ctx = freezeCanvas.getContext('2d');
        
        // Gambar dari video ke canvas
        ctx.drawImage(video, 0, 0, freezeCanvas.width, freezeCanvas.height);
        freezeCanvas.classList.remove('hidden');
        return freezeCanvas;
    },

    resetUI() {
        this.isFrozen = false;
        document.getElementById('freeze-canvas').classList.add('hidden');
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('btn-text-camera').innerText = "Coba Lagi";
    },

    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        if (this.trackInterval) clearInterval(this.trackInterval);
    }
};