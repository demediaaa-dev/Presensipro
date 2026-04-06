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
    if (!video) return console.error("Elemen video tidak ditemukan!");
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      video.srcObject = this.stream;
    } catch (err) {
      App.showToast("Kamera diblokir!", "error");
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  },

  async processNow() {
    App.showToast("Memindai Wajah...", "success");
    
    // Logika Sinkronisasi Database (Step 1 yang tadi)
    try {
      // 1. Ambil GPS
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      
      // 2. Kirim ke Backend GAS
      const res = await API.post({
        action: 'submitAttendance',
        user_id: App.user.User_ID,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        // Face_Descriptor: hasil_scan_wajah
      });

      if (res.success) {
        App.showToast("Berhasil! Selamat Bekerja", "success");
        App.closePresence();
        App.render();
      } else {
        App.showToast(res.message, "error");
      }
    } catch (e) {
      App.showToast("Gagal verifikasi lokasi", "error");
    }
  }
};
