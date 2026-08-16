import { createApp } from 'vue';
import { router } from './router.js?v=20260816-2';
import App from './App.js';
import './pwaInstall.js';

createApp(App).use(router).mount('#app');
