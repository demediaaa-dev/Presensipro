const App = {
    user: null,
    isWithinRadius: true,
    attendanceStatus: 'none',
    hasFaceData: false,
    timer: null,

    async init() {
        const saved = localStorage.getItem('sipanda_session');
        if (saved) {
            this.user = JSON.parse(saved);
            if (!window.location.hash || window.location.hash === '#login') {
                window.location.hash = '#dashboard';
            }
        } else {
            window.location.hash = '#login';
        }

        window.addEventListener('hashchange', () => this.router());
        this.router();
    },

    async router() {
        const hash = window.location.hash || '#login';
        const root = document.getElementById('app-content');
        
        let pageFile = 'pages/login.html';
        if (hash === '#dashboard') pageFile = 'pages/dashboard-user.html';
        if (hash === '#history') pageFile = 'pages/history.html';
        if (hash === '#admin') pageFile = 'pages/dashboard-admin.html';

        try {
            const res = await fetch(pageFile);
            root.innerHTML = await res.text();
            
            if (hash !== '#login') {
                await this.syncData();
                this.initPageData();
            }
            lucide.createIcons();
            this.startClock();
        } catch (e) { console.error("Router Error:", e); }
    },


    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const color = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-800');
        const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'x-circle' : 'info');

        toast.className = `${color} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transform transition-all duration-500 translate-y-[-20px] opacity-0`;
        toast.innerHTML = `
            <i data-lucide="${icon}" class="w-5 h-5"></i>
            <span class="text-xs font-bold uppercase tracking-wider">${message}</span>
        `;

        container.appendChild(toast);
        lucide.createIcons();

        // Trigger animasi masuk
        setTimeout(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        }, 10);

        // Hapus toast setelah 3 detik
        setTimeout(() => {
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    // --- TOGGLE PASSWORD ---
    togglePassword() {
        const input = document.getElementById('password');
        const icon = document.getElementById('eye-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    },

    openLogoutModal() {
        const overlay = document.getElementById('logout-overlay');
        const sheet = document.getElementById('logout-sheet');
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
        this.initSwipeToDismiss(sheet, () => this.closeLogoutModal());
    },

    closeLogoutModal() {
        const overlay = document.getElementById('logout-overlay');
        const sheet = document.getElementById('logout-sheet');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        sheet.style.transform = 'translateY(100%)';
    },

    confirmLogout() {
        this.showToast("Berhasil keluar", "info");
        localStorage.removeItem('sipanda_session');
        this.user = null;
        this.closeLogoutModal();
        setTimeout(() => window.location.hash = '#login', 500);
    },

    // --- LOGIKA SWIPE TO DISMISS ---
    initSwipeToDismiss(element, closeCallback) {
        let startY = 0;
        let currentY = 0;

        element.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                element.style.transform = `translateY(${diff}px)`;
                element.style.transition = 'none'; // Matikan transisi saat menyeret
            }
        }, { passive: true });

        element.addEventListener('touchend', () => {
            const diff = currentY - startY;
            element.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            
            if (diff > 150) { // Jika diseret lebih dari 150px, tutup
                closeCallback();
            } else {
                element.style.transform = 'translateY(0)'; // Kembalikan ke posisi awal
            }
            startY = 0; currentY = 0;
        });
    },

    // --- FUNGSI LOGIN ---
    async handleLogin() {
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const btn = document.getElementById('btn-login');
        const loader = document.getElementById('btn-loader');
        const btnText = document.getElementById('btn-text');

        if (!u || !p) return this.showToast("Isi semua data!", "error");

        // Loading State On
        btn.disabled = true;
        loader.classList.remove('hidden');
        btnText.innerText = "Memproses...";

        try {
            const res = await API.call({ action: "login", username: u, password: p });
            if (res.success) {
                this.showToast(`Selamat datang, ${res.data.name}!`, "success");
                this.user = { id: res.data.id, Name: res.data.name, Role: res.data.role };
                localStorage.setItem('sipanda_session', JSON.stringify(this.user));
                
                setTimeout(() => {
                    window.location.hash = (this.user.Role.toLowerCase() === 'admin') ? '#admin' : '#dashboard';
                }, 1000);
            } else {
                this.showToast(res.message, "error");
            }
        } catch (e) { 
            this.showToast("Masalah koneksi!", "error");
        } finally {
            // Loading State Off
            btn.disabled = false;
            loader.classList.add('hidden');
            btnText.innerText = "Masuk Sistem";
        }
    },

    async syncData() {
        if (!this.user) return;
        try {
            const res = await API.call({ action: "get_status", user_id: this.user.id });
            if (res.success) {
                this.attendanceStatus = res.status;
                this.hasFaceData = res.hasFaceData;
                
                // Update Teks Jam Masuk & Pulang di UI
                const elIn = document.getElementById('time-in');
                const elOut = document.getElementById('time-out');
                
                if (elIn) elIn.innerText = res.timeIn || "-- : --";
                if (elOut) elOut.innerText = res.timeOut || "-- : --";
            }
        } catch (e) { console.error("Sync data failed"); }
    },

    initPageData() {
        if (!this.user) return;
        document.querySelectorAll('.display-name').forEach(el => el.innerText = this.user.Name);
        document.querySelectorAll('.display-role').forEach(el => el.innerText = this.user.Role);
        if (window.location.hash === '#dashboard') this.updateDashboardUI();
    },

    updateDashboardUI() {
        const regCard = document.getElementById('face-reg-card');
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');

        if (regCard) {
            this.hasFaceData ? regCard.classList.add('hidden') : regCard.classList.remove('hidden');
        }

        if (btnPresensi) {
            if (!this.hasFaceData) {
                btnPresensi.className = "w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl bg-gray-300 opacity-50 pointer-events-none";
                if (labelPresensi) labelPresensi.innerText = "Daftar Dulu";
            } else {
                const activeColor = this.attendanceStatus === 'in' ? 'bg-indigo-600' : 'bg-red-600';
                btnPresensi.className = `w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition active:scale-90 ${activeColor}`;
                if (labelPresensi) labelPresensi.innerText = this.attendanceStatus === 'in' ? 'Pulang' : 'Presensi';
            }
        }
    },

    // --- MANAJEMEN MODAL KAMERA ---
    openCameraModal(mode = 'presence') {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        const btn = document.getElementById('btn-camera-action');
        const title = document.getElementById('camera-title');
        this.initSwipeToDismiss(sheet, () => this.closePresence());

        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';

        if (mode === 'register') {
            title.innerText = "Daftar Wajah";
            btn.innerText = "DAFTARKAN WAJAH SAYA";
            // Jika mode daftar, targetkan ke Admin logic
            btn.onclick = () => Admin.processRegistration();
        } else {
            title.innerText = "Verifikasi Wajah";
            btn.innerText = this.attendanceStatus === 'in' ? "KONFIRMASI PULANG" : "KONFIRMASI PRESENSI";
            btn.onclick = () => FaceService.processNow();
        }

        setTimeout(() => FaceService.initCamera(), 500);
    },

    closePresence() {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
        if (sheet) sheet.style.transform = 'translateY(100%)';
        FaceService.stopCamera();
    },

    startPresence() { this.openCameraModal('presence'); },
    
    startSelfRegistration() { 
        Admin.currentRegID = this.user.id; // Set ID user saat ini untuk didaftar
        this.openCameraModal('register'); 
    },
    
    startClock() {
        const el = document.getElementById('clock');
        if (el) {
            if (this.timer) clearInterval(this.timer);
            this.timer = setInterval(() => {
                el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB";
            }, 1000);
        }
    },

    logout() {
        localStorage.removeItem('sipanda_session');
        this.user = null;
        window.location.hash = '#login';
    }
};

// --- LOGIKA ADMIN & REGISTRASI ---
const Admin = {
    currentRegID: null,

    // Fungsi untuk admin mendaftarkan pegawai lain
    startRegistration() {
        const id = document.getElementById('reg-user-id').value;
        if (!id) return alert("Isi ID Pegawai dulu!");
        this.currentRegID = id;
        App.openCameraModal('register');
    },

    async processRegistration() {
        const video = document.getElementById('video');
        if (!video) return;

        try {
            console.log("Menganalisis wajah untuk ID:", this.currentRegID);
            
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                          .withFaceLandmarks()
                                          .withFaceDescriptor();

            if (!detection) return alert("Wajah tidak terdeteksi jelas!");

            const faceDataString = JSON.stringify(Array.from(detection.descriptor));

            const res = await API.call({
                action: "register_face",
                employeeId: this.currentRegID,
                faceData: faceDataString
            });

            if (res.success) {
                alert("Wajah Berhasil Terdaftar!");
                App.closePresence();
                // Jika yang daftar adalah user itu sendiri (mandiri), update flag
                if (this.currentRegID === App.user.id) App.hasFaceData = true;
                
                setTimeout(() => App.router(), 500); // Refresh UI
            } else {
                alert(res.message);
            }
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan data wajah");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());