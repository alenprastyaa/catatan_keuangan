import { reactive } from 'vue';
import { api } from './api.js';

const state = reactive({
  user: JSON.parse(localStorage.getItem('ck_user') || 'null'),
  token: localStorage.getItem('ck_token') || null,
  menuAccess: JSON.parse(localStorage.getItem('ck_menu') || '[]'),
});

export const store = {
  state,

  isLoggedIn() {
    return !!state.token;
  },

  hasMenu(key) {
    return state.menuAccess.includes(key);
  },

  async login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    state.token = res.token;
    state.user = res.user;
    state.menuAccess = res.menuAccess;
    localStorage.setItem('ck_token', res.token);
    localStorage.setItem('ck_user', JSON.stringify(res.user));
    localStorage.setItem('ck_menu', JSON.stringify(res.menuAccess));
    return res;
  },

  // Menu access disimpan di localStorage saat login, jadi menu yang baru
  // ditambahkan tidak muncul sampai user login ulang. Segarkan saat aplikasi
  // dibuka agar perubahan hak akses langsung terlihat.
  async refreshMenus() {
    if (!state.token) return;
    try {
      const res = await api.get('/auth/me');
      state.menuAccess = res.menuAccess;
      localStorage.setItem('ck_menu', JSON.stringify(res.menuAccess));
    } catch (err) {
      // token kedaluwarsa atau server tidak terjangkau: biarkan data lama dipakai
    }
  },

  logout() {
    state.token = null;
    state.user = null;
    state.menuAccess = [];
    localStorage.removeItem('ck_token');
    localStorage.removeItem('ck_user');
    localStorage.removeItem('ck_menu');
  },
};
