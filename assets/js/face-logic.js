const FaceService = {
  stream: null,

  async initCamera() {
    const video = document.getElementById('video');
    if (!video) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      video.srcObject = this.stream;
      video.onloadedmetadata = () => video.play();
    } catch (err) {
      App.showToast("Kamera error/diblokir", "error");
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    const video = document.getElementById('video');
    if (video) video.srcObject = null;
  },

  async processNow() {
    const video = document.getElementById('video');
    
    // --- EFEK FREEZE YANG BENAR ---
    // Jangan di-stop track-nya, cukup di-pause videonya saja.
    // Gambar terakhir akan tertahan di layar (tidak jadi hitam).
    if (video) {
      video.pause(); 
    }

    App.showToast("Mengunci Lokasi...", "success");

    try {
      // 1. Ambil GPS
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { 
          enableHighAccuracy: true,
          timeout: 5000 
        });
      });

      // 2. Kirim ke Backend
      const res = await API.call({
        action: 'submit_attendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast("Presensi Berhasil!", "success");
        // Beri jeda agar user bisa lihat hasil fotonya sebentar
        setTimeout(() => {
          this.stopCamera(); // Baru matikan kamera setelah modal mau tutup
          App.closePresence();
          App.render();
        }, 1500);
      } else {
        App.showToast(res.message, "error");
        // Jika gagal, jalankan video lagi agar user bisa coba lagi
        if (video) video.play();
      }
    } catch (e) {
      App.showToast("GPS Gagal! Cek izin lokasi.", "error");
      if (video) video.play();
    }
  }
};
