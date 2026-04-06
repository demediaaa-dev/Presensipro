const App = {
  user: null,
  currentPage: 'dashboard',
  showPass: false,
  isWithinRadius: true, // State untuk mengecek lokasi
  dataStats: { employees: 0, present: 0, leaves: 0 },

  init() {
    const saved = localStorage.getItem('sipanda_session');
    if (saved) {
      this.user = JSON.parse(saved);
      this.currentPage = 'dashboard';
      this.checkLocationAccess(); // Cek lokasi saat startup
    }
    this.render();
  },

  // Fungsi mengecek apakah user di dalam radius kantor
  async checkLocationAccess() {
    if (this.user && this.user.Role.toLowerCase() !== 'admin') {
      try {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const res = await API.call({
            action: 'check_radius',
            user_id: this.user.User_ID,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          this.isWithinRadius = res.success;
          this.render(); // Render ulang untuk update tombol
        });
      } catch (e) {
        console.error("Gagal verifikasi lokasi otomatis");
      }
    }
  },

  render() {
    const root = document.getElementById('app');
    if (this.currentPage === 'login') {
      root.innerHTML = this.viewLogin();
    } else {
      root.innerHTML = (this.user.Role.toLowerCase() === 'admin') ? this.viewAdmin() : this.viewUser();
    }
    lucide.createIcons();
    this.startClock();
  },

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
            <button onclick="App.handleLogin()" id="btnLogin" class="w-full bg-red-600 text-white font-bold p-4 rounded-2xl shadow-xl mt-6 uppercase text-xs tracking-widest active:scale-95 transition-all">Masuk ke Sistem</button>
          </div>
          <p class="mt-16 text-[10px] text-gray-300 font-bold uppercase tracking-widest">v2.0 Sinkronisasi Database</p>
        </div>
      </div>`;
  },

  viewAdmin() {
    return `
      <div class="flex min-h-screen bg-gray-100">
        <aside class="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col">
          <div class="p-8 border-b border-gray-50">
            <h1 class="text-2xl font-black tracking-tighter text-gray-900">KEHADIRAN<span class="text-red-600">.</span></h1>
          </div>
          <nav class="flex-1 p-6 space-y-3">
            <a href="#" class="flex items-center gap-4 p-4 rounded-2xl bg-red-50 text-red-600 font-bold"><i data-lucide="layout-grid" class="w-5 h-5"></i> Dashboard</a>
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
        </main>
      </div>`;
  },

  viewUser() {
    const statusColor = this.isWithinRadius ? 'bg-green-500' : 'bg-red-500';
    const statusText = this.isWithinRadius ? 'DALAM RADIUS' : 'LUAR RADIUS';

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
          <button onclick="App.checkLocationAccess()" class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/10 shadow-sm active:scale-90"><i data-lucide="refresh-cw" class="w-5 h-5"></i></button>
        </header>

        <div class="text-center mb-8">
          <h2 class="text-5xl font-black text-white tracking-tighter">KEHADIRAN</h2>
          <p id="clock" class="text-xs font-mono text-red-100 tracking-[0.3em] mt-2 font-bold opacity-80">00:00:00 WIB</p>
        </div>

        <div class="glass-card p-6 mb-6">
          <div class="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
             <div class="flex items-center gap-3 text-gray-800">
                <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
                <div><p class="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status Lokasi</p>
                <div class="flex items-center gap-1.5"><span class="w-2 h-2 ${statusColor} rounded-full animate-pulse"></span><p class="text-xs font-black uppercase">${statusText}</p></div></div>
             </div>
             <div class="text-right">
                <p class="text-sm font-black text-gray-800">${new Date().toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'short'})}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">KOORDINAT TERKUNCI</p>
             </div>
          </div>
          
          ${!this.isWithinRadius ? `
            <button onclick="App.openDinasForm()" class="w-full bg-orange-500 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3">
              <i data-lucide="briefcase" class="w-4 h-4"></i> Ajukan Dinas Luar
            </button>
          ` : `
            <div class="grid grid-cols-2 gap-4">
               <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Jarak Kantor</p><p class="text-sm font-black text-green-600">Terjangkau</p></div>
               <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Metode</p><p class="text-sm font-black text-gray-700">Face ID</p></div>
            </div>
          `}
        </div>

        <div>
           <p class="text-[11px] font-black text-gray-400 mb-4 ml-1 uppercase tracking-widest opacity-60">Layanan Digital</p>
           <div class="grid grid-cols-4 gap-4 px-1">
              ${this.createMenuBtn('Dinas', 'briefcase', 'App.openDinasForm()')}
              ${this.createMenuBtn('Izin', 'file-text')}
              ${this.createMenuBtn('Jurnal', 'edit-3')}
              ${this.createMenuBtn('Histori', 'history')}
           </div>
        </div>

        <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white flex items-center justify-around rounded-t-[35px] px-8 z-50 border-t border-gray-50">
           <button class="flex flex-col items-center text-red-600 transition active:scale-90"><i data-lucide="layout-grid" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-tighter tracking-widest">Beranda</span></button>
           <div class="relative -top-8">
              <button ${this.isWithinRadius ? 'onclick="App.startPresence()"' : ''} 
                class="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition active:scale-90 
                ${this.isWithinRadius ? 'btn-primary' : 'bg-gray-300 cursor-not-allowed shadow-none'}">
                <i data-lucide="camera" class="w-8 h-8 text-white"></i>
              </button>
              <span class="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold ${this.isWithinRadius ? 'text-gray-400' : 'text-red-500 font-black'} uppercase tracking-tighter">
                ${this.isWithinRadius ? 'Presensi' : 'Terkunci'}
              </span>
           </div>
           <button onclick="App.logout()" class="flex flex-col items-center text-gray-300 transition active:scale-90"><i data-lucide="log-out" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-tighter tracking-widest">Keluar</span></button>
        </nav>
      </div>

      <div id="dinas-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] hidden flex items-center justify-center p-6">
        <div class="bg-white w-full max-w-sm rounded-[40px] overflow-hidden animate-slide-up">
           <div class="p-8">
              <h3 class="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter text-center">Form Dinas Luar</h3>
              <p class="text-xs text-gray-400 text-center mb-8">Lengkapi laporan kegiatan luar kantor</p>
              
              <div class="space-y-4">
                 <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Nama Kegiatan</label>
                    <input id="dinas_title" type="text" placeholder="Misal: Meeting Client A" class="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-red-500">
                 </div>
                 <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Lampiran Foto</label>
                    <div class="relative">
                       <input type="file" id="dinas_file" accept="image/*" class="hidden" onchange="document.getElementById('file-name').innerText = this.files[0].name">
                       <button onclick="document.getElementById('dinas_file').click()" class="w-full p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border-2 border-dashed border-red-200 flex items-center justify-center gap-2">
                          <i data-lucide="camera" class="w-4 h-4"></i> <span id="file-name">Pilih Foto Kegiatan</span>
                       </button>
                    </div>
                 </div>
              </div>

              <div class="flex gap-3 mt-10">
                 <button onclick="App.closeDinasForm()" class="flex-1 p-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest">Batal</button>
                 <button onclick="App.submitDinas()" class="flex-[2] p-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200">Kirim Laporan</button>
              </div>
           </div>
        </div>
      </div>`;
  },

  createMenuBtn(label, icon, action = "") {
    return `
      <div class="flex flex-col items-center gap-2">
         <button onclick="${action}" class="w-full aspect-square bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-red-500 shadow-sm active:scale-90 transition-all">
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

    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>`;

    try {
      const res = await API.call({
        action: "login",
        username: u,
        password: p,
        currentDeviceId: navigator.userAgent
      });

      if (res.success) {
        this.user = { id: res.data.id, Name: res.data.name, Role: res.data.role };
        localStorage.setItem('sipanda_session', JSON.stringify(this.user));
        this.currentPage = 'dashboard';
        this.checkLocationAccess(); 
        this.render();
      } else {
        this.showToast(res.message, "error");
        btn.disabled = false;
        btn.innerHTML = "Masuk ke Sistem";
      }
    } catch (e) {
      this.showToast("Gagal terhubung ke database", "error");
      btn.disabled = false;
    }
  },

  openDinasForm() { document.getElementById('dinas-overlay').classList.remove('hidden'); lucide.createIcons(); },
  closeDinasForm() { document.getElementById('dinas-overlay').classList.add('hidden'); },

  async submitDinas() {
    const title = document.getElementById('dinas_title').value;
    const fileInput = document.getElementById('dinas_file');
    const file = fileInput.files[0];
    
    if (!title || !file) return this.showToast("Isi kegiatan dan lampirkan foto!", "error");

    // Efek Loading pada tombol
    const btn = document.querySelector('button[onclick="App.submitDinas()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>`;

    try {
      // 1. Ambil Lokasi Terkini
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej);
      });

      // 2. Konversi File ke Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result;

        // 3. Kirim ke API
        const res = await API.call({
          action: 'submit_dinas',
          user_id: this.user.User_ID,
          title: title,
          fileData: base64File,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });

        if (res.success) {
          this.showToast("Laporan Berhasil Terkirim!", "success");
          this.closeDinasForm();
          // Reset form
          document.getElementById('dinas_title').value = "";
          document.getElementById('file-name').innerText = "Pilih Foto Kegiatan";
        } else {
          this.showToast(res.message, "error");
        }
        
        btn.disabled = false;
        btn.innerHTML = originalText;
      };
    } catch (e) {
      this.showToast("Gagal memproses laporan", "error");
      btn.disabled = false;
      btn.innerHTML = originalText;
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

  startClock() {
    const el = document.getElementById('clock');
    if (el) setInterval(() => el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB", 1000);
  },

  startPresence() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('presence-sheet');
    if (overlay && sheet) {
      overlay.style.visibility = 'visible';
      overlay.style.opacity = '1';
      sheet.style.transform = 'translateY(0)';
      if (typeof FaceService !== 'undefined') FaceService.initCamera();
      lucide.createIcons();
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

  logout() { localStorage.removeItem('sipanda_session'); this.user = null; this.currentPage = 'login'; this.render(); },
  togglePass() { this.showPass = !this.showPass; this.render(); }
};

App.init();
