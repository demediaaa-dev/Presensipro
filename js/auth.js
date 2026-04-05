/**
 * Portal Karyawan - Authentication
 * Handle login/logout and session management
 */

const auth = {
    currentUser: null,

    init() {
        // Check for existing session
        const session = typeof storage !== 'undefined' ? storage.get('session') : null;
        if (session) {
            this.currentUser = session;
            this.showApp();
        }

        // Login form handler
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Toggle password visibility
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Logout button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Profile click
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            const userInfoArea = userProfile.querySelector('.user-info');
            const userAvatarArea = userProfile.querySelector('.user-avatar');
            if (userInfoArea) {
                userInfoArea.style.cursor = 'pointer';
                userInfoArea.addEventListener('click', () => this.openProfileModal());
            }
            if (userAvatarArea) {
                userAvatarArea.style.cursor = 'pointer';
                userAvatarArea.addEventListener('click', () => this.openProfileModal());
            }
        }
    },

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const roleInput = document.querySelector('input[name="role"]:checked');
        const role = roleInput ? roleInput.value : 'employee';

        if (!email || !password) {
            if (typeof toast !== 'undefined') toast.error('Email dan password harus diisi!');
            return;
        }

        // Show loading state pada button Tailwind
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Memproses...';
        submitBtn.disabled = true;

        try {
            const result = await api.login(email, password);

            let user;
            if (result.success && result.data) {
                user = {
                    id: result.data.id,
                    email: result.data.email,
                    name: result.data.name,
                    role: result.data.role || role,
                    department: result.data.department || '',
                    position: result.data.position || '',
                    shift: result.data.shift || '',
                    avatar: result.data.avatar || '',
                    loginTime: new Date().toISOString()
                };
            } else if (result.success && !result.data && (typeof API_BASE_URL === 'undefined' || !API_BASE_URL)) {
                // Fallback testing
                const displayName = email.split('@')[0] || 'User';
                user = {
                    id: 'user_' + Date.now(),
                    email: email,
                    name: role === 'admin' ? 'Admin (Local)' : displayName,
                    role: role,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF4B2B&color=fff`,
                    loginTime: new Date().toISOString()
                };
            } else {
                if (typeof toast !== 'undefined') toast.error(result.error || 'Email atau password salah!');
                submitBtn.innerHTML = originalContent;
                submitBtn.disabled = false;
                return;
            }

            this.currentUser = user;
            storage.set('session', user);
            this.updateUserUI();
            this.showApp();
            if (typeof toast !== 'undefined') toast.success(`Selamat datang, ${user.name}!`);

        } catch (error) {
            console.error('Login error:', error);
            if (typeof toast !== 'undefined') toast.error('Terjadi kesalahan saat login');
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
        }
    },

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('login-password');
        const toggleBtn = document.getElementById('toggle-password');
        const icon = toggleBtn.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    },

    handleLogout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            this.currentUser = null;
            storage.remove('session');
            storage.remove('currentPage');
            this.showLogin();
            if (typeof toast !== 'undefined') toast.info('Anda telah logout');
        }
    },

    showApp() {
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        if (loginContainer && appContainer) {
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            this.updateUserUI();
            
            // Logic menu (admin/employee) tetap sama dengan kode lama Anda
            const employeeMenu = document.getElementById('employee-menu');
            const adminMenu = document.getElementById('admin-menu-nav');
            if (this.currentUser && this.currentUser.role === 'admin') {
                if (employeeMenu) employeeMenu.classList.add('hidden');
                if (adminMenu) adminMenu.classList.remove('hidden');
                router.navigate('admin-dashboard');
            } else {
                if (employeeMenu) employeeMenu.classList.remove('hidden');
                if (adminMenu) adminMenu.classList.add('hidden');
                router.navigate('dashboard');
            }
        }
    },

    showLogin() {
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        if (loginContainer && appContainer) {
            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.reset();
        }
    },

    updateUserUI() {
        if (!this.currentUser) return;
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const welcomeNameEl = document.getElementById('welcome-name');
        if (userNameEl) userNameEl.textContent = this.currentUser.name;
        if (userRoleEl) userRoleEl.textContent = this.currentUser.role === 'admin' ? 'Administrator' : 'Karyawan';
        if (welcomeNameEl) welcomeNameEl.textContent = this.currentUser.name.split(' ')[0];
    }
};

document.addEventListener('DOMContentLoaded', () => auth.init());
window.auth = auth;