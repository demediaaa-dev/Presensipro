const App = {
  user: null,
  currentPage: 'login',
  showPass: false,
  dataStats: { employees: 0, present: 0, leaves: 0 }, // Data untuk Admin

  init() {
    const saved = localStorage.getItem('sipanda_session');
    if (saved) {
      this.user = JSON.parse(saved);
      this.currentPage = 'dashboard';
    }
    this.render();
  },

// Di dalam app.js

  render() {
    const root = document.getElementById('app');
    // Pilih view berdasarkan halaman
    if (this.currentPage === 'login') {
      root.innerHTML = this.viewLogin();
    } else {
      root.innerHTML = (this.user.Role.toLowerCase() === 'admin') ? this.viewAdmin() : this.viewUser();
    }
    
    // PENTING: Render icon setelah HTML terpasang
    lucide.createIcons();
    this.startClock();
  },



  // --- VIEW: LOGIN (Dengan Fitur Enter & Toggle Password) ---
  viewLogin() {
    return `
      <div class="flex items-center justify-center min-h-screen p-6 bg-white">
        <div class="w-full max-w-sm p-4 text-center">
          <div class="flex justify-center mb-8 text-red-600">
             <div class="p-6 bg-red-50 rounded-[2.5rem]">
                <i data-lucide="fingerprint" class="w-14 h-14"></i>
             </div>
          </div>
          <h2 class="text-4xl font-extrabold mb-1 tracking-tighter text-gray-900">KEHADIRAN</h2>
          <p class="text-[11px] text-gray-400 font-bold uppercase tracking-[0.4em] mb-12">Attendance System</p>
          
          <div class="space-y-4 text-left" onkeydown="if(event.key==='Enter') App.handleLogin()">
            <div class="relative">
              <i data-lucide="user" class="absolute left-4 top-4 w-5 h-5 text-gray-400"></i>
              <input id="username" type="text" placeholder="ID Pegawai / Username" class="w-full pl-12 p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-red-500 transition-all">
            </div>
            <div class="relative">
              <i data-lucide="lock" class="absolute left-4 top-4 w-5 h-5 text-gray-400"></i>
              <input id="password" type="${this.showPass ? 'text' : 'password'}" placeholder="Password" class="w-full pl-12 pr-12 p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-red-500 transition-all">
              <button onclick="App.togglePass()" class="absolute right-4 top-4 text-gray-400">
                <i data-lucide="${this.showPass ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>
              </button>
            </div>
            <button onclick="App.handleLogin()" id="btnLogin" class="w-full btn-primary text-white font-bold p-4 rounded-2xl shadow-xl mt-6 uppercase text-xs tracking-widest active:scale-95 transition-all">Masuk ke Sistem</button>
          </div>
          <p class="mt-16 text-[10px] text-gray-300 font-bold uppercase tracking-widest">v2.0 Sinkronisasi Database</p>
        </div>
      </div>`;
  },

  // --- VIEW: ADMIN (WEB/DESKTOP VIEW) ---
  viewAdmin() {
    return `
      <div class="flex min-h-screen bg-gray-100">
        <aside class="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col">
          <div class="p-8 border-b border-gray-50">
            <h1 class="text-2xl font-black tracking-tighter text-gray-900">KEHADIRAN<span class="text-red-600">.</span></h1>
          </div>
          <nav class="flex-1 p-6 space-y-3">
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl sidebar-link-active"><i data-lucide="layout-grid" class="w-5 h-5"></i> Dashboard</a>
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl text-gray-400 hover:bg-gray-50 transition"><i data-lucide="users" class="w-5 h-5"></i> Manajemen User</a>
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl text-gray-400 hover:bg-gray-50 transition"><i data-lucide="map-pin" class="w-5 h-5"></i> Lokasi & Shift</a>
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl text-gray-400 hover:bg-gray-50 transition"><i data-lucide="file-bar-chart" class="w-5 h-5"></i> Laporan Rekap</a>
          </nav>
          <div class="p-6 border-t border-gray-50">
            <button onclick="App.logout()" class="flex items-center gap-4 p-4 text-red-500 w-full hover:bg-red-50 rounded-2xl transition font-bold">
              <i data-lucide="log-out" class="w-5 h-5"></i> Keluar Sistem
            </button>
          </div>
        </aside>

        <main class="flex-1 p-10 overflow-y-auto">
          <header class="flex justify-between items-center mb-10">
            <div>
              <h2 class="text-3xl font-extrabold text-gray-900">Dashboard Utama</h2>
              <p class="text-gray-400 text-sm">Selamat datang kembali, Admin Panel.</p>
            </div>
            <div class="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-gray-100">
              <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
              <div class="text-sm">
                <p class="font-bold leading-none">${this.user.Name}</p>
                <p class="text-[10px] text-red-500 font-bold uppercase tracking-tighter">${this.user.Role}</p>
              </div>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            ${this.adminStatCard('Total Karyawan', '124', 'users', 'red')}
            ${this.adminStatCard('Hadir Hari Ini', '98', 'check-circle', 'green')}
            ${this.adminStatCard('Permohonan Izin', '12', 'file-text', 'orange')}
          </div>

          <div class="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <div class="flex justify-between items-center mb-8">
              <h3 class="font-bold text-xl text-gray-800">Log Presensi Terbaru</h3>
              <button class="text-red-600 font-bold text-sm flex items-center gap-2">Lihat Semua <i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            </div>
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest border-b border-gray-100">
                <tr><th class="p-4">Karyawan</th><th class="p-4">Jam Masuk</th><th class="p-4">Jam Pulang</th><th class="p-4">Status</th></tr>
              </thead>
              <tbody class="text-sm">
                <tr class="border-b border-gray-50"><td class="p-4 font-bold text-gray-800">Budi Santoso</td><td class="p-4">07:55:12</td><td class="p-4">17:05:30</td><td class="p-4 text-green-600 font-black text-xs uppercase">Hadir Tepat</td></tr>
                <tr class="border-b border-gray-50"><td class="p-4 font-bold text-gray-800">Andini Putri</td><td class="p-4">08:15:44</td><td class="p-4">-- : --</td><td class="p-4 text-orange-500 font-black text-xs uppercase">Terlambat</td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>`;
  },

  // --- VIEW: USER (MOBILE VIEW DASHBOARD) ---
  viewUser() {
    return `
      <div class="header-red-section"></div>
      <div class="max-w-md mx-auto min-h-screen flex flex-col p-5 pb-32">
        
        <header class="flex justify-between items-center mb-8 mt-2 text-white px-1">
          <div class="flex items-center gap-3">
             <div class="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden shadow-lg bg-white/20 flex items-center justify-center font-black text-xl">
                ${this.user.Name.charAt(0)}
             </div>
             <div>
                <h1 class="text-lg font-bold leading-tight">${this.user.Name}</h1>
                <p class="text-[10px] font-bold opacity-70 uppercase tracking-widest">${this.user.Role}</p>
             </div>
          </div>
          <button class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/10 shadow-sm transition active:scale-90"><i data-lucide="bell" class="w-5 h-5"></i></button>
        </header>

        <div class="text-center mb-8">
          <h2 class="text-5xl font-black text-white tracking-tighter">KEHADIRAN</h2>
          <p id="clock" class="text-xs font-mono text-red-100 tracking-[0.3em] mt-2 font-bold opacity-80">00:00:00 WIB</p>
        </div>

        <div class="glass-card p-6 mb-6">
          <div class="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
             <div class="flex items-center gap-3 text-gray-800">
                <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><i data-lucide="clock" class="w-5 h-5"></i></div>
                <div><p class="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Shift Kerja</p><p class="text-sm font-black uppercase">Pagi (Reguler)</p></div>
             </div>
             <div class="text-right">
                <p class="text-sm font-black text-gray-800">Senin, 06 April</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter tracking-[0.2em]">SINKRONISASI AKTIF</p>
             </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Target Masuk</p><p class="text-sm font-black text-gray-700">08:00 WIB</p></div>
             <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Target Pulang</p><p class="text-sm font-black text-gray-700">17:00 WIB</p></div>
          </div>
        </div>

        <div>
           <p class="text-[11px] font-black text-gray-400 mb-4 ml-1 uppercase tracking-widest opacity-60">Layanan Digital</p>
           <div class="grid grid-cols-4 gap-4 px-1">
              ${this.createMenuBtn('Izin', 'file-text')}
              ${this.createMenuBtn('Jurnal', 'edit-3')}
              ${this.createMenuBtn('Gaji', 'credit-card')}
              ${this.createMenuBtn('Histori', 'history')}
           </div>
        </div>

        <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white flex items-center justify-around rounded-t-[35px] px-8 z-50 border-t border-gray-50">
           <button class="flex flex-col items-center text-red-600 transition active:scale-90"><i data-lucide="layout-grid" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-tighter tracking-widest">Beranda</span></button>
           <div class="relative -top-8">
              <button onclick="App.startPresence()" class="w-16 h-16 rounded-full btn-primary flex items-center justify-center border-4 border-white shadow-xl transition active:scale-90"><i data-lucide="camera" class="w-8 h-8 text-white"></i></button>
              <span class="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Presensi</span>
           </div>
           <button onclick="App.logout()" class="flex flex-col items-center text-gray-300 transition active:scale-90"><i data-lucide="log-out" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-tighter tracking-widest text-gray-300">Keluar</span></button>
        </nav>
      </div>`;
  },

  // --- HELPERS & ACTIONS ---
  createMenuBtn(label, icon) {
    return `
      <div class="flex flex-col items-center gap-2">
         <button class="w-full aspect-square bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-red-500 shadow-sm active:scale-90 transition-all">
            <i data-lucide="${icon}"></i>
         </button>
         <span class="text-[9px] font-bold text-gray-500 uppercase tracking-tight text-center leading-tight">${label}</span>
      </div>`;
  },

  adminStatCard(label, val, icon, color) {
    return `
      <div class="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center gap-5 shadow-sm">
        <div class="p-4 bg-${color}-50 text-${color}-600 rounded-2xl"><i data-lucide="${icon}"></i></div>
        <div><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">${label}</p><p class="text-3xl font-black text-gray-900">${val}</p></div>
      </div>`;
  },

  async handleLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    if (!u || !p) return this.showToast("Masukkan ID dan Password!", "error");

    // Efek loading pada tombol
    const btn = document.getElementById('btnLogin');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>`;

    try {
      const res = await API.call({
        action: "login",
        username: u,
        password: p,
        currentDeviceId: navigator.userAgent // Sederhana, bisa diganti UUID jika pakai mobile wrapper
      });

      if (res.success) {
        this.showToast(`Selamat datang, ${res.data.name}`, "success");
        
        // Simpan data ke session
        this.user = { 
          User_ID: res.data.id, 
          Name: res.data.name, 
          Role: res.data.role 
        };
        
        localStorage.setItem('sipanda_session', JSON.stringify(this.user));
        
        // PINDAH HALAMAN HANYA JIKA SUCCESS
        this.currentPage = 'dashboard';
        this.render();
      } else {
        // Tampilkan pesan error dari database (misal: "Password salah")
        this.showToast(res.message, "error");
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    } catch (e) {
      this.showToast("Gagal terhubung ke database", "error");
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  togglePass() {
    this.showPass = !this.showPass;
    const passInput = document.getElementById('password');
    const passBtnIcon = document.querySelector('[onclick="App.togglePass()"] i');
    
    if (passInput) {
      passInput.type = this.showPass ? 'text' : 'password';
      // Update icon tanpa render seluruh halaman
      passBtnIcon.setAttribute('data-lucide', this.showPass ? 'eye-off' : 'eye');
      lucide.createIcons();
    }
  },

  logout() { localStorage.removeItem('sipanda_session'); this.user = null; this.currentPage = 'login'; this.render(); },

  showToast(msg, type = "success") {
    let container = document.getElementById('toast-box');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-box';
      container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs px-4';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    const bgColor = type === "error" ? "bg-red-600" : "bg-gray-900";
    t.className = `${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl mb-3 text-sm font-bold text-center animate-bounce-short transition-all duration-500`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
  },

  startClock() {
    const el = document.getElementById('clock');
    if (el) setInterval(() => el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB", 1000);
  },

  startPresence() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('presence-sheet');
    
    if (overlay && sheet) {
      // 1. Tambahkan class active (pastikan CSS transition ada)
      overlay.classList.add('active');
      sheet.classList.add('active');
      overlay.style.visibility = 'visible';
      overlay.style.opacity = '1';
      sheet.style.transform = 'translateY(0)';

      // 2. Jalankan Kamera dari FaceService
      if (typeof FaceService !== 'undefined') {
        FaceService.initCamera();
      }
      
      // 3. Render ulang icon khusus di dalam modal yang baru muncul
      lucide.createIcons();
    } else {
      console.error("Elemen modal tidak ditemukan di DOM!");
    }
  },

  closePresence() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('presence-sheet');
    
    if (overlay && sheet) {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      sheet.style.transform = 'translateY(100%)';
      
      setTimeout(() => {
        overlay.classList.remove('active');
        sheet.classList.remove('active');
      }, 300);

      if (typeof FaceService !== 'undefined') {
        FaceService.stopCamera();
      }
    }
  }
};


App.init();
