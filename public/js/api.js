import { toast } from './toast.js';

const BASE = '/api';

const SUCCESS_MSG = {
  POST: 'Data berhasil disimpan.',
  PUT: 'Perubahan berhasil disimpan.',
  DELETE: 'Data berhasil dihapus.',
};

async function request(method, url, body) {
  const token = localStorage.getItem('ck_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    toast.error('Tidak dapat terhubung ke server.');
    throw new Error('Tidak dapat terhubung ke server.');
  }

  if (res.status === 401) {
    localStorage.removeItem('ck_token');
    localStorage.removeItem('ck_user');
    if (location.hash !== '#/login') location.hash = '#/login';
    throw new Error('Sesi berakhir, silakan login kembali.');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const msg = (data && data.message) || 'Terjadi kesalahan.';
    toast.error(msg);
    throw new Error(msg);
  }

  if (SUCCESS_MSG[method] && !url.startsWith('/auth')) {
    toast.success(SUCCESS_MSG[method]);
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  delete: (url) => request('DELETE', url),
};
