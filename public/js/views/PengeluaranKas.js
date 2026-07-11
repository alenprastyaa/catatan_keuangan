import { api } from '../api.js';
import { rupiah, todayStr, tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';

const emptyForm = () => ({ id: null, tanggal: todayStr(), tipe: '', keterangan: '', jumlah: 0 });

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, page: 1, limit: 20,
      search: '', tipe: '', start: '', end: '',
      loading: false, searchTimer: null,
      showModal: false, form: emptyForm(), error: '',
      columns: [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'tipe', label: 'Tipe' },
        { key: 'keterangan', label: 'Keterangan' },
        { key: 'jumlah', label: 'Jumlah', align: 'right' },
      ],
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    rupiah, tanggalIndo,
    async load() {
      this.loading = true;
      const params = new URLSearchParams({
        search: this.search, tipe: this.tipe, start: this.start, end: this.end,
        page: this.page, limit: this.limit,
      });
      const res = await api.get('/pengeluaran-kas?' + params.toString());
      this.rows = res.data;
      this.total = res.total;
      this.loading = false;
    },
    onFilterChange() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
    },
    changePage(p) { this.page = p; this.load(); },
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
          await api.put('/pengeluaran-kas/' + this.form.id, this.form);
        } else {
          await api.post('/pengeluaran-kas', this.form);
        }
        this.showModal = false;
        this.load();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm('Hapus data pengeluaran ini?')) return;
      await api.delete('/pengeluaran-kas/' + row.id);
      this.load();
    },
  },
  template: `
    <div>
      <div class="toolbar">
        <input type="text" v-model="search" @input="onFilterChange" placeholder="Cari keterangan / tipe..." style="width:240px" />
        <input type="text" v-model="tipe" @input="onFilterChange" placeholder="Filter tipe..." style="width:160px" />
        <input type="date" v-model="start" @change="onFilterChange" />
        <span class="text-muted">s/d</span>
        <input type="date" v-model="end" @change="onFilterChange" />
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Tambah Pengeluaran</button>
      </div>

      <DataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-tanggal="{ row }">{{ tanggalIndo(row.tanggal) }}</template>
        <template #cell-jumlah="{ row }">{{ rupiah(row.jumlah) }}</template>
        <template #actions="{ row }">
          <button class="btn-secondary btn-sm" @click="openEdit(row)">Edit</button>
          <button class="btn-danger btn-sm" @click="remove(row)">Hapus</button>
        </template>
      </DataTable>
      <Pagination :total="total" :page="page" :limit="limit" @update:page="changePage" />

      <Modal :show="showModal" :title="form.id ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'" @close="showModal = false">
        <form @submit.prevent="save">
          <div class="field-row">
            <div class="field">
              <label>Tanggal</label>
              <input type="date" v-model="form.tanggal" required style="width:100%" />
            </div>
            <div class="field">
              <label>Tipe</label>
              <input v-model="form.tipe" required placeholder="mis. Operasional, Gaji, Sewa" style="width:100%" />
            </div>
          </div>
          <div class="field">
            <label>Keterangan</label>
            <input v-model="form.keterangan" style="width:100%" />
          </div>
          <div class="field">
            <label>Jumlah</label>
            <input type="number" min="0" v-model.number="form.jumlah" required style="width:100%" />
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
