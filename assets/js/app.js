const App = {
  user: null,
  currentPage: 'dashboard', // Default ke dashboard jika session ada
  showPass: false,
  isWithinRadius: false, // State untuk mengecek lokasi
  officeLocation: { lat: 0, lng: 0, radius: 100 }, // Akan diisi dari database

  init() {
    const saved = localStorage.getItem('sipanda_session');
    if (saved) {
      this.user = JSON.parse(saved);
      this.currentPage = 'dashboard';
      this.checkLocation(); // Cek lokasi otomatis saat buka app
    } else {
      this.currentPage = 'login';
    }
    this.render();
  },

  render() {
    const root = document.getElementById('app');
    if (this.currentPage === 'login') {
      root.innerHTML = this.viewLogin();
    } else if (this.currentPage === 'dinas_luar') {
      root.innerHTML = this.viewDinasLuar();
    } else {
      root.innerHTML = (this.user.Role.toLowerCase() === 'admin') ? this.viewAdmin() : this.viewUser();
    }
    
    lucide.createIcons();
    this.startClock();
  },

  // --- LOGIKA CEK LOKASI ---
  async checkLocation() {
    if (this.user.Role.toLowerCase() === 'admin') return;

    navigator.geolocation.watchPosition(async (pos) => {
      try {
        const res = await API.call({
          action: 'check_location', // Buat fungsi ini di Code.gs untuk ambil koordinat shift user
          user_id: this.user.User_ID
        });

        if (res.success) {
          const dist = this.getDistance(pos.coords.latitude, pos.coords.longitude, res.lat, res.lng);
          this.isWithinRadius = dist <= res.radius;
          
          // Update tombol di UI secara dinamis tanpa full render jika memungkinkan
          const btnPresence = document.getElementById('btn-presence');
          if (btnPresence) {
            if (this.isWithinRadius) {
              btnPresence.classList.remove('opacity-50', 'grayscale');
              btnPresence.disabled = false;
            } else {
              btnPresence.classList.add('opacity-50', 'grayscale');
              btnPresence.disabled = true;
            }
          }
        }
      } catch (e) {
        console.error("Gagal sinkron lokasi");
      }
    }, null, { enableHighAccuracy: true });
  },

  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  // --- VIEW: LOGIN ---
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
              <input id="username" type="text" placeholder="ID Pegawai" class="w-full pl-12 p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-red-500 transition-all">
            </div>
            <div class="relative">
              <i data-lucide="lock" class="absolute left-4 top-4 w-5 h-5 text-gray-400"></i>
              <input id="password" type="${this.showPass ? 'text' : 'password'}" placeholder="Password" class="w-full pl-12 pr-12 p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-red-500 transition-all">
              <button onclick="App.togglePass()" class="absolute right-4 top-4 text-gray-400">
                <i data-lucide="${this.showPass ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>
              </button>
            </div>
            <button onclick="App.handleLogin()" id="btnLogin" class="w-full bg-red-600 text-white font-bold p-4 rounded-2xl shadow-xl mt-6 uppercase text-xs tracking-widest active:scale-95 transition-all">Masuk ke Sistem</button>
          </div>
        </div>
      </div>`;
  },

  // --- VIEW: USER DASHBOARD ---
  viewUser() {
    return `
      <div class="bg-red-600 h-64 absolute top-0 left-0 right-0 -z-10 rounded-b-[50px]"></div>
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
          <h2 class="text-5xl font-black text-white tracking-tighter">SIPANDA</h2>
          <p id="clock" class="text-xs font-mono text-red-100 tracking-[0.3em] mt-2 font-bold opacity-80">00:00:00 WIB</p>
        </div>

        <div class="bg-white rounded-[35px] p-6 mb-6 shadow-xl border border-gray-100">
          <div class="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
             <div class="flex items-center gap-3 text-gray-800">
                <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status Lokasi</p>
                  <p class="text-sm font-black ${this.isWithinRadius ? 'text-green-600' : 'text-red-500'}">
                    ${this.isWithinRadius ? 'Dalam Area Presensi' : 'Di Luar Area'}
                  </p>
                </div>
             </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Shift</p><p class="text-sm font-black text-gray-700">Pagi</p></div>
             <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Status</p><p class="text-sm font-black text-gray-700">Aktif</p></div>
          </div>
        </div>

        <div>
           <p class="text-[11px] font-black text-gray-400 mb-4 ml-1 uppercase tracking-widest opacity-60">Layanan Utama</p>
           <div class="grid grid-cols-4 gap-4 px-1">
              <div onclick="App.currentPage='dinas_luar'; App.render()" class="flex flex-col items-center gap-2 cursor-pointer">
                 <button class="w-full aspect-square bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all"><i data-lucide="briefcase"></i></button>
                 <span class="text-[9px] font-bold text-gray-500 uppercase tracking-tight text-center leading-tight">Dinas Luar</span>
              </div>
              ${this.createMenuBtn('Izin', 'file-text')}
              ${this.createMenuBtn('Jurnal', 'edit-3')}
              ${this.createMenuBtn('Histori', 'history')}
           </div>
        </div>

        <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-24 bg-white/80 backdrop-blur-lg flex items-center justify-around rounded-t-[40px] px-8 z-50 border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
           <button onclick="App.currentPage='dashboard'; App.render()" class="flex flex-col items-center ${this.currentPage==='dashboard'?'text-red-600':'text-gray-300'}"><i data-lucide="layout-grid" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase">Beranda</span></button>
           
           <div class="relative -top-10">
              <button id="btn-presence" onclick="App.startPresence()" ${!this.isWithinRadius ? 'disabled' : ''} 
                class="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center border-[6px] border-white shadow-2xl transition active:scale-90 disabled:opacity-50 disabled:grayscale">
                <i data-lucide="camera" class="w-10 h-10 text-white"></i>
              </button>
           </div>

           <button onclick="App.logout()" class="flex flex-col items-center text-gray-300"><i data-lucide="log-out" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase">Keluar</span></button>
        </nav>
      </div>`;
  },

  // --- VIEW: FORM DINAS LUAR ---
  viewDinasLuar() {
    return `
      <div class="max-w-md mx-auto p-6 pt-12 min-h-screen bg-gray-50">
        <button onclick="App.currentPage='dashboard'; App.render()" class="mb-8 flex items-center gap-2 text-gray-500 font-bold"><i data-lucide="arrow-left" class="w-5 h-5"></i> KEMBALI</button>
        <h2 class="text-3xl font-black text-gray-900 tracking-tighter mb-2 uppercase">Dinas Luar</h2>
        <p class="text-sm text-gray-400 mb-8 font-bold uppercase tracking-widest">Pelaporan Kegiatan Luar Area</p>
        
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Foto Kegiatan</label>
            <div onclick="document.getElementById('file-dinas').click()" class="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer overflow-hidden">
               <input type="file" id="file-dinas" class="hidden" accept="image/*" capture="camera">
               <div id="preview-dinas" class="text-center p-4">
                  <i data-lucide="image" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
                  <p class="text-xs font-bold uppercase">Klik untuk Ambil Foto</p>
               </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Keterangan Kegiatan</label>
            <textarea id="desc-dinas" class="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-red-100" rows="4" placeholder="Tulis rincian tugas luar Anda..."></textarea>
          </div>

          <button onclick="App.submitDinasLuar()" class="w-full bg-orange-500 text-white font-black p-5 rounded-[2rem] shadow-xl shadow-orange-200 active:scale-95 transition-all uppercase tracking-widest">Kirim Laporan</button>
        </div>
      </div>`;
  },

  async submitDinasLuar() {
    this.showToast("Mengirim Laporan...", "success");
    setTimeout(() => {
      this.showToast("Laporan Dinas Luar Terkirim!");
      this.currentPage = 'dashboard';
      this.render();
    }, 2000);
  },

  // --- VIEW: ADMIN (Fungsi Sama) ---
  viewAdmin() {
    return `
      <div class="flex min-h-screen bg-gray-100">
        <aside class="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col">
          <div class="p-8 border-b border-gray-50">
            <h1 class="text-2xl font-black tracking-tighter text-gray-900">SIPANDA<span class="text-red-600">.</span></h1>
          </div>
          <nav class="flex-1 p-6 space-y-3">
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl bg-red-50 text-red-600"><i data-lucide="layout-grid" class="w-5 h-5"></i> Dashboard</a>
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl text-gray-400"><i data-lucide="users" class="w-5 h-5"></i> Pegawai</a>
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl text-gray-400"><i data-lucide="file-text" class="w-5 h-5"></i> Laporan</a>
          </nav>
          <div class="p-6 border-t border-gray-50">
            <button onclick="App.logout()" class="flex items-center gap-4 p-4 text-red-500 w-full font-bold">
              <i data-lucide="log-out" class="w-5 h-5"></i> Keluar
            </button>
          </div>
        </aside>

        <main class="flex-1 p-10">
          <h2 class="text-3xl font-black text-gray-900 mb-8">Admin Dashboard</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            ${this.adminStatCard('Total Karyawan', '124', 'users', 'red')}
            ${this.adminStatCard('Hadir Hari Ini', '98', 'check-circle', 'green')}
            ${this.adminStatCard('Dinas Luar', '5', 'briefcase', 'orange')}
          </div>
        </main>
      </div>`;
  },

  // --- HELPERS ---
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
    if (!u || !p) return this.showToast("Isi ID & Password", "error");

    try {
      const res = await API.call({ action: "login", username: u, password: p, currentDeviceId: navigator.userAgent });
      if (res.success) {
        this.user = { User_ID: res.data.id, Name: res.data.name, Role: res.data.role };
        localStorage.setItem('sipanda_session', JSON.stringify(this.user));
        this.currentPage = 'dashboard';
        this.checkLocation();
        this.render();
      } else {
        this.showToast(res.message, "error");
      }
    } catch (e) { this.showToast("Database Error", "error"); }
  },

  togglePass() {
    this.showPass = !this.showPass;
    const p = document.getElementById('password');
    if(p) p.type = this.showPass ? 'text' : 'password';
    lucide.createIcons();
  },

  logout() { localStorage.removeItem('sipanda_session'); this.user = null; this.currentPage = 'login'; this.render(); },

  showToast(msg, type = "success") {
    let box = document.getElementById('toast-box') || document.createElement('div');
    box.id = 'toast-box'; box.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs px-4';
    document.body.appendChild(box);
    const t = document.createElement('div');
    t.className = `${type==="error"?"bg-red-600":"bg-gray-900"} text-white px-6 py-4 rounded-2xl shadow-2xl mb-3 text-sm font-bold text-center`;
    t.innerText = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  startClock() {
    const el = document.getElementById('clock');
    if (el) setInterval(() => el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB", 1000);
  },

  startPresence() {
    if (!this.isWithinRadius) return this.showToast("Anda di luar area!", "error");
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('presence-sheet');
    overlay.style.visibility = 'visible'; overlay.style.opacity = '1';
    sheet.style.transform = 'translateY(0)';
    if (typeof FaceService !== 'undefined') FaceService.initCamera();
    lucide.createIcons();
  },

  closePresence() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('presence-sheet');
    overlay.style.opacity = '0'; overlay.style.visibility = 'hidden';
    sheet.style.transform = 'translateY(100%)';
    if (typeof FaceService !== 'undefined') FaceService.stopCamera();
  }
};

App.init();
