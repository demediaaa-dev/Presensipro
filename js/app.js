const App = {
    user: null,
    isWithinRadius: false,
    attendanceStatus: 'none',
    lastTimeIn: '-- : --',  // Tambahkan ini
    lastTimeOut: '-- : --', // Tambahkan ini
    hasFaceData: false,
    timer: null,
    officeLocation: null,

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
        if (!root) return;

        const session = JSON.parse(localStorage.getItem('sipanda_session'));
        this.user = session;

        let pageFile = 'pages/login.html';
        let isError = false;

        // --- 1. HALAMAN LOGIN ---
        if (hash === '#login') {
            if (this.user) {
                // Jika sudah login, paksa ke halaman masing-masing
                window.location.hash = (this.user.Role.toLowerCase() === 'admin') ? '#admin' : '#dashboard';
                return;
            }
            pageFile = 'pages/login.html';
        }

        // --- 2. HALAMAN USER (Karyawan) ---
        else if (hash === '#dashboard' || hash === '#history') {
            if (!this.user) { 
                window.location.hash = '#login'; return; 
            }
            
            // PROTEKSI: Jika Admin coba masuk ke halaman User
            if (this.user.Role.toLowerCase() !== 'user') {
                isError = true;
                pageFile = 'pages/error.html';
            } else {
                pageFile = (hash === '#dashboard') ? 'pages/dashboard-user.html' : 'pages/history.html';
            }
        }

        // --- 3. HALAMAN ADMIN ---
        else if (hash === '#admin') {
            if (!this.user) { 
                window.location.hash = '#login'; return; 
            }

            // PROTEKSI: Jika User (karyawan) coba masuk ke halaman Admin
            if (this.user.Role.toLowerCase() !== 'admin') {
                isError = true;
                pageFile = 'pages/error.html';
            } else {
                pageFile = 'pages/dashboard-admin.html';
            }
        }

        // --- 4. ROUTE TIDAK DIKENAL ---
        else {
            isError = true;
            pageFile = 'pages/error.html';
        }

        // --- PROSES FETCH & RENDER ---
        try {
            const res = await fetch(pageFile);
            const html = await res.text();
            root.innerHTML = html;

            lucide.createIcons();
            
            // Eksekusi logika hanya jika bukan halaman error
            if (!isError) {
                if (hash === '#admin') {
                    Admin.init(); 
                }
                
                if (this.user && hash !== '#login') {
                    this.initPageData();
                    // Hanya syncData jika di dashboard user
                    if(hash === '#dashboard') await this.syncData();
                    this.startClock();
                }
            }
        } catch (e) {
            console.error("Router Error:", e);
            root.innerHTML = `<div class="p-10 text-center">Gagal memuat halaman.</div>`;
        }
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

    handleErrorRedirect() {
        const session = JSON.parse(localStorage.getItem('sipanda_session'));
        if (!session) {
            window.location.hash = '#login';
        } else {
            // Arahkan sesuai role masing-masing
            const role = session.Role ? session.Role.toLowerCase() : '';
            window.location.hash = (role === 'admin') ? '#admin' : '#dashboard';
        }
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
        // HAPUS pengecekan !App.user di sini, karena saat login App.user memang masih null
        
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const btn = document.getElementById('btn-login');
        const loader = document.getElementById('btn-loader');
        const btnText = document.getElementById('btn-text');

        if (!u || !p) return this.showToast("Isi semua data!", "error");

        // Loading State On
        btn.disabled = true;
        if (loader) loader.classList.remove('hidden');
        if (btnText) btnText.innerText = "Memproses...";

        try {
            // Pastikan properti yang dikirim adalah 'id' dan 'pass' sesuai Code.gs terbaru
            const res = await API.call({ 
                action: "login", 
                id: u, 
                pass: p 
            });

            if (res.success) {
                this.showToast(`Selamat datang, ${res.data.name}!`, "success");
                
                // Simpan ke variabel App
                this.user = { 
                    id: res.data.id, 
                    Name: res.data.name, 
                    Role: res.data.role 
                };
                
                // Simpan ke LocalStorage agar tidak logout saat refresh
                localStorage.setItem('sipanda_session', JSON.stringify(this.user));
                
                setTimeout(() => {
                    window.location.hash = (this.user.Role.toLowerCase() === 'admin') ? '#admin' : '#dashboard';
                }, 1000);
            } else {
                this.showToast(res.message, "error");
            }
        } catch (e) { 
            console.error("Login Error:", e);
            this.showToast("Masalah koneksi!", "error");
        } finally {
            // Loading State Off
            btn.disabled = false;
            if (loader) loader.classList.add('hidden');
            if (btnText) btnText.innerText = "Masuk Sistem";
        }
    },

    async syncData() {
        if (!this.user || !this.user.id) return;
        try {
            console.log("Memulai Sync Data untuk user:", this.user.id);
            const res = await API.call({ action: "get_status", user_id: this.user.id });
            console.log("Data dari server:", res); // LIHAT DI CONSOLE APAKAH timeIn ADA ISINYA

            if (res.success) {
                // 1. Simpan ke State
                this.attendanceStatus = res.status;
                this.hasFaceData = res.hasFaceData;
                this.officeLocation = res.location;
                this.lastTimeIn = res.timeIn || "-- : --";
                this.lastTimeOut = res.timeOut || "-- : --";
                
                // 2. Cek Lokasi
                this.checkLocation();

                // 3. Update UI Manual (Langsung tembak ke ID)
                const formatTime = (timeStr) => {
                    if (!timeStr || timeStr === "" || timeStr === "-- : --") return "-- : --";
                    if (typeof timeStr === 'string' && timeStr.includes('T')) {
                        const d = new Date(timeStr);
                        return d.getHours().toString().padStart(2, '0') + ":" + 
                               d.getMinutes().toString().padStart(2, '0');
                    }
                    return timeStr;
                };

                const elIn = document.getElementById('time-in');
                const elOut = document.getElementById('time-out');

                if (elIn) {
                    elIn.innerText = formatTime(this.lastTimeIn);
                    console.log("Jam Masuk berhasil diisi:", elIn.innerText);
                } else {
                    console.error("Elemen #time-in TIDAK DITEMUKAN di DOM!");
                }

                if (elOut) elOut.innerText = formatTime(this.lastTimeOut);

                // 4. Update elemen dashboard lainnya
                this.updateDashboardUI();
            }
        } catch (e) { 
            console.error("Sync failed:", e); 
        }
    },

    checkLocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.watchPosition((pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            
            if (this.officeLocation) {
                const distance = this.calculateDistance(
                    userLat, userLng, 
                    Number(this.officeLocation.lat), 
                    Number(this.officeLocation.lng)
                );

                this.isWithinRadius = distance <= this.officeLocation.radius;
                
                // TAMBAHKAN LOG INI
                console.log("Posisi User:", userLat, userLng);
                console.log("Posisi Kantor:", this.officeLocation.lat, this.officeLocation.lng);
                console.log("Jarak (Meter):", distance);
                console.log("Radius Izin (Meter):", this.officeLocation.radius);

                // Ambil elemen HTML berdasarkan ID yang baru
                const locStatus = document.getElementById('radius-text');
                const locDot = document.getElementById('radius-dot');

                if (locStatus && locDot) {
                    if (this.isWithinRadius) {
                        locStatus.innerText = "DALAM RADIUS";
                        locStatus.className = "text-xs font-bold uppercase text-green-600";
                        locDot.className = "w-2 h-2 bg-green-500 rounded-full animate-pulse";
                    } else {
                        locStatus.innerText = "LUAR LOKASI PRESENSI";
                        locStatus.className = "text-xs font-bold uppercase text-red-600";
                        locDot.className = "w-2 h-2 bg-red-500 rounded-full";
                    }
                }
                
                this.updateDashboardUI();
            }
        }, (err) => {
            console.error("Gagal ambil GPS");
        }, { enableHighAccuracy: true });
    },

    // Rumus Haversine untuk hitung jarak (Meter)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radius bumi dalam meter
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; 
    },

    initPageData() {
        if (!this.user) return;
        
        // Isi Nama & Role
        document.querySelectorAll('.display-name').forEach(el => el.innerText = this.user.Name);
        document.querySelectorAll('.display-role').forEach(el => el.innerText = this.user.Role);
        
        // Jika di dashboard, paksa update UI termasuk jam
        if (window.location.hash === '#dashboard') {
            this.updateDashboardUI();
        }
    },

    updateDashboardUI() {
        const regCard = document.getElementById('face-reg-card');
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');
        const elIn = document.getElementById('time-in');
        const elOut = document.getElementById('time-out');

        // --- Update Kartu Registrasi ---
        if (regCard) {
            this.hasFaceData ? regCard.classList.add('hidden') : regCard.classList.remove('hidden');
        }

        // --- Update Tombol Utama ---
        if (btnPresensi && labelPresensi) {
            if (this.hasFaceData && this.isWithinRadius) {
                const activeColor = this.attendanceStatus === 'in' ? 'bg-indigo-600' : 'bg-red-600';
                labelPresensi.innerText = this.attendanceStatus === 'in' ? 'PULANG' : 'MASUK';
                btnPresensi.className = `w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl transition active:scale-90 ${activeColor}`;
                btnPresensi.style.pointerEvents = "auto";
                btnPresensi.style.opacity = "1";
            } else {
                labelPresensi.innerText = "OFFSIDE"; 
                btnPresensi.className = "w-16 h-16 rounded-full flex flex-col items-center justify-center bg-gray-300";
                btnPresensi.style.pointerEvents = "none";
                btnPresensi.style.opacity = "0.5";
            }
        }

        // --- Update Jam Presensi (Ini yang tadi macet) ---
        const formatTime = (timeStr) => {
            if (!timeStr || timeStr === "" || timeStr === "-- : --") return "-- : --";
            if (typeof timeStr === 'string' && timeStr.includes('T')) {
                const d = new Date(timeStr);
                return d.getHours().toString().padStart(2, '0') + ":" + 
                       d.getMinutes().toString().padStart(2, '0');
            }
            return timeStr;
        };

        if (elIn) elIn.innerText = formatTime(this.lastTimeIn);
        if (elOut) elOut.innerText = formatTime(this.lastTimeOut);
    },

    // --- MANAJEMEN MODAL KAMERA ---
    openCameraModal(mode = 'presence') {
        const overlay = document.getElementById('modal-overlay');
        const sheet = document.getElementById('presence-sheet');
        const btn = document.getElementById('btn-camera-action');
        const title = document.getElementById('camera-title');

        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';

        // Set Judul & Teks Tombol
        title.innerText = (mode === 'register') ? "Registrasi Wajah" : "Verifikasi Presensi";
        document.getElementById('btn-text-camera').innerText = (mode === 'register') ? "AMBIL FOTO WAJAH" : "SCAN SEKARANG";

        // Panggil init kamera
        FaceService.initCamera(mode);

        // Pasang Event Klik
        btn.onclick = () => FaceService.handleAction();
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

    startPresence() { 
        // Jika status 'in', berarti user mau absen PULANG
        if (this.attendanceStatus === 'in') {
            this.openConfirmOutModal();
        } else if (this.attendanceStatus === 'out') {
            // Jika sudah absen masuk & pulang (status 'out'), cegah absen lagi
            this.showToast("Anda sudah menyelesaikan absensi hari ini", "info");
        } else {
            // Jika status 'none', langsung buka kamera untuk absen MASUK
            this.openCameraModal('presence'); 
        }
    },
    
    openConfirmOutModal() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        if (!overlay || !sheet) return;

        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
        this.initSwipeToDismiss(sheet, () => this.closeConfirmOutModal());
    },

    closeConfirmOutModal() {
        const overlay = document.getElementById('confirm-out-overlay');
        const sheet = document.getElementById('confirm-out-sheet');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
        if (sheet) sheet.style.transform = 'translateY(100%)';
    },

    confirmOut() {
        this.closeConfirmOutModal();
        // Lanjut ke kamera untuk verifikasi wajah sebelum pulang
        this.openCameraModal('presence');
    },

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



