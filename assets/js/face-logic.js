// Memuat script face-api.js dari CDN atau lokal
const FaceLogic = {
  isLoaded: false,

  async loadModels() {
    const MODEL_URL = '/models'; 
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    this.isLoaded = true;
    console.log("Models Loaded");
  },

  async getFaceDescriptor(videoElement) {
    const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection ? detection.descriptor : null;
  }
};

const FaceService = {
  stream: null,

  async initCamera() {
    const video = document.getElementById('video');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 400, height: 400 } 
      });
      video.srcObject = this.stream;
    } catch (err) {
      alert("Gagal mengakses kamera: " + err.message);
      App.closePresence();
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  },

  async processNow() {
    this.showToast("Memproses lokasi..."); // Gunakan App.showToast jika ingin konsisten
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      // Diubah dari API.post ke API.call
      const res = await API.call({
        action: 'submit_attendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      if (res.success) {
        App.showToast("Presensi Berhasil!", "success");
        App.closePresence();
      } else {
        App.showToast(res.message, "error");
      }
    }, (err) => {
      App.showToast("Gagal mengambil GPS. Pastikan izin lokasi aktif.", "error");
    });
  }
};