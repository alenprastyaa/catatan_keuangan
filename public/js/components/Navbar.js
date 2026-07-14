import { MENUS } from '../menus.js';
import { store } from '../store.js';
import { toggleSidebar } from '../uiState.js';
import { pwaState, promptInstall } from '../pwaInstall.js';

export default {
  setup() {
    return { store, toggleSidebar, pwaState, promptInstall };
  },
  computed: {
    pageTitle() {
      const found = MENUS.find((m) => m.path === this.$route.path);
      return found ? found.label : 'Dashboard';
    },
    todayLabel() {
      return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },
  },
  methods: {
    logout() {
      store.logout();
      this.$router.push('/login');
    },
  },
  template: `
    <header class="navbar">
      <div class="navbar-left">
        <button class="navbar-toggle" @click="toggleSidebar" aria-label="Buka menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
        </button>
        <div>
          <div class="page-title">{{ pageTitle }}</div>
          <div class="page-date">{{ todayLabel }}</div>
        </div>
      </div>
      <div class="user-menu">
        <button v-if="pwaState.canInstall" class="btn-secondary btn-sm btn-install" @click="promptInstall" title="Install aplikasi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>
          <span>Install App</span>
        </button>
        <div class="navbar-avatar"><img src="/img/logo.png" alt="Mitrayasa" /></div>
        <span class="role-text">{{ store.state.user?.nama }}</span>
        <button class="btn-logout" @click="logout" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  `,
};
