import { reactive } from 'vue';

export const uiState = reactive({ sidebarOpen: false });

export function toggleSidebar() {
  uiState.sidebarOpen = !uiState.sidebarOpen;
}

export function closeSidebar() {
  uiState.sidebarOpen = false;
}
