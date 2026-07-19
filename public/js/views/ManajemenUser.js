import { api } from '../api.js';
import { tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';

const emptyPs = () => ({ id: null, nama: '', tipe: 'supplier', telepon: '', alamat: '', email: '' });
const emptyPb = () => ({ id: null, nama: '', telepon: '', alamat: '' });
const emptyAd = () => ({ id: null, nama: '', username: '', email: '', password: '', role_id: '', status: 'aktif' });
const emptyRole = () => ({ id: null, nama_role: '', menu_access: [] });

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      activeTab: 'pelanggan-supplier',
      tabs: [
        ['pelanggan-supplier', 'Pelanggan / Supplier'],
        ['pembeli', 'Pembeli'],
        ['admin', 'Admin'],
        ['role', 'Role & Menu Access'],
      ],

      ps: { rows: [], total: 0, page: 1, limit: 20, search: '', loading: false, showModal: false, form: emptyPs(), error: '', timer: null,
        columns: [
          { key: 'nama', label: 'Nama' }, { key: 'tipe', label: 'Tipe' },
          { key: 'telepon', label: 'Telepon' }, { key: 'email', label: 'Email' },
        ] },

      pb: { rows: [], total: 0, page: 1, limit: 20, search: '', loading: false, showModal: false, form: emptyPb(), error: '', timer: null,
        columns: [{ key: 'nama', label: 'Nama' }, { key: 'telepon', label: 'Telepon' }, { key: 'alamat', label: 'Alamat' }] },

      ad: { rows: [], total: 0, page: 1, limit: 20, search: '', loading: false, showModal: false, form: emptyAd(), error: '', timer: null, roles: [],
        columns: [
          { key: 'nama', label: 'Nama' }, { key: 'username', label: 'Username' },
          { key: 'nama_role', label: 'Role' }, { key: 'status', label: 'Status' },
        ] },

      role: { rows: [], availableMenus: [], loading: false, showModal: false, form: emptyRole(), error: '' },
    };
  },
  mounted() {
    this.loadPs();
  },
  methods: {
    tanggalIndo,
    switchTab(key) {
      this.activeTab = key;
      if (key === 'pelanggan-supplier' && this.ps.rows.length === 0) this.loadPs();
      if (key === 'pembeli' && this.pb.rows.length === 0) this.loadPb();
      if (key === 'admin') this.loadAd();
      if (key === 'role') this.loadRole();
    },

    // ---- Pelanggan/Supplier ----
    async loadPs() {
      this.ps.loading = true;
      const params = new URLSearchParams({ search: this.ps.search, page: this.ps.page, limit: this.ps.limit });
      const res = await api.get('/manajemen-user/pelanggan-supplier?' + params.toString());
      this.ps.rows = res.data; this.ps.total = res.total; this.ps.loading = false;
    },
    onPsFilter() { clearTimeout(this.ps.timer); this.ps.timer = setTimeout(() => { this.ps.page = 1; this.loadPs(); }, 300); },
    psPage(p) { this.ps.page = p; this.loadPs(); },
    openPsCreate() { this.ps.form = emptyPs(); this.ps.error = ''; this.ps.showModal = true; },
    openPsEdit(row) { this.ps.form = { ...row }; this.ps.error = ''; this.ps.showModal = true; },
    async savePs() {
      try {
        if (this.ps.form.id) await api.put('/manajemen-user/pelanggan-supplier/' + this.ps.form.id, this.ps.form);
        else await api.post('/manajemen-user/pelanggan-supplier', this.ps.form);
        this.ps.showModal = false; this.loadPs();
      } catch (err) { this.ps.error = err.message; }
    },
    async removePs(row) {
      if (!confirm(`Hapus "${row.nama}"?`)) return;
      await api.delete('/manajemen-user/pelanggan-supplier/' + row.id); this.loadPs();
    },

    // ---- Pembeli ----
    async loadPb() {
      this.pb.loading = true;
      const params = new URLSearchParams({ search: this.pb.search, page: this.pb.page, limit: this.pb.limit });
      const res = await api.get('/manajemen-user/pembeli?' + params.toString());
      this.pb.rows = res.data; this.pb.total = res.total; this.pb.loading = false;
    },
    onPbFilter() { clearTimeout(this.pb.timer); this.pb.timer = setTimeout(() => { this.pb.page = 1; this.loadPb(); }, 300); },
    pbPage(p) { this.pb.page = p; this.loadPb(); },
    openPbCreate() { this.pb.form = emptyPb(); this.pb.error = ''; this.pb.showModal = true; },
    openPbEdit(row) { this.pb.form = { ...row }; this.pb.error = ''; this.pb.showModal = true; },
    async savePb() {
      try {
        if (this.pb.form.id) await api.put('/manajemen-user/pembeli/' + this.pb.form.id, this.pb.form);
        else await api.post('/manajemen-user/pembeli', this.pb.form);
        this.pb.showModal = false; this.loadPb();
      } catch (err) { this.pb.error = err.message; }
    },
    async removePb(row) {
      if (!confirm(`Hapus "${row.nama}"?`)) return;
      await api.delete('/manajemen-user/pembeli/' + row.id); this.loadPb();
    },

    // ---- Admin ----
    async loadAd() {
      this.ad.loading = true;
      const params = new URLSearchParams({ search: this.ad.search, page: this.ad.page, limit: this.ad.limit });
      const [res, rolesRes] = await Promise.all([
        api.get('/manajemen-user/admin?' + params.toString()),
        api.get('/roles'),
      ]);
      this.ad.rows = res.data; this.ad.total = res.total;
      this.ad.roles = rolesRes.data;
      this.ad.loading = false;
    },
    onAdFilter() { clearTimeout(this.ad.timer); this.ad.timer = setTimeout(() => { this.ad.page = 1; this.loadAd(); }, 300); },
    adPage(p) { this.ad.page = p; this.loadAd(); },
    openAdCreate() { this.ad.form = emptyAd(); this.ad.error = ''; this.ad.showModal = true; },
    openAdEdit(row) { this.ad.form = { ...row, password: '' }; this.ad.error = ''; this.ad.showModal = true; },
    async saveAd() {
      try {
        if (this.ad.form.id) await api.put('/manajemen-user/admin/' + this.ad.form.id, this.ad.form);
        else await api.post('/manajemen-user/admin', this.ad.form);
        this.ad.showModal = false; this.loadAd();
      } catch (err) { this.ad.error = err.message; }
    },
    async removeAd(row) {
      if (!confirm(`Hapus admin "${row.nama}"?`)) return;
      try { await api.delete('/manajemen-user/admin/' + row.id); this.loadAd(); }
      catch (err) { alert(err.message); }
    },

    // ---- Role & Menu Access ----
    async loadRole() {
      this.role.loading = true;
      const res = await api.get('/roles');
      this.role.rows = res.data;
      this.role.availableMenus = res.availableMenus;
      this.role.loading = false;
    },
    openRoleCreate() { this.role.form = emptyRole(); this.role.error = ''; this.role.showModal = true; },
    openRoleEdit(row) { this.role.form = { id: row.id, nama_role: row.nama_role, menu_access: [...row.menu_access] }; this.role.error = ''; this.role.showModal = true; },
    toggleMenu(key) {
      const idx = this.role.form.menu_access.indexOf(key);
      if (idx >= 0) this.role.form.menu_access.splice(idx, 1);
      else this.role.form.menu_access.push(key);
    },
    async saveRole() {
      try {
        if (this.role.form.id) await api.put('/roles/' + this.role.form.id, this.role.form);
        else await api.post('/roles', this.role.form);
        this.role.showModal = false; this.loadRole();
      } catch (err) { this.role.error = err.message; }
    },
    async removeRole(row) {
      if (!confirm(`Hapus role "${row.nama_role}"?`)) return;
      try { await api.delete('/roles/' + row.id); this.loadRole(); }
      catch (err) { alert(err.message); }
    },
  },
  template: `
    <div>
      <div class="tabs">
        <button v-for="t in tabs" :key="t[0]" :class="{ active: activeTab === t[0] }" @click="switchTab(t[0])">{{ t[1] }}</button>
      </div>

      <!-- Pelanggan / Supplier -->
      <div v-if="activeTab === 'pelanggan-supplier'">
        <div class="toolbar filter-toolbar">
          <div class="filter-disclosure">
            <input id="filter-ps" class="filter-toggle-control" type="checkbox" />
            <label for="filter-ps" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
            <div class="filter-fields">
              <input type="text" v-model="ps.search" @input="onPsFilter" placeholder="Cari nama, telepon, email..." style="width:260px" />
            </div>
          </div>
          <div class="spacer"></div>
          <button class="btn-primary" @click="openPsCreate">+ Tambah</button>
        </div>
        <DataTable :columns="ps.columns" :rows="ps.rows" :loading="ps.loading">
          <template #actions="{ row }">
            <button class="btn-secondary btn-sm" @click="openPsEdit(row)">Edit</button>
            <button class="btn-danger btn-sm" @click="removePs(row)">Hapus</button>
          </template>
        </DataTable>
        <Pagination :total="ps.total" :page="ps.page" :limit="ps.limit" @update:page="psPage" />

        <Modal :show="ps.showModal" :title="ps.form.id ? 'Edit Pelanggan/Supplier' : 'Tambah Pelanggan/Supplier'" @close="ps.showModal = false">
          <form @submit.prevent="savePs">
            <div class="field"><label>Nama</label><input v-model="ps.form.nama" required style="width:100%" /></div>
            <div class="field">
              <label>Tipe</label>
              <select v-model="ps.form.tipe" style="width:100%">
                <option value="pelanggan">Pelanggan</option>
                <option value="supplier">Supplier</option>
                <option value="keduanya">Keduanya</option>
              </select>
            </div>
            <div class="field-row">
              <div class="field"><label>Telepon</label><input v-model="ps.form.telepon" style="width:100%" /></div>
              <div class="field"><label>Email</label><input v-model="ps.form.email" style="width:100%" /></div>
            </div>
            <div class="field"><label>Alamat</label><input v-model="ps.form.alamat" style="width:100%" /></div>
            <p v-if="ps.error" class="error-text">{{ ps.error }}</p>
          </form>
          <template #footer>
            <button class="btn-secondary" @click="ps.showModal = false">Batal</button>
            <button class="btn-primary" @click="savePs">Simpan</button>
          </template>
        </Modal>
      </div>

      <!-- Pembeli -->
      <div v-if="activeTab === 'pembeli'">
        <div class="toolbar filter-toolbar">
          <div class="filter-disclosure">
            <input id="filter-pb" class="filter-toggle-control" type="checkbox" />
            <label for="filter-pb" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
            <div class="filter-fields">
              <input type="text" v-model="pb.search" @input="onPbFilter" placeholder="Cari nama, telepon..." style="width:260px" />
            </div>
          </div>
          <div class="spacer"></div>
          <button class="btn-primary" @click="openPbCreate">+ Tambah</button>
        </div>
        <DataTable :columns="pb.columns" :rows="pb.rows" :loading="pb.loading">
          <template #actions="{ row }">
            <button class="btn-secondary btn-sm" @click="openPbEdit(row)">Edit</button>
            <button class="btn-danger btn-sm" @click="removePb(row)">Hapus</button>
          </template>
        </DataTable>
        <Pagination :total="pb.total" :page="pb.page" :limit="pb.limit" @update:page="pbPage" />

        <Modal :show="pb.showModal" :title="pb.form.id ? 'Edit Pembeli' : 'Tambah Pembeli'" @close="pb.showModal = false">
          <form @submit.prevent="savePb">
            <div class="field"><label>Nama</label><input v-model="pb.form.nama" required style="width:100%" /></div>
            <div class="field"><label>Telepon</label><input v-model="pb.form.telepon" style="width:100%" /></div>
            <div class="field"><label>Alamat</label><input v-model="pb.form.alamat" style="width:100%" /></div>
            <p v-if="pb.error" class="error-text">{{ pb.error }}</p>
          </form>
          <template #footer>
            <button class="btn-secondary" @click="pb.showModal = false">Batal</button>
            <button class="btn-primary" @click="savePb">Simpan</button>
          </template>
        </Modal>
      </div>

      <!-- Admin -->
      <div v-if="activeTab === 'admin'">
        <div class="toolbar filter-toolbar">
          <div class="filter-disclosure">
            <input id="filter-admin" class="filter-toggle-control" type="checkbox" />
            <label for="filter-admin" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
            <div class="filter-fields">
              <input type="text" v-model="ad.search" @input="onAdFilter" placeholder="Cari nama, username, email..." style="width:260px" />
            </div>
          </div>
          <div class="spacer"></div>
          <button class="btn-primary" @click="openAdCreate">+ Tambah Admin</button>
        </div>
        <DataTable :columns="ad.columns" :rows="ad.rows" :loading="ad.loading">
          <template #cell-status="{ row }"><span class="badge" :class="row.status === 'aktif' ? 'badge-success' : 'badge-muted'">{{ row.status }}</span></template>
          <template #actions="{ row }">
            <button class="btn-secondary btn-sm" @click="openAdEdit(row)">Edit</button>
            <button class="btn-danger btn-sm" @click="removeAd(row)">Hapus</button>
          </template>
        </DataTable>
        <Pagination :total="ad.total" :page="ad.page" :limit="ad.limit" @update:page="adPage" />

        <Modal :show="ad.showModal" :title="ad.form.id ? 'Edit Admin' : 'Tambah Admin'" @close="ad.showModal = false">
          <form @submit.prevent="saveAd">
            <div class="field-row">
              <div class="field"><label>Nama</label><input v-model="ad.form.nama" required style="width:100%" /></div>
              <div class="field"><label>Username</label><input v-model="ad.form.username" required style="width:100%" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Email</label><input v-model="ad.form.email" style="width:100%" /></div>
              <div class="field"><label>{{ ad.form.id ? 'Password (kosongkan jika tidak diubah)' : 'Password' }}</label>
                <input v-model="ad.form.password" type="password" :required="!ad.form.id" style="width:100%" /></div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Role</label>
                <select v-model.number="ad.form.role_id" required style="width:100%">
                  <option value="">- Pilih Role -</option>
                  <option v-for="r in ad.roles" :key="r.id" :value="r.id">{{ r.nama_role }}</option>
                </select>
              </div>
              <div class="field">
                <label>Status</label>
                <select v-model="ad.form.status" style="width:100%">
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <p v-if="ad.error" class="error-text">{{ ad.error }}</p>
          </form>
          <template #footer>
            <button class="btn-secondary" @click="ad.showModal = false">Batal</button>
            <button class="btn-primary" @click="saveAd">Simpan</button>
          </template>
        </Modal>
      </div>

      <!-- Role & Menu Access -->
      <div v-if="activeTab === 'role'">
        <div class="toolbar">
          <div class="spacer"></div>
          <button class="btn-primary" @click="openRoleCreate">+ Tambah Role</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>Akses Menu</th><th></th></tr></thead>
            <tbody>
              <tr v-if="role.rows.length === 0"><td colspan="3" class="empty-state">Tidak ada data.</td></tr>
              <tr v-for="r in role.rows" :key="r.id">
                <td>{{ r.nama_role }}</td>
                <td>
                  <span v-for="m in r.menu_access" :key="m" class="badge badge-muted" style="margin-right:4px">{{ m }}</span>
                </td>
                <td class="text-right">
                  <button class="btn-secondary btn-sm" @click="openRoleEdit(r)">Edit</button>
                  <button class="btn-danger btn-sm" @click="removeRole(r)">Hapus</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Modal :show="role.showModal" :title="role.form.id ? 'Edit Role' : 'Tambah Role'" @close="role.showModal = false">
          <form @submit.prevent="saveRole">
            <div class="field"><label>Nama Role</label><input v-model="role.form.nama_role" required style="width:100%" /></div>
            <div class="field">
              <label>Akses Menu</label>
              <div v-for="m in role.availableMenus" :key="m" style="margin-bottom:6px">
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:0.88rem;color:var(--text)">
                  <input type="checkbox" :checked="role.form.menu_access.includes(m)" @change="toggleMenu(m)" />
                  {{ m }}
                </label>
              </div>
            </div>
            <p v-if="role.error" class="error-text">{{ role.error }}</p>
          </form>
          <template #footer>
            <button class="btn-secondary" @click="role.showModal = false">Batal</button>
            <button class="btn-primary" @click="saveRole">Simpan</button>
          </template>
        </Modal>
      </div>
    </div>
  `,
};
