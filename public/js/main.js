import { createApp } from 'vue';
import { router } from './router.js?v=20260818-3';
import App from './App.js';
import './pwaInstall.js';

createApp(App).use(router).mount('#app');
