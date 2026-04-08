const App = {
    user: null,
    isWithinRadius: false,
    attendanceStatus: 'none',
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
            const res = await API.call({ action: "get_status", user_id: this.user.id });
            if (res.success) {
                this.attendanceStatus = res.status;
                this.hasFaceData = res.hasFaceData;
                this.officeLocation = res.location;
                this.checkLocation();
                this.updateDashboardUI();

                const elIn = document.getElementById('time-in');
                const elOut = document.getElementById('time-out');

                // Fungsi pembantu untuk memotong jam jika formatnya kepanjangan
                const formatTime = (timeStr) => {
                    if (!timeStr || timeStr === "") return "-- : --";
                    if (timeStr.includes('T')) { // Jika masih format ISO
                        const d = new Date(timeStr);
                        return d.getHours().toString().padStart(2, '0') + ":" + 
                            d.getMinutes().toString().padStart(2, '0');
                    }
                    return timeStr; // Jika sudah format "HH:mm"
                };

                if (elIn) elIn.innerText = formatTime(res.timeIn);
                if (elOut) elOut.innerText = formatTime(res.timeOut);
            }
        } catch (e) { console.error("Sync failed", e); }
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
        document.querySelectorAll('.display-name').forEach(el => el.innerText = this.user.Name);
        document.querySelectorAll('.display-role').forEach(el => el.innerText = this.user.Role);
        if (window.location.hash === '#dashboard') this.updateDashboardUI();
    },

    updateDashboardUI() {
        const regCard = document.getElementById('face-reg-card');
        const btnPresensi = document.getElementById('btn-main-presence');
        const labelPresensi = document.getElementById('label-main-presence');

        if (regCard) {
            // Jika sudah punya data wajah, sembunyikan kartu (tambah class hidden)
            if (this.hasFaceData) {
                regCard.classList.add('hidden');
            } else {
                regCard.classList.remove('hidden');
            }
        }

        // Update tombol presensi utama
        if (btnPresensi && labelPresensi) {
            if (this.hasFaceData && this.isWithinRadius) {
                const activeColor = this.attendanceStatus === 'in' ? 'bg-indigo-600' : 'bg-red-600';
                
                // UPDATE TEKS DI SINI
                labelPresensi.innerText = this.attendanceStatus === 'in' ? 'PULANG' : 'MASUK';
                
                btnPresensi.className = `w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl transition active:scale-90 ${activeColor}`;
                btnPresensi.style.pointerEvents = "auto";
                btnPresensi.style.opacity = "1";
            } else {
                // Jika di luar radius atau belum ada data wajah
                labelPresensi.innerText = "OFFSIDE"; 
                btnPresensi.className = "w-16 h-16 rounded-full flex flex-col items-center justify-center bg-gray-300";
                btnPresensi.style.pointerEvents = "none";
                btnPresensi.style.opacity = "0.5";
            }
        }
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

// --- LOGIKA ADMIN & REGISTRASI ---
const Admin = {
    currentTab: 'users',
    cache: {},
    currentPage: 1,
    rowsPerPage: 10, // Ubah angka ini untuk jumlah baris per halaman

    // Tampilkan loader lalu buka halaman setelah data ada
    async init() {
        // 1. Langsung tampilkan halaman admin (TIDAK PERLU TUNGGU DATA)
        console.log("Membuka halaman admin...");
        
        // 2. Tarik data di latar belakang
        this.loadTableData();
    },

    async switchTab(tab) {
        this.currentTab = tab;
        this.currentPage = 1; // Reset ke halaman 1
        
        document.querySelectorAll('.nav-item, .mobile-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));

        if (this.cache[tab]) {
            this.renderPage();
        } else {
            await this.loadTableData();
        }
    },

    async loadTableData() {
        const body = document.getElementById('admin-table-body');
        
        // Tampilkan 5 baris skeleton saat loading
        let skeletonHtml = '';
        for(let i=0; i<5; i++) {
            skeletonHtml += `<tr><td colspan="10" style="padding:15px;"><div class="skeleton-line"></div></td></tr>`;
        }
        body.innerHTML = skeletonHtml;

        try {
            // Gunakan caching agar kalau balik lagi ke tab ini instan
            if (this.cache[this.currentTab]) {
                this.renderPage();
                return;
            }

            const response = await API.call({ action: "admin_get_data", sheet: this.currentTab });
            if (response.success) {
                this.cache[this.currentTab] = response;
                this.renderPage();
            }
        } catch (e) {
            body.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px; color:red;">Gagal muat data. Coba lagi.</td></tr>';
        }
    },

    renderPage() {
        const res = this.cache[this.currentTab];
        const body = document.getElementById('admin-table-body');
        const head = document.getElementById('admin-table-head');
        
        // Header Render
        let hHtml = '<tr>';
        res.headers.forEach(h => hHtml += `<th style="padding:15px; text-align:left; color:#999; font-size:10px;">${h.toUpperCase()}</th>`);
        hHtml += '<th style="text-align:center;">AKSI</th></tr>';
        head.innerHTML = hHtml;

        // Pagination Logic
        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const pagedData = res.data.slice(start, end);

        let bHtml = '';
        pagedData.forEach(row => {
            bHtml += `<tr style="border-bottom:1px solid #f8f8f8;">`;
            row.forEach(cell => bHtml += `<td style="padding:15px; font-weight:600;">${cell || '-'}</td>`);
            bHtml += `<td style="padding:15px; text-align:center;">...</td></tr>`;
        });
        body.innerHTML = bHtml;

        // Update Info & Tombol
        document.getElementById('admin-page-info').innerText = `Halaman ${this.currentPage} dari ${Math.ceil(res.data.length / this.rowsPerPage)}`;
        document.getElementById('admin-prev-btn').disabled = this.currentPage === 1;
        document.getElementById('admin-next-btn').disabled = end >= res.data.length;
        
        if (window.lucide) lucide.createIcons();
    },

    nextPage() { this.currentPage++; this.renderPage(); },
    prevPage() { this.currentPage--; this.renderPage(); }
};

document.addEventListener('DOMContentLoaded', () => App.init());
