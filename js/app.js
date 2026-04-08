const App = {
    user: null,
    isWithinRadius: false,
    attendanceStatus: 'none',
    hasFaceData: false,
    timer: null,
    watchId: null, // Untuk menyimpan ID Geolocation
    officeLocation: null,

    async init() {
        const saved = localStorage.getItem('sipanda_session');
        if (saved) {
            this.user = JSON.parse(saved);
            // Jika user sudah login tapi di halaman login, lempar ke dashboard
            if (!window.location.hash || window.location.hash === '#login') {
                window.location.hash = (this.user.Role.toLowerCase() === 'admin') ? '#admin' : '#dashboard';
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
        if (!root) return;
    
        let pageFile = 'pages/login.html';
        if (hash === '#dashboard') pageFile = 'pages/dashboard-user.html';
        if (hash === '#history') pageFile = 'pages/history.html';
        if (hash === '#admin') pageFile = 'pages/dashboard-admin.html';
    
        try {
            const res = await fetch(pageFile);
            if (!res.ok) throw new Error("Gagal mengambil file halaman");
            
            const html = await res.text();
            root.innerHTML = html;
    
            // Bersihkan timer/watch sebelumnya jika pindah halaman
            if (this.timer) clearInterval(this.timer);
            if (this.watchId) navigator.geolocation.clearWatch(this.watchId);

            if (hash === '#admin') {
                Admin.init(); 
            }
    
            if (hash !== '#login') {
                await this.syncData();
                this.initPageData();
                this.startClock();
                this.checkLocation(); // Mulai tracking GPS hanya di luar login
            }
            
            if (window.lucide) lucide.createIcons();
        } catch (e) { 
            console.error("Router Error:", e);
            root.innerHTML = `<div class="p-10 text-center">Terjadi kesalahan saat memuat halaman.</div>`;
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const color = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-800');
        const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'x-circle' : 'info');

        toast.className = `${color} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transform transition-all duration-500 translate-y-[-20px] opacity-0 z-[9999]`;
        toast.innerHTML = `
            <i data-lucide="${icon}" class="w-5 h-5"></i>
            <span class="text-xs font-bold uppercase tracking-wider">${message}</span>
        `;

        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'), 10);
        setTimeout(() => {
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    togglePassword() {
        const input = document.getElementById('password');
        const icon = document.getElementById('eye-icon');
        if (!input || !icon) return;

        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        icon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
    },

    // --- MODAL CONTROL (REUSABLE) ---
    toggleModal(overlayId, sheetId, show) {
        const overlay = document.getElementById(overlayId);
        const sheet = document.getElementById(sheetId);
        if (!overlay || !sheet) return;

        if (show) {
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            sheet.style.transform = 'translateY(0)';
            this.initSwipeToDismiss(sheet, () => this.toggleModal(overlayId, sheetId, false));
        } else {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            sheet.style.transform = 'translateY(100%)';
        }
    },

    openLogoutModal() { this.toggleModal('logout-overlay', 'logout-sheet', true); },
    closeLogoutModal() { this.toggleModal('logout-overlay', 'logout-sheet', false); },

    confirmLogout() {
        this.showToast("Berhasil keluar", "info");
        localStorage.removeItem('sipanda_session');
        this.user = null;
        this.closeLogoutModal();
        setTimeout(() => window.location.hash = '#login', 500);
    },

    initSwipeToDismiss(element, closeCallback) {
        let startY = 0;
        let currentY = 0;

        element.ontouchstart = (e) => { startY = e.touches[0].clientY; };
        element.ontouchmove = (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                element.style.transform = `translateY(${diff}px)`;
                element.style.transition = 'none';
            }
        };
        element.ontouchend = () => {
            const diff = currentY - startY;
            element.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            if (diff > 150) closeCallback();
            else element.style.transform = 'translateY(0)';
            startY = 0; currentY = 0;
        };
    },

    async handleLogin() {
        const u = document.getElementById('username')?.value;
        const p = document.getElementById('password')?.value;
        const btn = document.getElementById('btn-login');
        const loader = document.getElementById('btn-loader');
        const btnText = document.getElementById('btn-text');

        if (!u || !p) return this.showToast("Isi semua data!", "error");

        btn.disabled = true;
        loader?.classList.remove('hidden');
        if (btnText) btnText.innerText = "Memproses...";

        try {
            const res = await API.call({ action: "login", id: u, pass: p });
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
            btn.disabled = false;
            loader?.classList.add('hidden');
            if (btnText) btnText.innerText = "Masuk Sistem";
        }
    },

    async syncData() {
        if (!this.user?.id) return;
        try {
            const res = await API.call({ action: "get_status", user_id: this.user.id });
            if (res.success) {
                this.attendanceStatus = res.status;
                this.hasFaceData = res.hasFaceData;
                this.officeLocation = res.location;
                
                const formatTime = (t) => (t && t !== "") ? t : "-- : --";
                const elIn = document.getElementById('time-in');
                const elOut = document.getElementById('time-out');
                if (elIn) elIn.innerText = formatTime(res.timeIn);
                if (elOut) elOut.innerText = formatTime(res.timeOut);
                
                this.updateDashboardUI();
            }
        } catch (e) { console.error("Sync failed", e); }
    },

    checkLocation() {
        if (!navigator.geolocation) return;
        this.watchId = navigator.geolocation.watchPosition((pos) => {
            if (!this.officeLocation) return;
            const distance = this.calculateDistance(
                pos.coords.latitude, pos.coords.longitude, 
                Number(this.officeLocation.lat), Number(this.officeLocation.lng)
            );

            this.isWithinRadius = distance <= this.officeLocation.radius;
            
            const locStatus = document.getElementById('radius-text');
            const locDot = document.getElementById('radius-dot');

            if (locStatus && locDot) {
                locStatus.innerText = this.isWithinRadius ? "DALAM RADIUS" : "LUAR LOKASI";
                locStatus.className = `text-xs font-bold uppercase ${this.isWithinRadius ? 'text-green-600' : 'text-red-600'}`;
                locDot.className = `w-2 h-2 rounded-full ${this.isWithinRadius ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`;
            }
            this.updateDashboardUI();
        }, null, { enableHighAccuracy: true });
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    initPageData() {
        if (!this.user) return;
        document.querySelectorAll('.display-name').forEach(el => el.innerText = this.user.Name);
        document.querySelectorAll('.display-role').forEach(el => el.innerText = this.user.Role);
    },

    updateDashboardUI() {
        const regCard = document.getElementById('face-reg-card');
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');

        if (regCard) {
            this.hasFaceData ? regCard.classList.add('hidden') : regCard.classList.remove('hidden');
        }

        if (btnPresensi && labelPresensi) {
            if (this.hasFaceData && this.isWithinRadius) {
                if (this.attendanceStatus === 'out') {
                    labelPresensi.innerText = "SELESAI";
                    btnPresensi.className = "w-16 h-16 rounded-full flex flex-col items-center justify-center bg-gray-200 text-gray-400";
                    btnPresensi.style.pointerEvents = "none";
                } else {
                    const isCheckIn = this.attendanceStatus !== 'in';
                    labelPresensi.innerText = isCheckIn ? 'MASUK' : 'PULANG';
                    btnPresensi.className = `w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl transition active:scale-90 ${isCheckIn ? 'bg-indigo-600' : 'bg-red-600'}`;
                    btnPresensi.style.pointerEvents = "auto";
                    btnPresensi.style.opacity = "1";
                }
            } else {
                labelPresensi.innerText = "OFFSIDE"; 
                btnPresensi.className = "w-16 h-16 rounded-full flex flex-col items-center justify-center bg-gray-300";
                btnPresensi.style.pointerEvents = "none";
                btnPresensi.style.opacity = "0.5";
            }
        }
    },

    openCameraModal(mode = 'presence') {
        const title = document.getElementById('camera-title');
        const btnText = document.getElementById('btn-text-camera');
        
        if (title) title.innerText = (mode === 'register') ? "Registrasi Wajah" : "Verifikasi Presensi";
        if (btnText) btnText.innerText = (mode === 'register') ? "AMBIL FOTO" : "SCAN SEKARANG";

        this.toggleModal('modal-overlay', 'presence-sheet', true);
        if (window.FaceService) {
            FaceService.initCamera(mode);
            const btnAction = document.getElementById('btn-camera-action');
            if (btnAction) btnAction.onclick = () => FaceService.handleAction();
        }
    },

    closePresence() {
        this.toggleModal('modal-overlay', 'presence-sheet', false);
        if (window.FaceService) FaceService.stopCamera();
    },

    startPresence() { 
        if (this.attendanceStatus === 'in') this.openConfirmOutModal();
        else if (this.attendanceStatus === 'none') this.openCameraModal('presence');
    },
    
    openConfirmOutModal() { this.toggleModal('confirm-out-overlay', 'confirm-out-sheet', true); },
    closeConfirmOutModal() { this.toggleModal('confirm-out-overlay', 'confirm-out-sheet', false); },

    confirmOut() {
        this.closeConfirmOutModal();
        this.openCameraModal('presence');
    },

    startSelfRegistration() { 
        Admin.currentRegID = this.user.id;
        this.openCameraModal('register'); 
    },
    
    startClock() {
        const el = document.getElementById('clock');
        if (!el) return;
        this.timer = setInterval(() => {
            el.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WIB";
        }, 1000);
    }
};

// --- LOGIKA ADMIN ---
const Admin = {
    currentTab: 'users',
    cache: {},
    currentPage: 1,
    rowsPerPage: 10,
    currentRegID: null,

    async init() {
        await this.loadTableData();
    },

    async loadTableData() {
        const body = document.getElementById('admin-table-body');
        if (!body) return;

        if (this.cache[this.currentTab]) {
            this.renderPage();
            return;
        }

        body.innerHTML = '<tr><td colspan="6" class="p-5 text-center text-gray-400">Memuat data...</td></tr>';

        try {
            const res = await API.call({ action: "admin_get_data", sheet: this.currentTab });
            if (res.success) {
                this.cache[this.currentTab] = res;
                this.renderPage();
            }
        } catch (e) {
            body.innerHTML = '<tr><td colspan="6" class="p-5 text-center text-red-500">Gagal memuat.</td></tr>';
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.currentPage = 1;
        document.querySelectorAll('.nav-item, .mobile-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));
        
        const titleEl = document.getElementById('admin-page-title');
        const titles = { users: 'Pegawai', shifts: 'Lokasi', attendance: 'Presensi', outstation: 'Dinas Luar' };
        if (titleEl) titleEl.innerText = titles[tab] || 'Admin';

        this.loadTableData();
    },

    renderPage() {
        const res = this.cache[this.currentTab];
        const body = document.getElementById('admin-table-body');
        const head = document.getElementById('admin-table-head');
        if (!res || !body || !head) return;

        const config = {
            'users': [{i:0, l:'NIP'}, {i:1, l:'NAMA'}, {i:6, l:'SHIFT'}],
            'shifts': [{i:0, l:'KODE'}, {i:1, l:'NAMA'}, {i:2, l:'MASUK'}, {i:3, l:'PULANG'}],
            'attendance': [{i:1, l:'NAMA'}, {i:2, l:'TGL'}, {i:3, l:'MASUK'}, {i:4, l:'PULANG'}],
            'outstation': [{i:1, l:'NAMA'}, {i:2, l:'TUJUAN'}, {i:4, l:'STATUS'}]
        };

        const cols = config[this.currentTab] || [];
        head.innerHTML = `<tr>${cols.map(c => `<th class="p-3 text-left text-[10px] text-gray-400 uppercase">${c.l}</th>`).join('')}<th class="p-3 text-center text-[10px] text-gray-400">AKSI</th></tr>`;

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const data = res.data.slice(start, start + this.rowsPerPage);

        body.innerHTML = data.map(row => `
            <tr class="border-b border-gray-50">
                ${cols.map(c => `<td class="p-3 font-semibold text-gray-700">${row[c.i] || '-'}</td>`).join('')}
                <td class="p-3 flex justify-center gap-2">
                    <button onclick="Admin.editEntry('${row[0]}')" class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><i data-lucide="edit-2" class="w-3"></i></button>
                    <button onclick="Admin.resetDevice('${row[0]}')" class="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center"><i data-lucide="refresh-cw" class="w-3"></i></button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) lucide.createIcons();
        this.updatePagination(res.data.length);
    },

    updatePagination(total) {
        const info = document.getElementById('admin-page-info');
        const prev = document.getElementById('admin-prev-btn');
        const next = document.getElementById('admin-next-btn');
        const maxPage = Math.ceil(total / this.rowsPerPage) || 1;

        if (info) info.innerText = `Hal ${this.currentPage} / ${maxPage}`;
        if (prev) prev.disabled = this.currentPage === 1;
        if (next) next.disabled = this.currentPage >= maxPage;
    },

    changePage(dir) {
        this.currentPage += dir;
        this.renderPage();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
