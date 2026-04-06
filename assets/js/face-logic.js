const FaceService = {
  stream: null,

   async processNow() {
    const video = document.getElementById('video');
    
    // EFEK FREEZE: Cukup di-pause agar gambar terakhir tetap muncul (tidak hitam)
    if (video) {
      video.pause(); 
    }

    App.showToast("Memverifikasi...", "success");

    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { 
          enableHighAccuracy: true,
          timeout: 5000 
        });
      });

      const res = await API.call({
        action: 'submit_attendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast("Presensi Berhasil!", "success");
        setTimeout(() => {
          App.closePresence();
          App.render();
        }, 1200);
      } else {
        App.showToast(res.message, "error");
        // Jika gagal (misal luar radius), jalankan lagi videonya
        video.play();
      }
    } catch (e) {
      App.showToast("GPS Gagal!", "error");
      if(video) video.play();
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
    const video = document.getElementById('video');
    
    // EFEK FREEZE: Hentikan stream kamera agar gambar membeku
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      // Biarkan video.srcObject tetap ada sebentar agar gambar tidak langsung hitam
    }

    App.showToast("Mengunci Lokasi...", "success");

    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { 
          enableHighAccuracy: true,
          timeout: 5000 
        });
      });

      const res = await API.call({
        action: 'submit_attendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast("Berhasil! Data Tersimpan", "success");
        // Beri jeda 1 detik agar user bisa lihat foto "freeze" nya sebelum ditutup
        setTimeout(() => {
          App.closePresence();
          App.render();
        }, 1000);
      } else {
        App.showToast(res.message, "error");
        // Jika gagal, nyalakan lagi kameranya agar bisa coba lagi
        this.initCamera(); 
      }
    } catch (e) {
      App.showToast("Gagal GPS. Cek Izin Lokasi!", "error");
      this.initCamera();
    }
  }
};
