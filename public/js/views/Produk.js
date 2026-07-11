import { api } from '../api.js';
import { rupiah } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';

const emptyForm = () => ({
  id: null, kode_produk: '', nama_produk: '', kategori: '', satuan: 'pcs',
  harga_beli: 0, harga_jual: 0, stok: 0, stok_minimum: 0,
});

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, page: 1, limit: 20, search: '',
      loading: false, showModal: false, form: emptyForm(), error: '',
      searchTimer: null,
      columns: [
        { key: 'kode_produk', label: 'Kode' },
        { key: 'nama_produk', label: 'Nama Produk' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'harga_beli', label: 'Harga Beli', align: 'right' },
        { key: 'harga_jual', label: 'Harga Jual', align: 'right' },
        { key: 'stok', label: 'Stok', align: 'right' },
      ],
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    rupiah,
    async load() {
      this.loading = true;
      const params = new URLSearchParams({ search: this.search, page: this.page, limit: this.limit });
      const res = await api.get('/produk?' + params.toString());
      this.rows = res.data;
      this.total = res.total;
      this.loading = false;
    },
    onSearch() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 350);
    },
    changePage(p) {
      this.page = p;
      this.load();
    },
    openCreate() {
      this.form = emptyForm();
      this.error = '';
      this.showModal = true;
    },
    openEdit(row) {
      this.form = { ...row };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      this.error = '';
      try {
        if (this.form.id) {
          await api.put('/produk/' + this.form.id, this.form);
        } else {
          await api.post('/produk', this.form);
        }
        this.showModal = false;
        this.load();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm(`Hapus produk "${row.nama_produk}"?`)) return;
      await api.delete('/produk/' + row.id);
      this.load();
    },
  },
  template: `
    <div>
      <div class="toolbar">
        <input type="text" v-model="search" @input="onSearch" placeholder="Cari kode, nama, kategori..." style="width:280px" />
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Tambah Produk</button>
      </div>

      <DataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-harga_beli="{ row }">{{ rupiah(row.harga_beli) }}</template>
        <template #cell-harga_jual="{ row }">{{ rupiah(row.harga_jual) }}</template>
        <template #cell-stok="{ row }">
          <span :class="row.stok <= row.stok_minimum ? 'badge badge-danger' : ''">{{ row.stok }} {{ row.satuan }}</span>
        </template>
        <template #actions="{ row }">
          <button class="btn-secondary btn-sm" @click="openEdit(row)">Edit</button>
          <button class="btn-danger btn-sm" @click="remove(row)">Hapus</button>
        </template>
      </DataTable>
      <Pagination :total="total" :page="page" :limit="limit" @update:page="changePage" />

      <Modal :show="showModal" :title="form.id ? 'Edit Produk' : 'Tambah Produk'" @close="showModal = false">
        <form @submit.prevent="save">
          <div class="field-row">
            <div class="field">
              <label>Kode Produk</label>
              <input v-model="form.kode_produk" required style="width:100%" />
            </div>
            <div class="field">
              <label>Satuan</label>
              <input v-model="form.satuan" style="width:100%" />
            </div>
          </div>
          <div class="field">
            <label>Nama Produk</label>
            <input v-model="form.nama_produk" required style="width:100%" />
          </div>
          <div class="field">
            <label>Kategori</label>
            <input v-model="form.kategori" style="width:100%" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Harga Beli</label>
              <input v-model.number="form.harga_beli" type="number" min="0" style="width:100%" />
            </div>
            <div class="field">
              <label>Harga Jual</label>
              <input v-model.number="form.harga_jual" type="number" min="0" style="width:100%" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Stok</label>
              <input v-model.number="form.stok" type="number" min="0" style="width:100%" />
            </div>
            <div class="field">
              <label>Stok Minimum</label>
              <input v-model.number="form.stok_minimum" type="number" min="0" style="width:100%" />
            </div>
          </div>
          <p v-if="error" class="error-text">{{ error }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showModal = false">Batal</button>
          <button class="btn-primary" @click="save">Simpan</button>
        </template>
      </Modal>
    </div>
  `,
};
