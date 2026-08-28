import { createApp } from 'vue';
import { router } from './router.js?v=20260828-4';
import App from './App.js';
import { store } from './store.js';
import './pwaInstall.js';

createApp(App).use(router).mount('#app');

store.refreshMenus();
