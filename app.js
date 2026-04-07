const App = {
    user: null,
    currentPage: 'login',
    showPass: false,
    isWithinRadius: true,
    attendanceStatus: 'none',
    historyTab: 'presensi',
    historyData: { presensi: [], dinas: [] },

    async init() {
        const saved = localStorage.getItem('sipanda_session');
        if (saved) {
            this.user = JSON.parse(saved);
            this.currentPage = (this.user.Role.toLowerCase() === 'admin') ? 'admin' : 'dashboard';
            await Promise.all([this.getAttendanceStatus(), this.checkLocationAccess()]);
        }
        this.render();
    },

    // Tambahkan ini di dalam objek App di app.js
    async getAttendanceStatus() {
        // Sementara kita set 'none' agar aplikasi bisa terbuka
        // Nanti bagian ini akan berisi pemanggilan ke API.call({action: "getStatus"})
        this.attendanceStatus = 'none'; 
        console.log("Status absen berhasil dicek (Temporary)");
        return true;
    },

    async checkLocationAccess() {
        // Fungsi sementara untuk pengecekan lokasi
        // Di sini nanti logika Leaflet.js atau Geolocation API masuk
        this.isWithinRadius = true; 
        console.log("Lokasi berhasil dicek (Temporary)");
        return true;
    },

    async render() {
        const root = document.getElementById('app');
        let pageFile = 'pages/login.html';

        if (this.currentPage === 'admin') pageFile = 'pages/dashboard-admin.html';
        else if (this.currentPage === 'dashboard') pageFile = 'pages/dashboard-user.html';
        else if (this.currentPage === 'history') pageFile = 'pages/history.html';

        try {
            const response = await fetch(pageFile);
            const html = await response.text();
            root.innerHTML = html;

            // Jalankan inisialisasi data setelah HTML dimuat
            this.initPageData();
            lucide.createIcons();
            this.startClock();
        } catch (e) {
            console.error("Gagal memuat halaman:", e);
        }
    },

    initPageData() {
        if (!this.user) return;

        // Isi Nama & Role (Global selector)
        const nameEls = document.querySelectorAll('.display-name');
        const roleEls = document.querySelectorAll('.display-role');
        nameEls.forEach(el => el.innerText = this.user.Name);
        roleEls.forEach(el => el.innerText = this.user.Role);

        // Jika halaman user, update UI spesifik
        if (this.currentPage === 'dashboard') {
            this.updateUserDashboardUI();
        }

        // Jika halaman history, render list
        if (this.currentPage === 'history') {
            const listContainer = document.getElementById('history-list');
            if (listContainer) {
                listContainer.innerHTML = this.historyTab === 'presensi' ? this.renderPresensiList() : this.renderDinasList();
            }
        }
    },

    updateUserDashboardUI() {
        const statusColor = this.isWithinRadius ? 'bg-green-500' : 'bg-red-500';
        const statusText = this.isWithinRadius ? 'DALAM RADIUS' : 'LUAR RADIUS';
        
        const dot = document.getElementById('radius-dot');
        const txt = document.getElementById('radius-text');
        if (dot) { dot.className = `w-2 h-2 ${statusColor} rounded-full animate-pulse`; }
        if (txt) { txt.innerText = statusText; }

        // Logic tombol presensi tengah
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');
        
        if (btnPresensi) {
            if (this.isWithinRadius && this.attendanceStatus !== 'out') {
                btnPresensi.classList.remove('bg-gray-300', 'cursor-not-allowed');
                btnPresensi.classList.add(this.attendanceStatus === 'in' ? 'bg-indigo-600' : 'bg-red-600');
                labelPresensi.innerText = this.attendanceStatus === 'in' ? 'Pulang' : 'Presensi';
            } else {
                btnPresensi.classList.add('bg-gray-300', 'cursor-not-allowed');
                labelPresensi.innerText = 'Terkunci';
            }
        }
    },

    // --- FUNGSI AKSES ---
    async handleLogin() {
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        if (!u || !p) return this.showToast("Lengkapi data!", "error");
        
        const btn = document.getElementById('btnLogin');
        btn.disabled = true;
        btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>`;
        
        try {
            const res = await API.call({ action: "login", username: u, password: p });
            if (res.success) {
                this.user = { id: res.data.id, Name: res.data.name, Role: res.data.role };
                localStorage.setItem('sipanda_session', JSON.stringify(this.user));
                this.currentPage = (this.user.Role.toLowerCase() === 'admin') ? 'admin' : 'dashboard';
                this.render();
            } else {
                this.showToast(res.message, "error");
                btn.disabled = false;
                btn.innerHTML = "Masuk ke Sistem";
            }
        } catch (e) {
            this.showToast("Gagal terhubung", "error");
            btn.disabled = false;
            btn.innerHTML = "Masuk ke Sistem";
        }
    },

    logout() {
        const overlay = document.getElementById('logout-overlay');
        const sheet = document.getElementById('logout-sheet');
        overlay.classList.remove('hidden');
        setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
        lucide.createIcons();
    },

    closeLogoutModal() {
        const overlay = document.getElementById('logout-overlay');
        const sheet = document.getElementById('logout-sheet');
        sheet.classList.add('translate-y-full');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    },

    executeLogout() {
        localStorage.removeItem('sipanda_session');
        location.reload(); // Paling aman untuk reset total SPA
    },

    // --- FUNGSI MODAL PRESENSI ---
    startPresence() {
        if (!this.isWithinRadius) return;
        if (this.attendanceStatus === 'in') { this.openConfirmOut(); return; }
        this.openCameraModal();
    },

    openCameraModal() {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
        if (typeof FaceService !== 'undefined') FaceService.initCamera();
    },

    closePresence() {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        sheet.style.transform = 'translateY(100%)';
        if (typeof FaceService !== 'undefined') FaceService.stopCamera();
    },

    openConfirmOut() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        overlay.classList.remove('hidden');
        setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
        lucide.createIcons();
    },

    closeConfirmOut() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        sheet.classList.add('translate-y-full');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    },

    processOutConfirmation() {
        this.closeConfirmOut();
        setTimeout(() => this.openCameraModal(), 400);
    },

    // --- UTILS ---
    startClock() {
        const el = document.getElementById('clock');
        if (el) {
            if (this.clockTimer) clearInterval(this.clockTimer);
            this.clockTimer = setInterval(() => {
                el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB";
            }, 1000);
        }
    },

    showToast(msg, type = "success") {
        let container = document.getElementById('toast-box') || Object.assign(document.createElement('div'), {id:'toast-box', className:'fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs px-4'});
        document.body.appendChild(container);
        const t = document.createElement('div');
        t.className = `${type === "error" ? "bg-red-600" : "bg-gray-900"} text-white px-6 py-4 rounded-2xl shadow-2xl mb-3 text-sm font-bold text-center transition-all duration-500`;
        t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    },
};

const Admin = {
    isSidebarCollapsed: false,

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        const labels = document.querySelectorAll('.nav-label');
        const logoText = document.querySelector('.logo-text');
        
        if (this.isSidebarCollapsed) {
            sidebar.style.width = '16rem'; // w-64
            labels.forEach(el => el.style.display = 'block');
            logoText.style.display = 'block';
        } else {
            sidebar.style.width = '5rem'; // w-20
            labels.forEach(el => el.style.display = 'none');
            logoText.style.display = 'none';
        }
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    },

    setTab(tab) {
        // Logika sederhana ganti warna tombol nav
        document.querySelectorAll('.admin-nav-item').forEach(el => {
            el.classList.remove('active', 'bg-red-50', 'text-red-600');
            el.classList.add('text-gray-400');
        });
        
        // Target elemen yang diklik (mobile/desktop) bisa dikembangkan di sini
        App.showToast(`Pindah ke tab ${tab}`, 'info');
    },

    currentRegID: null,

    startRegistration() {
        const id = document.getElementById('reg-user-id').value;
        if (!id) return App.showToast("Isi ID Pegawai dulu!", "error");
        
        this.currentRegID = id;
        // Gunakan modal kamera yang sudah ada di index.html
        App.openCameraModal();
        
        // Ubah teks tombol di modal agar sesuai konteks Admin
        const btn = document.querySelector('#presence-sheet button');
        btn.innerText = "DAFTARKAN WAJAH";
        btn.onclick = () => Admin.processRegistration();
    },

    async processRegistration() {
        const video = document.getElementById('video');
        App.showToast("Menganalisis Wajah...", "info");

        // Deteksi wajah dengan akurasi tinggi untuk master data
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

        if (!detection) return App.showToast("Wajah tidak jelas!", "error");

        // Ubah descriptor (Float32Array) menjadi string agar bisa disimpan di Spreadsheet
        const faceDescriptorString = JSON.stringify(Array.from(detection.descriptor));

        try {
            const res = await API.call({
                action: "register_face",
                employeeId: this.currentRegID,
                faceData: faceDescriptorString
            });

            if (res.success) {
                App.showToast("Wajah Berhasil Terdaftar!", "success");
                App.closePresence();
                document.getElementById('reg-user-id').value = '';
            } else {
                App.showToast(res.message, "error");
            }
        } catch (e) {
            App.showToast("Gagal simpan ke server", "error");
        }
    }

};

document.addEventListener('DOMContentLoaded', () => App.init());