const App = {
  user: null,
  currentPage: 'login', // Default ke login jika tidak ada session
  showPass: false,
  isWithinRadius: true,
  attendanceStatus: 'none', 
  dataStats: { employees: 0, present: 0, leaves: 0 },

  async init() {
    const saved = localStorage.getItem('sipanda_session');
    if (saved) {
      this.user = JSON.parse(saved);
      this.currentPage = 'dashboard';
      
      // Tunggu kedua data ini selesai diambil baru render
      await Promise.all([
        this.getAttendanceStatus(),
        this.checkLocationAccess()
      ]);
    }
    this.render(); // Render dipanggil SETELAH data siap
  },

  // --- PERBAIKAN DI SINI: Tutup kurung kurawal dan try catch yang benar ---
  async getAttendanceStatus() {
    const idPegawai = this.user?.User_ID || this.user?.id;
    if (!idPegawai) return;

    try {
      const res = await API.call({
        action: 'get_status',
        user_id: idPegawai
      });
      
      if (res.success) {
        this.attendanceStatus = res.status; // 'none', 'in', 'out'
        this.render();
      }
    } catch (e) {
      console.error("Gagal cek status absen:", e);
    }
  },

  async checkLocationAccess() {
    if (this.user && this.user.Role.toLowerCase() !== 'admin') {
      // Gunakan watchPosition jika ingin update terus-menerus, 
      // atau pastikan getCurrentPosition menggunakan High Accuracy
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await API.call({
            action: 'check_radius',
            user_id: this.user.User_ID || this.user.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy // Kirim akurasi untuk log (opsional)
          });
          this.isWithinRadius = res.success;
          this.render();
        },
        (err) => console.error("GPS Error:", err),
        { 
          enableHighAccuracy: true, // WAJIB: Paksa pakai GPS Satelit
          timeout: 10000, 
          maximumAge: 0 // Jangan pakai data lokasi cache yang lama
        }
      );
    }
  },

  render() {
    const root = document.getElementById('app');
    if (!root) return;

    if (this.currentPage === 'login') {
      root.innerHTML = this.viewLogin();
    } else if (this.user) {
      root.innerHTML = (this.user.Role && this.user.Role.toLowerCase() === 'admin') ? this.viewAdmin() : this.viewUser();
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
          <p class="mt-16 text-[10px] text-gray-300 font-bold uppercase tracking-widest">v2.1 Stable Edition</p>
        </div>
      </div>`;
  },

  viewAdmin() {
    return `
      <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <div class="bg-white p-8 rounded-[40px] shadow-sm text-center w-full max-w-sm">
          <h2 class="text-2xl font-black mb-2">Panel Admin</h2>
          <p class="text-gray-500 text-sm mb-6 uppercase tracking-widest font-bold">Selamat Datang, ${this.user.Name}</p>
          <button onclick="App.logout()" class="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold">Logout</button>
        </div>
      </div>`;
  },

  viewUser() {
    const statusColor = this.isWithinRadius ? 'bg-green-500' : 'bg-red-500';
    const statusText = this.isWithinRadius ? 'DALAM RADIUS' : 'LUAR RADIUS';
    
    let btnClass = "bg-red-600";
    let btnLabel = "Presensi";
    let btnIcon = "camera";

    if (this.attendanceStatus === 'in') {
      btnClass = "bg-indigo-600"; 
      btnLabel = "Pulang";
      btnIcon = "log-out";
    } else if (this.attendanceStatus === 'out') {
      btnClass = "bg-gray-400 cursor-not-allowed";
      btnLabel = "Selesai";
      btnIcon = "check";
    }

    return `
      <div class="header-red-section" style="background:linear-gradient(to bottom, #dc2626, #991b1b); height:260px; position:absolute; top:0; left:0; right:0; z-index:-1; border-radius:0 0 40px 40px;"></div>
      <div class="max-w-md mx-auto min-h-screen flex flex-col p-5 pb-32">
        
        <header class="flex justify-between items-center mb-8 mt-2 text-white px-1">
          <div class="flex items-center gap-3">
             <div class="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden shadow-lg bg-white/20 flex items-center justify-center font-black text-xl">
                ${this.user.Name ? this.user.Name.charAt(0) : 'U'}
             </div>
             <div>
                <h1 class="text-lg font-bold leading-tight">${this.user.Name}</h1>
                <p class="text-[10px] font-bold opacity-70 uppercase tracking-widest">${this.user.Role}</p>
             </div>
          </div>
          <button onclick="App.checkLocationAccess()" class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/10 shadow-sm active:scale-90"><i data-lucide="refresh-cw" class="w-5 h-5"></i></button>
        </header>

        <div class="text-center mb-8">
          <h2 class="text-5xl font-black text-white tracking-tighter">SIPANDA</h2>
          <p id="clock" class="text-xs font-mono text-red-100 tracking-[0.3em] mt-2 font-bold opacity-80">00:00:00 WIB</p>
        </div>

        <div class="bg-white p-6 mb-6 rounded-[35px] shadow-2xl shadow-red-900/10">
          <div class="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
             <div class="flex items-center gap-3 text-gray-800">
                <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
                <div><p class="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status Lokasi</p>
                <div class="flex items-center gap-1.5"><span class="w-2 h-2 ${statusColor} rounded-full animate-pulse"></span><p class="text-xs font-black uppercase">${statusText}</p></div></div>
             </div>
             <div class="text-right">
                <p class="text-sm font-black text-gray-800">${new Date().toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'short'})}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">SINKRON AKTIF</p>
             </div>
          </div>
          
          ${!this.isWithinRadius ? `
            <button onclick="App.openDinasForm()" class="w-full bg-orange-500 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3">
              <i data-lucide="briefcase" class="w-4 h-4"></i> Ajukan Dinas Luar
            </button>
          ` : `
            <div class="grid grid-cols-2 gap-4">
               <div class="text-center p-3 ${this.attendanceStatus !== 'none' ? 'bg-green-50' : 'bg-gray-50'} rounded-2xl border border-gray-100">
                  <p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Status Absen</p>
                  <p class="text-sm font-black ${this.attendanceStatus !== 'none' ? 'text-green-600' : 'text-gray-700'} uppercase">${this.attendanceStatus === 'none' ? 'Belum Masuk' : (this.attendanceStatus === 'in' ? 'Sudah Masuk' : 'Sudah Pulang')}</p>
               </div>
               <div class="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p class="text-[9px] font-bold text-gray-400 uppercase mb-1">Metode</p>
                  <p class="text-sm font-black text-gray-700 uppercase">Face ID</p>
               </div>
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

        <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white flex items-center justify-around rounded-t-[35px] px-8 z-50 border-t border-gray-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
           <button class="flex flex-col items-center text-red-600 transition active:scale-90"><i data-lucide="layout-grid" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-widest">Beranda</span></button>
           <div class="relative -top-8">
              <button ${this.isWithinRadius && this.attendanceStatus !== 'out' ? 'onclick="App.startPresence()"' : ''} 
                class="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition active:scale-90 
                ${this.isWithinRadius && this.attendanceStatus !== 'out' ? btnClass : 'bg-gray-300 cursor-not-allowed shadow-none'}">
                <i data-lucide="${btnIcon}" class="w-8 h-8 text-white"></i>
              </button>
              <span class="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold ${this.isWithinRadius ? 'text-gray-400' : 'text-red-500 font-black'} uppercase tracking-tighter">
                ${this.isWithinRadius ? btnLabel : 'Terkunci'}
              </span>
           </div>
           <button onclick="App.logout()" class="flex flex-col items-center text-gray-300 transition active:scale-90"><i data-lucide="log-out" class="w-6 h-6"></i><span class="text-[9px] font-bold mt-1 uppercase tracking-widest text-gray-300">Keluar</span></button>
        </nav>
      </div>

      <div id="dinas-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] hidden flex items-center justify-center p-6">
        <div class="bg-white w-full max-w-sm rounded-[40px] overflow-hidden animate-slide-up">
           <div class="p-8">
              <h3 class="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter text-center">Form Dinas Luar</h3>
              <div class="space-y-4 text-left mt-6">
                 <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Nama Kegiatan</label>
                    <input id="dinas_title" type="text" placeholder="Judul Kegiatan" class="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-red-500">
                 </div>
                 <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Lampiran Foto</label>
                    <input type="file" id="dinas_file" accept="image/*" class="hidden" onchange="document.getElementById('file-name').innerText = this.files[0].name">
                    <button onclick="document.getElementById('dinas_file').click()" class="w-full p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border-2 border-dashed border-red-200 flex items-center justify-center gap-2">
                       <i data-lucide="camera" class="w-4 h-4"></i> <span id="file-name">Pilih Foto</span>
                    </button>
                 </div>
              </div>
              <div class="flex gap-3 mt-10">
                 <button onclick="App.closeDinasForm()" class="flex-1 p-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest">Batal</button>
                 <button onclick="App.submitDinas()" class="flex-[2] p-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Kirim</button>
              </div>
           </div>
        </div>
      </div>
      
      <div id="confirm-out-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] hidden flex items-end justify-center transition-all duration-300">
      <div id="confirm-out-sheet" class="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 translate-y-full transition-transform duration-300 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        
        <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
        
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <i data-lucide="log-out" class="w-10 h-10"></i>
          </div>
          <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Selesai Bertugas?</h3>
          <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Pastikan pekerjaan Anda telah selesai</p>
        </div>
    
        <div class="flex flex-col gap-3">
          <button onclick="App.processOutConfirmation()" class="w-full p-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">
            Ya, Presensi Pulang
          </button>
          <button onclick="App.closeConfirmOut()" class="w-full p-5 bg-gray-50 text-gray-400 rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">
            Batal
          </button>
        </div>
      </div>
    </div>

    <div id="logout-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] hidden flex items-end justify-center transition-all duration-300">
      <div id="logout-sheet" class="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 translate-y-full transition-transform duration-300 shadow-2xl">
        <div class="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8"></div>
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4">
            <i data-lucide="power" class="w-10 h-10"></i>
          </div>
          <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Keluar Sistem?</h3>
          <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Anda perlu login kembali nanti</p>
        </div>
        <div class="flex flex-col gap-3">
          <button onclick="App.executeLogout()" class="w-full p-5 bg-red-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">Keluar Sekarang</button>
          <button onclick="App.closeLogoutModal()" class="w-full p-5 bg-gray-50 text-gray-400 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Batal</button>
        </div>
      </div>
    </div>`;
  },

  createMenuBtn(label, icon, action = "") {
    return `<div class="flex flex-col items-center gap-2"><button onclick="${action}" class="w-full aspect-square bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-red-500 shadow-sm active:scale-90 transition-all"><i data-lucide="${icon}"></i></button><span class="text-[9px] font-bold text-gray-500 uppercase tracking-tight text-center leading-tight">${label}</span></div>`;
  },

  async handleLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (!u || !p) return this.showToast("Lengkapi data!", "error");
    
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
        this.user = { User_ID: res.data.id, Name: res.data.name, Role: res.data.role };
        localStorage.setItem('sipanda_session', JSON.stringify(this.user));
        this.currentPage = 'dashboard';
        this.getAttendanceStatus();
        this.checkLocationAccess(); 
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

