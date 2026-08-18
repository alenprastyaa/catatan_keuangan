import { createRouter, createWebHashHistory } from 'vue-router';
import { store } from './store.js';
import MainLayout from './layouts/MainLayout.js';
import Login from './views/Login.js';
import Dashboard from './views/Dashboard.js';
import Produk from './views/Produk.js';
import Pembelian from './views/Pembelian.js?v=20260818-5';
import Penjualan from './views/Penjualan.js?v=20260811-4';
import ManajemenUser from './views/ManajemenUser.js';
import PengeluaranKas from './views/PengeluaranKas.js';
import Nota from './views/Nota.js?v=20260818-5';
import Laporan from './views/Laporan.js?v=20260818-7';

const routes = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard, meta: { menu: 'dashboard' } },
      { path: 'penjualan', component: Penjualan, meta: { menu: 'penjualan' } },
      { path: 'pembelian', component: Pembelian, meta: { menu: 'pembelian' } },
      { path: 'produk', component: Produk, meta: { menu: 'produk' } },
      { path: 'pengeluaran-kas', component: PengeluaranKas, meta: { menu: 'pengeluaran-kas' } },
      { path: 'nota', component: Nota, meta: { menu: 'nota' } },
      { path: 'laporan', component: Laporan, meta: { menu: 'laporan' } },
      { path: 'manajemen-user', component: ManajemenUser, meta: { menu: 'manajemen-user' } },
    ],
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.path !== '/login' && !store.isLoggedIn()) {
    return '/login';
  }
  if (to.path === '/login' && store.isLoggedIn()) {
    return '/';
  }
  if (to.meta && to.meta.menu && !store.hasMenu(to.meta.menu)) {
    return '/';
  }
  return true;
});
