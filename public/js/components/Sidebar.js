import { MENUS } from '../menus.js';
import { store } from '../store.js';
import { uiState, closeSidebar } from '../uiState.js';

export default {
  setup() {
    const menus = MENUS.filter((m) => store.hasMenu(m.key));
    return { menus, uiState, closeSidebar, store };
  },
  computed: {
    initials() {
      const nama = this.store.state.user?.nama || '?';
      return nama.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    },
  },
  template: `
    <aside class="sidebar" :class="{ open: uiState.sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-logo-card">
          <img src="/img/logo.png" alt="Mitrayasa Dairy Natural" />
        </div>
      </div>

      <div class="sidebar-section-label">Menu Utama</div>

      <nav class="sidebar-nav">
        <router-link
          v-for="m in menus"
          :key="m.key"
          :to="m.path"
          :class="{ active: $route.path === m.path }"
          @click="closeSidebar"
        >
          <span class="nav-icon" v-html="m.icon"></span>
          <span class="nav-label">{{ m.label }}</span>
          <span class="nav-indicator"></span>
        </router-link>
      </nav>

      <div class="sidebar-user">
        <div class="sidebar-avatar">{{ initials }}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ store.state.user?.nama }}</div>
          <div class="sidebar-user-role">{{ store.state.user?.role_nama }}</div>
        </div>
      </div>
    </aside>
  `,
};
