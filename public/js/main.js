import { createApp } from 'vue';
import { router } from './router.js';
import App from './App.js';

createApp(App).use(router).mount('#app');
