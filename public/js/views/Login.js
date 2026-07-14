import { store } from '../store.js';
import { pwaState, promptInstall } from '../pwaInstall.js';

export default {
  setup() {
    return { pwaState, promptInstall };
  },
  data() {
    return { username: '', password: '', error: '', loading: false };
  },
  methods: {
    async submit() {
      this.error = '';
      this.loading = true;
      try {
        await store.login(this.username, this.password);
        this.$router.push('/');
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div class="login-page">
      <form class="login-card" @submit.prevent="submit">
        <h1>Catatan Keuangan</h1>
        <p>Masuk untuk melanjutkan</p>

        <div class="field">
          <label>Username</label>
          <input v-model="username" type="text" required autofocus style="width:100%" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" required style="width:100%" />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button class="btn-primary" type="submit" :disabled="loading" style="width:100%">
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>

        <button v-if="pwaState.canInstall" type="button" class="btn-secondary" style="width:100%;margin-top:10px" @click="promptInstall">
          ⬇ Install Aplikasi
        </button>
      </form>
    </div>
  `,
};
