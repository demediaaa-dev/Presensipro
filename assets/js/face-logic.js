const FaceService = {
  stream: null,

  async initCamera() {
    const video = document.getElementById('video');
    if (!video) return console.error("Elemen video tidak ditemukan!");
    
    // Reset video state
    video.pause();
    video.srcObject = null;

    const constraints = { 
      video: { 
        facingMode: "user",
        // Hapus spesifikasi width/height ideal sementara untuk tes
      },
      audio: false 
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.stream;
      
      // Gunakan event 'loadeddata' bukan 'metadata' agar lebih pasti
      video.addEventListener('loadeddata', async () => {
        try {
          await video.play();
          console.log("Video playing successfully");
        } catch (err) {
          console.error("Autoplay failed, trying manual play:", err);
          // Jika gagal autoplay, biasanya butuh interaksi user
        }
      });

    } catch (err) {
      console.error("Gagal akses kamera:", err);
      if (err.name === 'NotAllowedError') {
        App.showToast("Izin kamera ditolak browser!", "error");
      } else {
        App.showToast("Kamera tidak terdeteksi", "error");
      }
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    const video = document.getElementById('video');
    if (video) video.srcObject = null;
  },

  async processNow() {
    // Tombol loading state
    App.showToast("Memproses Presensi...", "success");
    
    try {
      // 1. Cek GPS dengan Timeout (agar tidak gantung jika GPS mati)
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      
      // 2. Kirim ke Backend (Pastikan action sesuai dengan Code.gs: 'submit_attendance')
      const res = await API.call({
        action: 'submit_attendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast("Presensi Berhasil!", "success");
        App.closePresence();
        // Update dashboard jika perlu
        App.render();
      } else {
        App.showToast(res.message, "error");
      }
    } catch (e) {
      console.error("Attendance Error:", e);
      App.showToast("Gagal verifikasi lokasi/GPS", "error");
    }
  }
};
