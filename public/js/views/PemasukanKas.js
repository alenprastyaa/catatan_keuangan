import { api } from '../api.js';
import { rupiah, todayStr, tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';

const emptyForm = () => ({ id: null, tanggal: todayStr(), tipe: '', keterangan: '', jumlah: 0 });

// Tipe umum agar pencatatan konsisten, tetapi tetap bisa diisi bebas.
const TIPE_UMUM = ['Modal Pemilik', 'Pinjaman', 'Setoran Tunai', 'Pendapatan Lain', 'Pengembalian Dana'];

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, totalJumlah: 0, page: 1, limit: 20,
      search: '', tipe: '', start: '', end: '',
      loading: false, searchTimer: null,
      showModal: false, form: emptyForm(), error: '',
      saldoAwal: { jumlah: 0, tanggal: null },
      showSaldoModal: false, saldoForm: { jumlah: 0, tanggal: '' }, saldoError: '',
      tipeUmum: TIPE_UMUM,
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
    this.loadSaldoAwal();
  },
  methods: {
    rupiah, tanggalIndo,
    async load() {
      this.loading = true;
      const params = new URLSearchParams({
        search: this.search, tipe: this.tipe, start: this.start, end: this.end,
        page: this.page, limit: this.limit,
      });
      const res = await api.get('/pemasukan-kas?' + params.toString());
      this.rows = res.data;
      this.total = res.total;
      this.totalJumlah = res.total_jumlah;
      this.loading = false;
    },
    async loadSaldoAwal() {
      this.saldoAwal = await api.get('/pemasukan-kas/saldo-awal');
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
          await api.put('/pemasukan-kas/' + this.form.id, this.form);
        } else {
          await api.post('/pemasukan-kas', this.form);
        }
        this.showModal = false;
        this.load();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm('Hapus data pemasukan ini?')) return;
      await api.delete('/pemasukan-kas/' + row.id);
      this.load();
    },
    openSaldoAwal() {
      this.saldoForm = { jumlah: Number(this.saldoAwal.jumlah || 0), tanggal: this.saldoAwal.tanggal || '' };
      this.saldoError = '';
      this.showSaldoModal = true;
    },
    async saveSaldoAwal() {
      this.saldoError = '';
      try {
        await api.put('/pemasukan-kas/saldo-awal', this.saldoForm);
        this.showSaldoModal = false;
        this.loadSaldoAwal();
      } catch (err) {
        this.saldoError = err.message;
      }
    },
  },
  template: `
    <div>
      <div class="summary-grid" style="margin-bottom:16px">
        <div class="card summary-card">
          <div class="label">Saldo Awal Kas</div>
          <div class="value">{{ rupiah(saldoAwal.jumlah) }}</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px">
            <span v-if="saldoAwal.tanggal">Per {{ tanggalIndo(saldoAwal.tanggal) }}</span>
            <span v-else>Belum diatur</span>
          </div>
          <button class="btn-secondary btn-sm" style="margin-top:10px" @click="openSaldoAwal">Atur Saldo Awal</button>
        </div>
        <div class="card summary-card">
          <div class="label">Total Pemasukan (hasil filter)</div>
          <div class="value">{{ rupiah(totalJumlah) }}</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px">{{ total }} transaksi</div>
        </div>
      </div>

      <div class="toolbar filter-toolbar">
        <div class="filter-disclosure">
          <input id="filter-pemasukan" class="filter-toggle-control" type="checkbox" />
          <label for="filter-pemasukan" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
          <div class="filter-fields">
            <input type="text" v-model="search" @input="onFilterChange" placeholder="Cari keterangan / tipe..." style="width:240px" />
            <input type="text" v-model="tipe" @input="onFilterChange" placeholder="Filter tipe..." style="width:160px" />
            <input type="date" v-model="start" @change="onFilterChange" />
            <span class="text-muted filter-separator">s/d</span>
            <input type="date" v-model="end" @change="onFilterChange" />
          </div>
        </div>
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Tambah Pemasukan</button>
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

      <Modal :show="showModal" :title="form.id ? 'Edit Pemasukan' : 'Tambah Pemasukan'" @close="showModal = false">
        <form @submit.prevent="save">
          <div class="field-row">
            <div class="field">
              <label>Tanggal</label>
              <input type="date" v-model="form.tanggal" required style="width:100%" />
            </div>
            <div class="field">
              <label>Tipe</label>
              <input v-model="form.tipe" required list="tipe-pemasukan" placeholder="mis. Modal Pemilik, Pinjaman" style="width:100%" />
              <datalist id="tipe-pemasukan">
                <option v-for="t in tipeUmum" :key="t" :value="t"></option>
              </datalist>
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

      <Modal :show="showSaldoModal" title="Atur Saldo Awal Kas" @close="showSaldoModal = false">
        <form @submit.prevent="saveSaldoAwal">
          <p class="text-muted" style="font-size:13px;margin-top:0">
            Uang kas yang sudah dipegang usaha sebelum pencatatan di aplikasi ini dimulai.
            Nilai ini ditambahkan ke perhitungan Kas Terkini di dashboard.
          </p>
          <div class="field">
            <label>Jumlah Saldo Awal</label>
            <input type="number" v-model.number="saldoForm.jumlah" required style="width:100%" />
          </div>
          <div class="field">
            <label>Terhitung Sejak Tanggal</label>
            <input type="date" v-model="saldoForm.tanggal" style="width:100%" />
          </div>
          <p v-if="saldoError" class="error-text">{{ saldoError }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showSaldoModal = false">Batal</button>
          <button class="btn-primary" @click="saveSaldoAwal">Simpan</button>
        </template>
      </Modal>
    </div>
  `,
};
