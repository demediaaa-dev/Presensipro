const App = {
    user: null,
    currentPage: 'login',
    showPass: false,
    isWithinRadius: true,
    attendanceStatus: 'none',
    historyTab: 'presensi',
    historyData: { presensi: [], dinas: [] },
    hasFaceData: false,

    async init() {
        const saved = localStorage.getItem('sipanda_session');
        if (saved) {
            this.user = JSON.parse(saved);
            this.currentPage = (this.user.Role.toLowerCase() === 'admin') ? 'admin' : 'dashboard';
            // Memanggil data status nyata dari database
            await Promise.all([this.getAttendanceStatus(), this.checkLocationAccess()]);
        }
        this.render();
    },

    async getAttendanceStatus() {
        try {
            const res = await API.call({ action: "get_status", user_id: this.user.id });
            if (res.success) {
                this.attendanceStatus = res.status;
                this.hasFaceData = res.hasFaceData; // Status dari kolom E di Sheets
                console.log("Status Absen & Wajah Sinkron");
            }
            return true;
        } catch (e) {
            console.error("Gagal cek status:", e);
            return false;
        }
    },

    async checkLocationAccess() {
        // Logika radius (saat ini default true, bisa dihubungkan ke navigator.geolocation nanti)
        this.isWithinRadius = true; 
        console.log("Lokasi berhasil dicek");
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

            this.initPageData();
            lucide.createIcons();
            this.startClock();
        } catch (e) {
            console.error("Gagal memuat halaman:", e);
        }
    },

    initPageData() {
        if (!this.user) return;

        const nameEls = document.querySelectorAll('.display-name');
        const roleEls = document.querySelectorAll('.display-role');
        nameEls.forEach(el => el.innerText = this.user.Name);
        roleEls.forEach(el => el.innerText = this.user.Role);

        if (this.currentPage === 'dashboard') {
            this.updateUserDashboardUI();
        }

        if (this.currentPage === 'history') {
            const listContainer = document.getElementById('history-list');
            if (listContainer) {
                listContainer.innerHTML = this.historyTab === 'presensi' ? this.renderPresensiList() : this.renderDinasList();
            }
        }
    },

    updateUserDashboardUI() {
        const regCard = document.getElementById('face-reg-card');
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');
        const dot = document.getElementById('radius-dot');
        const txt = document.getElementById('radius-text');

        // 1. Logika Kartu Registrasi Wajah
        if (this.hasFaceData) {
            if (regCard) regCard.classList.add('hidden');
        } else {
            if (regCard) regCard.classList.remove('hidden');
        }

        // 2. Logika Indikator Radius
        const statusColor = this.isWithinRadius ? 'bg-green-500' : 'bg-red-500';
        const statusText = this.isWithinRadius ? 'DALAM RADIUS' : 'LUAR RADIUS';
        if (dot) dot.className = `w-2 h-2 ${statusColor} rounded-full animate-pulse`;
        if (txt) txt.innerText = statusText;

        // 3. Logika Tombol Presensi Utama
        if (btnPresensi) {
            if (!this.hasFaceData) {
                // Kunci jika belum daftar wajah
                btnPresensi.classList.add('opacity-50', 'pointer-events-none', 'bg-gray-300');
                if (labelPresensi) labelPresensi.innerText = "Daftar Dulu";
            } else if (this.isWithinRadius && this.attendanceStatus !== 'out') {
                // Aktif jika dalam radius & belum absen pulang
                btnPresensi.classList.remove('opacity-50', 'pointer-events-none', 'bg-gray-300', 'cursor-not-allowed');
                btnPresensi.classList.add(this.attendanceStatus === 'in' ? 'bg-indigo-600' : 'bg-red-600');
                if (labelPresensi) labelPresensi.innerText = this.attendanceStatus === 'in' ? 'Pulang' : 'Presensi';
            } else {
                // Terkunci jika luar radius atau sudah absen pulang
                btnPresensi.classList.add('bg-gray-300', 'cursor-not-allowed', 'opacity-50', 'pointer-events-none');
                if (labelPresensi) labelPresensi.innerText = this.attendanceStatus === 'out' ? 'Selesai' : 'Terkunci';
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
                
                // Ambil status absensi segera setelah login
                await this.getAttendanceStatus();
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
        if (overlay && sheet) {
            overlay.classList.remove('hidden');
            setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
            lucide.createIcons();
        }
    },

    closeLogoutModal() {
        const overlay = document.getElementById('logout-overlay');
        const sheet = document.getElementById('logout-sheet');
        if (sheet) sheet.classList.add('translate-y-full');
        setTimeout(() => overlay && overlay.classList.add('hidden'), 300);
    },

    executeLogout() {
        localStorage.removeItem('sipanda_session');
        location.reload();
    },

    // --- FUNGSI MODAL PRESENSI ---
    startPresence() {
        if (!this.isWithinRadius || !this.hasFaceData) return;
        if (this.attendanceStatus === 'in') { this.openConfirmOut(); return; }
        this.openCameraModal();
    },

    openCameraModal() {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        if (overlay && sheet) {
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            sheet.style.transform = 'translateY(0)';
            if (typeof FaceService !== 'undefined') FaceService.initCamera();
        }
    },

    closePresence() {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        if (overlay && sheet) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            sheet.style.transform = 'translateY(100%)';
            if (typeof FaceService !== 'undefined') FaceService.stopCamera();
        }
    },

    openConfirmOut() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        if (overlay && sheet) {
            overlay.classList.remove('hidden');
            setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
            lucide.createIcons();
        }
    },

    closeConfirmOut() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        if (sheet) sheet.classList.add('translate-y-full');
        setTimeout(() => overlay && overlay.classList.add('hidden'), 300);
    },

    processOutConfirmation() {
        this.closeConfirmOut();
        setTimeout(() => this.openCameraModal(), 400);
    },

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

    startSelfRegistration() {
        // Gunakan ID user yang sedang login
        Admin.currentRegID = this.user.id; 
        this.openCameraModal();
        
        const btn = document.querySelector('#presence-sheet button');
        if (btn) {
            btn.innerText = "KONFIRMASI WAJAH SAYA";
            btn.onclick = async () => {
                await Admin.processRegistration();
                this.hasFaceData = true;
                this.render(); 
            };
        }
    }
};

