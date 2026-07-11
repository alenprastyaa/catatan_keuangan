import { MENUS } from '../menus.js';
import { store } from '../store.js';
import { toggleSidebar } from '../uiState.js';

export default {
  setup() {
    return { store, toggleSidebar };
  },
  computed: {
    pageTitle() {
      const found = MENUS.find((m) => m.path === this.$route.path);
      return found ? found.label : 'Dashboard';
    },
    initials() {
      const nama = this.store.state.user?.nama || '?';
      return nama.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
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
        <div class="navbar-avatar">{{ initials }}</div>
        <span class="role-text">{{ store.state.user?.nama }}</span>
        <button class="btn-logout" @click="logout" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  `,
};
