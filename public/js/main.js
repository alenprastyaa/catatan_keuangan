import { createApp } from 'vue';
import { router } from './router.js';
import App from './App.js';
import './pwaInstall.js';

createApp(App).use(router).mount('#app');