// Ganti fungsi startPresence yang lama
startPresence() {
  // Jika sudah absen masuk, tampilkan popup konfirmasi kustom (bukan confirm default)
  if (this.attendanceStatus === 'in') {
    this.openConfirmOut();
    return;
  }
  
  // Jika belum absen, langsung buka kamera
  this.openCameraModal();
},

// Fungsi untuk membuka Kamera Modal
openCameraModal() {
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

// Fungsi Modal Konfirmasi Pulang
openConfirmOut() {
  const overlay = document.getElementById('confirm-out-overlay');
  const sheet = document.getElementById('confirm-out-sheet');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    sheet.classList.remove('translate-y-full');
  }, 10);
  lucide.createIcons();
},

closeConfirmOut() {
  const overlay = document.getElementById('confirm-out-overlay');
  const sheet = document.getElementById('confirm-out-sheet');
  sheet.classList.add('translate-y-full');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
},

// Fungsi yang dipanggil saat tombol "Ya, Presensi Pulang" diklik
processOutConfirmation() {
  this.closeConfirmOut();
  // Beri jeda sedikit agar transisi modal tutup selesai sebelum kamera buka
  setTimeout(() => {
    this.openCameraModal();
  }, 400);
},

  onPresenceSuccess() {
    this.showToast("Presensi Berhasil!");
    this.getAttendanceStatus(); 
    this.closePresence();
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

  openDinasForm() { document.getElementById('dinas-overlay').classList.remove('hidden'); lucide.createIcons(); },
  closeDinasForm() { document.getElementById('dinas-overlay').classList.add('hidden'); },

  async submitDinas() {
    const title = document.getElementById('dinas_title').value;
    const file = document.getElementById('dinas_file').files[0];
    const btn = document.querySelector('#dinas-overlay button[onclick="App.submitDinas()"]');
    
    if (!title || !file) return this.showToast("Lengkapi data dan foto!", "error");
  
    // Aktifkan Loading
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<div class="flex items-center justify-center gap-2"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> <span>MENGIRIM...</span></div>`;
  
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const res = await API.call({ 
          action: 'submit_dinas', 
          user_id: this.user.User_ID || this.user.id, 
          title, 
          fileData: reader.result, 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        });
  
        if (res.success) {
          this.showToast("Laporan Dinas Terkirim!");
          this.closeDinasForm();
          // Reset Form
          document.getElementById('dinas_title').value = "";
          document.getElementById('dinas_file').value = "";
          document.getElementById('file-name').innerText = "Pilih Foto Kegiatan";
        } else {
          this.showToast(res.message, "error");
        }
        
        // Kembalikan tombol
        btn.disabled = false;
        btn.innerHTML = originalText;
      };
    } catch (e) {
      this.showToast("Gagal mengambil lokasi/file", "error");
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
    if (el) {
      if (this.clockTimer) clearInterval(this.clockTimer);
      this.clockTimer = setInterval(() => {
        el.innerText = new Date().toLocaleTimeString('id-ID') + " WIB";
      }, 1000);
    }
  },

  logout() { 
    localStorage.removeItem('sipanda_session'); 
    this.user = null; 
    this.currentPage = 'login'; 
    this.render(); 
  },

  togglePass() { 
    this.showPass = !this.showPass; 
    this.render(); 
  }
};

// Menjalankan inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => App.init());
