import { api } from '../api.js';
import { rupiah, todayStr, tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';

const STATUS_BADGE = { lunas: 'badge-success', piutang: 'badge-danger', sebagian: 'badge-warning' };

const emptyForm = () => ({
  id: null, pembeli_id: '', tanggal: todayStr(), jatuh_tempo: '', catatan: '',
  bayar_awal: 0, buat_nota: false, items: [{ produk_id: '', qty: 1, harga_satuan: 0 }],
});

const emptyPembeliForm = () => ({ nama: '', telepon: '', alamat: '' });

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, page: 1, limit: 20,
      search: '', status: '', start: '', end: '',
      loading: false, searchTimer: null,
      pembeliList: [], produkList: [],
      showFormModal: false, form: emptyForm(), error: '',
      showPembeliModal: false, pembeliForm: emptyPembeliForm(), pembeliError: '',
      showDetailModal: false, detail: null, payForm: { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' },
      columns: [
        { key: 'no_transaksi', label: 'No. Transaksi' },
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'pembeli_nama', label: 'Pembeli' },
        { key: 'total_qty', label: 'Qty', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'sudah_bayar', label: 'Terbayar', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
    };
  },
  computed: {
    formTotal() {
      return this.form.items.reduce((s, it) => s + this.itemTotal(it), 0);
    },
  },
  mounted() {
    this.load();
    this.loadOptions();
  },
  methods: {
    rupiah, tanggalIndo,
    statusBadge(s) { return STATUS_BADGE[s] || 'badge-muted'; },
    async loadOptions() {
      const [b, p] = await Promise.all([
        api.get('/manajemen-user/pembeli?limit=500'),
        api.get('/produk?limit=1000'),
      ]);
      this.pembeliList = b.data;
      this.produkList = p.data;
    },
    async load() {
      this.loading = true;
      const params = new URLSearchParams({
        search: this.search, status: this.status, start: this.start, end: this.end,
        page: this.page, limit: this.limit,
      });
      const res = await api.get('/penjualan?' + params.toString());
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
      this.showFormModal = true;
    },
    async openEdit(row) {
      const d = await api.get('/penjualan/' + row.id);
      this.form = {
        id: d.id, pembeli_id: d.pembeli_id || '', tanggal: d.tanggal, jatuh_tempo: d.jatuh_tempo || '',
        catatan: d.catatan || '', bayar_awal: 0,
        items: d.items.map((it) => ({ produk_id: it.produk_id, qty: it.qty, harga_satuan: it.harga_satuan })),
      };
      this.error = '';
      this.showFormModal = true;
    },
    addItemRow() {
      this.form.items.push({ produk_id: '', qty: 1, harga_satuan: 0 });
    },
    removeItemRow(idx) {
      this.form.items.splice(idx, 1);
    },
    onProdukChange(item) {
      const p = this.produkList.find((x) => x.id === Number(item.produk_id));
      if (p) item.harga_satuan = p.harga_jual;
    },
    itemTotal(item) { return Number(item.qty || 0) * Number(item.harga_satuan || 0); },
    openPembeliModal() {
      this.pembeliForm = emptyPembeliForm();
      this.pembeliError = '';
      this.showPembeliModal = true;
    },
    async savePembeli() {
      this.pembeliError = '';
      if (!this.pembeliForm.nama) { this.pembeliError = 'Nama wajib diisi.'; return; }
      try {
        const res = await api.post('/manajemen-user/pembeli', this.pembeliForm);
        await this.loadOptions();
        this.form.pembeli_id = res.id;
        this.showPembeliModal = false;
      } catch (err) {
        this.pembeliError = err.message;
      }
    },
    async save() {
      this.error = '';
      const items = this.form.items.filter((it) => it.produk_id && it.qty > 0);
      if (items.length === 0) { this.error = 'Minimal satu item produk wajib diisi.'; return; }
      if (!this.form.id) {
        for (const it of items) {
          const p = this.produkList.find((x) => x.id === Number(it.produk_id));
          if (p && Number(it.qty) > Number(p.stok)) {
            this.error = `Stok "${p.nama_produk}" hanya tersisa ${p.stok} ${p.satuan}.`;
            return;
          }
        }
      }
      try {
        if (this.form.id) {
          await api.put('/penjualan/' + this.form.id, { ...this.form, items });
        } else {
          await api.post('/penjualan', { ...this.form, items });
        }
        this.showFormModal = false;
        this.load();
        this.loadOptions();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm(`Hapus transaksi ${row.no_transaksi}?`)) return;
      await api.delete('/penjualan/' + row.id);
      this.load();
    },
    async openDetail(row) {
      this.detail = await api.get('/penjualan/' + row.id);
      this.payForm = { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' };
      this.showDetailModal = true;
    },
    sisaBayar() {
      if (!this.detail) return 0;
      const bayar = this.detail.pembayaran.reduce((s, p) => s + Number(p.jumlah_bayar), 0);
      return Number(this.detail.total) - bayar;
    },
    async submitPembayaran() {
      if (!this.payForm.jumlah_bayar || this.payForm.jumlah_bayar <= 0) return;
      await api.post('/penjualan/' + this.detail.id + '/pembayaran', this.payForm);
      this.detail = await api.get('/penjualan/' + this.detail.id);
      this.payForm = { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' };
      this.load();
    },
  },
  template: `
    <div>
      <div class="toolbar">
        <input type="text" v-model="search" @input="onFilterChange" placeholder="Cari no. transaksi / pembeli..." style="width:240px" />
        <select v-model="status" @change="onFilterChange">
          <option value="">Semua Status</option>
          <option value="lunas">Lunas</option>
          <option value="piutang">Piutang</option>
          <option value="sebagian">Sebagian</option>
        </select>
        <input type="date" v-model="start" @change="onFilterChange" />
        <span class="text-muted">s/d</span>
        <input type="date" v-model="end" @change="onFilterChange" />
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Tambah Penjualan</button>
      </div>

      <DataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-tanggal="{ row }">{{ tanggalIndo(row.tanggal) }}</template>
        <template #cell-total="{ row }">{{ rupiah(row.total) }}</template>
        <template #cell-sudah_bayar="{ row }">{{ rupiah(row.sudah_bayar) }}</template>
        <template #cell-status="{ row }"><span class="badge" :class="statusBadge(row.status)">{{ row.status }}</span></template>
        <template #actions="{ row }">
          <button class="btn-secondary btn-sm" @click="openDetail(row)">Detail</button>
          <button class="btn-secondary btn-sm" @click="openEdit(row)">Edit</button>
          <button class="btn-danger btn-sm" @click="remove(row)">Hapus</button>
        </template>
      </DataTable>
      <Pagination :total="total" :page="page" :limit="limit" @update:page="changePage" />

      <Modal :show="showFormModal" size="lg" :title="form.id ? 'Edit Penjualan' : 'Tambah Penjualan'" @close="showFormModal = false">
        <form @submit.prevent="save">
          <div class="field-row">
            <div class="field">
              <label>Pembeli</label>
              <div style="display:flex;gap:6px">
                <select v-model="form.pembeli_id" style="flex:1;min-width:0">
                  <option value="">- Pilih Pembeli -</option>
                  <option v-for="b in pembeliList" :key="b.id" :value="b.id">{{ b.nama }}</option>
                </select>
                <button type="button" class="btn-secondary btn-sm" @click="openPembeliModal">+ Baru</button>
              </div>
            </div>
            <div class="field">
              <label>Tanggal</label>
              <input type="date" v-model="form.tanggal" required style="width:100%" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Jatuh Tempo</label>
              <input type="date" v-model="form.jatuh_tempo" style="width:100%" />
            </div>
            <div class="field">
              <label>Bayar Awal</label>
              <input type="number" min="0" v-model.number="form.bayar_awal" :disabled="!!form.id" style="width:100%" />
            </div>
          </div>
          <div class="field">
            <label>Catatan</label>
            <input v-model="form.catatan" style="width:100%" />
          </div>

          <div class="field">
            <label>Item Produk</label>
            <div class="table-wrap" style="margin-bottom:8px">
              <table>
                <thead><tr><th>Produk</th><th style="width:120px">Qty</th><th style="width:160px">Harga</th><th style="width:140px" class="text-right">Subtotal</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(it, idx) in form.items" :key="idx">
                    <td>
                      <select v-model.number="it.produk_id" @change="onProdukChange(it)" style="width:100%">
                        <option value="">- Pilih -</option>
                        <option v-for="p in produkList" :key="p.id" :value="p.id" :disabled="!form.id && Number(p.stok) <= 0">{{ p.nama_produk }} (stok: {{ p.stok }})</option>
                      </select>
                    </td>
                    <td><input type="number" min="1" v-model.number="it.qty" style="width:100%;padding:10px 8px" /></td>
                    <td><input type="number" min="0" v-model.number="it.harga_satuan" style="width:100%;padding:10px 8px" /></td>
                    <td class="text-right">{{ rupiah(itemTotal(it)) }}</td>
                    <td><button type="button" class="btn-danger btn-sm" @click="removeItemRow(idx)">&times;</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="btn-secondary btn-sm" @click="addItemRow">+ Tambah Item</button>
          </div>

          <div v-if="!form.id" class="field" style="margin-top:10px">
            <label style="display:inline-flex;align-items:center;gap:8px;font-size:0.86rem;color:var(--text);cursor:pointer">
              <input type="checkbox" v-model="form.buat_nota" style="box-shadow:none" />
              Buat nota/invoice otomatis untuk transaksi ini
            </label>
          </div>

          <p style="text-align:right;font-weight:600;margin-top:12px">Total: {{ rupiah(formTotal) }}</p>
          <p v-if="error" class="error-text">{{ error }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showFormModal = false">Batal</button>
          <button class="btn-primary" @click="save">Simpan</button>
        </template>
      </Modal>

      <Modal :show="showPembeliModal" title="Tambah Pembeli Baru" @close="showPembeliModal = false">
        <form @submit.prevent="savePembeli">
          <div class="field"><label>Nama</label><input v-model="pembeliForm.nama" required style="width:100%" /></div>
          <div class="field"><label>Telepon</label><input v-model="pembeliForm.telepon" style="width:100%" /></div>
          <div class="field"><label>Alamat</label><input v-model="pembeliForm.alamat" style="width:100%" /></div>
          <p v-if="pembeliError" class="error-text">{{ pembeliError }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showPembeliModal = false">Batal</button>
          <button class="btn-primary" @click="savePembeli">Simpan</button>
        </template>
      </Modal>

      <Modal :show="showDetailModal" size="lg" title="Detail Penjualan" @close="showDetailModal = false">
        <div v-if="detail">
          <p><strong>{{ detail.no_transaksi }}</strong> &mdash; {{ detail.pembeli_nama || '-' }} &mdash; {{ tanggalIndo(detail.tanggal) }}
            <span class="badge" :class="statusBadge(detail.status)">{{ detail.status }}</span></p>

          <div class="table-wrap" style="margin-bottom:14px">
            <table>
              <thead><tr><th>Produk</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="it in detail.items" :key="it.id">
                  <td>{{ it.nama_produk }}</td>
                  <td class="text-right">{{ it.qty }}</td>
                  <td class="text-right">{{ rupiah(it.harga_satuan) }}</td>
                  <td class="text-right">{{ rupiah(it.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p><strong>Riwayat Pembayaran</strong></p>
          <div class="table-wrap" style="margin-bottom:14px">
            <table>
              <thead><tr><th>Tanggal</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead>
              <tbody>
                <tr v-if="detail.pembayaran.length === 0"><td colspan="3" class="empty-state">Belum ada pembayaran.</td></tr>
                <tr v-for="p in detail.pembayaran" :key="p.id">
                  <td>{{ tanggalIndo(p.tanggal_bayar) }}</td>
                  <td class="text-right">{{ rupiah(p.jumlah_bayar) }}</td>
                  <td>{{ p.keterangan }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style="text-align:right">Total: {{ rupiah(detail.total) }} &nbsp;|&nbsp; Sisa: <strong>{{ rupiah(sisaBayar()) }}</strong></p>

          <div v-if="detail.status !== 'lunas'" class="field-row" style="align-items:flex-end">
            <div class="field">
              <label>Tanggal Bayar</label>
              <input type="date" v-model="payForm.tanggal_bayar" style="width:100%" />
            </div>
            <div class="field">
              <label>Jumlah Bayar</label>
              <input type="number" min="0" v-model.number="payForm.jumlah_bayar" style="width:100%" />
            </div>
            <div class="field" style="margin-bottom:14px">
              <button type="button" class="btn-primary" @click="submitPembayaran">Catat Pembayaran</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  `,
};
