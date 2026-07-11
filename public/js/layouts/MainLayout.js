import Sidebar from '../components/Sidebar.js';
import Navbar from '../components/Navbar.js';
import { uiState, closeSidebar } from '../uiState.js';

export default {
  components: { Sidebar, Navbar },
  setup() {
    return { uiState, closeSidebar };
  },
  template: `
    <div class="app-shell">
      <div v-if="uiState.sidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>
      <Sidebar />
      <div class="main-area">
        <Navbar />
        <main class="content">
          <router-view />
        </main>
      </div>
    </div>
  `,
};