// --- LOGIKA ADMIN ---
const Admin = {
    currentTab: 'users',
    cache: {},
    currentPage: 1,
    rowsPerPage: 10,

    async init() {
        // Load data users sebagai master data (untuk mapping nama di attendance)
        const resUser = await API.call({ action: "admin_get_data", sheet: 'users' });
        if (resUser.success) this.cache['users'] = resUser;
        
        this.loadTableData();
    },

    async loadTableData() {
        const body = document.getElementById('admin-table-body');
        if (!body) return;

        // 1. KEMBALIKAN SKELETON (UX agar tidak kosong melompong)
        if (!this.cache[this.currentTab]) {
            body.innerHTML = '<tr><td colspan="10" style="padding:20px;"><div class="skeleton-line" style="height:20px; background:#f0f0f0; border-radius:4px; animation: pulse 1.5s infinite;"></div></td></tr>'.repeat(5);
        } else {
            this.renderPage();
            return;
        }

        try {
            const res = await API.call({ action: "admin_get_data", sheet: this.currentTab });
            if (res.success) {
                this.cache[this.currentTab] = res;
                this.renderPage();
            }
        } catch (e) {
            body.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px;">Gagal memuat data.</td></tr>';
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.currentPage = 1;

        // Update UI Tab Aktif
        document.querySelectorAll('.nav-item, .mobile-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));
        
        const titleMap = { 'users': 'Data Pegawai', 'shifts': 'Titik Lokasi', 'attendance': 'Rekap Presensi', 'outstation': 'Dinas Luar' };
        const titleEl = document.getElementById('admin-page-title');
        if (titleEl) titleEl.innerText = titleMap[tab];

        this.loadTableData();
    },

    renderPage() {
        const res = this.cache[this.currentTab];
        const body = document.getElementById('admin-table-body');
        const head = document.getElementById('admin-table-head');
        if (!res || !body || !head) return;

        // --- FUNGSI HELPER UNTUK FORMATTING ---
        const formatValue = (val) => {
            if (!val || val === "") return "-";
            const valStr = String(val);

            // 1. Jika formatnya jam/tanggal ISO (ada huruf T atau Z)
            if (valStr.includes('T') || valStr.includes('Z')) {
                const d = new Date(valStr);
                if (isNaN(d.getTime())) return valStr; // Jika bukan tanggal valid, kembalikan aslinya

                // Jika tahunnya 1899, berarti ini hanya data JAM
                if (d.getFullYear() <= 1900) {
                    return d.getHours().toString().padStart(2, '0') + ":" + 
                           d.getMinutes().toString().padStart(2, '0');
                }
                
                // Jika tahunnya normal, berarti ini TANGGAL
                return d.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            }
            return valStr;
        };

        const columnConfig = {
            'users': [
                { index: 0, label: 'NIP' },
                { index: 1, label: 'NAMA' },
                { index: 6, label: 'KODE SHIFT' }
            ],
            'shifts': [
                { index: 0, label: 'KODE SHIFT' },
                { index: 1, label: 'NAMA SHIFT' },
                { index: 2, label: 'JAM MASUK' },
                { index: 3, label: 'JAM PULANG' }
            ],
            'attendance': [
                { index: 1, label: 'NAMA' },
                { index: 2, label: 'TANGGAL' },
                { index: 3, label: 'JAM MASUK' },
                { index: 4, label: 'JAM PULANG' },
                { index: 9, label: 'KETERANGAN' }
            ],
            'outstation': [
                { index: 1, label: 'NAMA' },
                { index: 2, label: 'TUJUAN' },
                { index: 4, label: 'STATUS' }
            ]
        };

        const activeCols = columnConfig[this.currentTab] || [];

        // Mapping Nama Pegawai (Attendance)
        let displayData = [...res.data];
        if (this.currentTab === 'attendance' && this.cache['users']) {
            const userList = this.cache['users'].data;
            displayData = res.data.map(row => {
                const userId = row[1];
                const userMatch = userList.find(u => u[0] == userId);
                const newRow = [...row];
                newRow[1] = userMatch ? userMatch[1] : `ID: ${userId}`; 
                return newRow;
            });
        }

        // Render Header
        head.innerHTML = `
            <tr>
                ${activeCols.map(col => `<th style="padding:15px; text-align:left; color:#999; font-size:10px;">${col.label}</th>`).join('')}
                <th style="text-align:center; color:#999; font-size:10px;">AKSI</th>
            </tr>
        `;

        // Render Body dengan formatValue()
        const start = (this.currentPage - 1) * this.rowsPerPage;
        const pagedData = displayData.slice(start, start + this.rowsPerPage);

        body.innerHTML = pagedData.map((row) => `
            <tr style="border-bottom:1px solid #f8f8f8;">
                ${activeCols.map(col => `
                    <td style="padding:15px; font-weight:600; color:#444;">
                        ${formatValue(row[col.index])}
                    </td>
                `).join('')}
                <td style="padding:15px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button onclick="Admin.editEntry('${row[0]}')" style="border:none; background:#f0f7ff; color:#0066ff; width:28px; height:28px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="edit-2" style="width:14px;"></i>
                        </button>
                        <button onclick="Admin.resetDevice('${row[0]}')" style="border:none; background:#fff7e6; color:#ffa940; width:28px; height:28px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="refresh-cw" style="width:14px;"></i>
                        </button>
                        <button onclick="Admin.deleteEntry('${row[0]}')" style="border:none; background:#fff0f0; color:#cc2b2b; width:28px; height:28px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="trash" style="width:14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const maxPage = Math.ceil(res.data.length / this.rowsPerPage) || 1;
        document.getElementById('admin-page-info').innerText = `Halaman ${this.currentPage} / ${maxPage}`;
        document.getElementById('admin-prev-btn').disabled = this.currentPage === 1;
        document.getElementById('admin-next-btn').disabled = this.currentPage >= maxPage;

        if (window.lucide) lucide.createIcons();
    },

    // Fungsi navigasi page
    changePage(dir) {
        this.currentPage += dir;
        this.renderPage();
    },

    // Placeholder untuk aksi (bisa kamu isi sesuai kebutuhan)
    resetDevice(id) { if(confirm('Reset perangkat?')) console.log('Reset:', id); },
    editEntry(id) { console.log('Edit:', id); },
    deleteEntry(id) { if(confirm('Hapus data?')) console.log('Delete:', id); }
};

document.addEventListener('DOMContentLoaded', () => App.init());
