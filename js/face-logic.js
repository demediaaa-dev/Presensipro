const FaceService = {
    async initCamera() {
        const video = document.getElementById('video');
        if (!video) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } } 
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play().catch(e => console.error("Play error:", e));
                console.log("Kamera Aktif");
            };
        } catch (err) {
            console.error("Gagal Kamera:", err);
            alert("Izin kamera diperlukan!");
        }
    },

    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    },

    async processNow() {
        console.log("Memulai verifikasi...");
        // Logika verifikasi face-api Anda di sini...
    }
};