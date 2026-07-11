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

  logout() {
    state.token = null;
    state.user = null;
    state.menuAccess = [];
    localStorage.removeItem('ck_token');
    localStorage.removeItem('ck_user');
    localStorage.removeItem('ck_menu');
  },
};
