const FaceService = {
  stream: null,
  isProcessing: false, // Tambahkan guard agar tidak double submit

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
    if (video) {
      video.srcObject = null;
      video.pause();
    }
  },

  async processNow() {
    if (this.isProcessing) return; // Cegah klik berulang
    
    const video = document.getElementById('video');
    const btn = document.querySelector('.btn-capture'); // Sesuaikan class tombol capture kamu
    
    this.isProcessing = true;
    if (video) video.pause(); 
    if (btn) btn.disabled = true;

    App.showToast("Mengunci Lokasi & Mengirim...", "success");

    try {
      // 1. Ambil GPS dengan timeout lebih longgar
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { 
          enableHighAccuracy: true,
          timeout: 10000 
        });
      });

      // 2. Kirim ke Backend - PASTI KAN property ID sama dengan di app.js
      // Gunakan fallback untuk menghindari undefined
      const finalUserId = App.user.User_ID || App.user.id;

      const res = await API.call({
        action: 'submit_attendance',
        user_id: finalUserId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast(res.message || "Presensi Berhasil!", "success");
        
        // Update status di aplikasi (agar tombol berubah jadi 'Pulang')
        await App.getAttendanceStatus(); 

        setTimeout(() => {
          this.stopCamera();
          App.closePresence();
          this.isProcessing = false;
        }, 1500);
      } else {
        App.showToast(res.message, "error");
        this.isProcessing = false;
        if (video) video.play();
        if (btn) btn.disabled = false;
      }
    } catch (e) {
      this.isProcessing = false;
      App.showToast("GPS Gagal atau Server Error", "error");
      if (video) video.play();
      if (btn) btn.disabled = false;
    }
  }
};