const Admin = {
    isSidebarCollapsed: false,
    currentRegID: null,

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        const labels = document.querySelectorAll('.nav-label');
        const logoText = document.querySelector('.logo-text');
        
        if (this.isSidebarCollapsed) {
            sidebar.style.width = '16rem';
            labels.forEach(el => el.style.display = 'block');
            if (logoText) logoText.style.display = 'block';
        } else {
            sidebar.style.width = '5rem';
            labels.forEach(el => el.style.display = 'none');
            if (logoText) logoText.style.display = 'none';
        }
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    },

    setTab(tab) {
        document.querySelectorAll('.admin-nav-item').forEach(el => {
            el.classList.remove('active', 'bg-red-50', 'text-red-600');
            el.classList.add('text-gray-400');
        });
        App.showToast(`Pindah ke tab ${tab}`, 'info');
    },

    startRegistration() {
        const id = document.getElementById('reg-user-id').value;
        if (!id) return App.showToast("Isi ID Pegawai dulu!", "error");
        
        this.currentRegID = id;
        App.openCameraModal();
        
        const btn = document.querySelector('#presence-sheet button');
        if (btn) {
            btn.innerText = "DAFTARKAN WAJAH";
            btn.onclick = () => Admin.processRegistration();
        }
    },

    async processRegistration() {
        const video = document.getElementById('video');
        if (!video) return;
        App.showToast("Menganalisis Wajah...", "info");

        try {
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                          .withFaceLandmarks()
                                          .withFaceDescriptor();

            if (!detection) return App.showToast("Wajah tidak jelas!", "error");

            const faceDescriptorString = JSON.stringify(Array.from(detection.descriptor));

            const res = await API.call({
                action: "register_face",
                employeeId: this.currentRegID,
                faceData: faceDescriptorString
            });

            if (res.success) {
                App.showToast("Wajah Berhasil Terdaftar!", "success");
                App.closePresence();
                const input = document.getElementById('reg-user-id');
                if (input) input.value = '';
            } else {
                App.showToast(res.message, "error");
            }
        } catch (e) {
            App.showToast("Gagal simpan ke server", "error");
            console.error(e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());