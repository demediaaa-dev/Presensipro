const FaceService = {
  stream: null,

  async initCamera() {
    const video = document.getElementById('video');
    if (!video) return console.error("Elemen video tidak ditemukan!");
    
    try {
      // Hentikan stream lama jika masih ada (pembersihan)
      this.stopCamera();

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false 
      });

      video.srcObject = this.stream;

      // PENTING: Tunggu video siap lalu jalankan play()
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Gagal auto-play:", e));
      };

    } catch (err) {
      console.error("Kamera Error:", err);
      App.showToast("Kamera diblokir atau tidak ditemukan!", "error");
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
