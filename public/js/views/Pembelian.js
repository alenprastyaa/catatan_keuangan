import { api } from '../api.js';
import { rupiah, todayStr, tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';
import { printThermalInvoice } from '../thermalPrint.js?v=20260818-4';

const STATUS_BADGE = { lunas: 'badge-success', hutang: 'badge-danger', sebagian: 'badge-warning' };

const emptyForm = () => ({
  id: null, supplier_id: '', tanggal: todayStr(), jatuh_tempo: '', catatan: '',
  bayar_awal: 0, buat_nota: false, input_type: 'qty', waktu_volume: 'pagi', volume_pagi: 0, volume_sore: 0,
  potongan_items: [{ keterangan: '', jumlah: 0 }],
  kualitas_f: '', kualitas_s: '', kualitas_p: '', kualitas_ts: '', kualitas_ph: '', kualitas_w: '',
  items: [{ produk_id: '', qty: 1, harga_satuan: 0 }],
});

const emptySupplierForm = () => ({ nama: '', tipe: 'supplier', telepon: '', alamat: '', email: '' });

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, page: 1, limit: 20,
      search: '', status: '', start: '', end: '',
      loading: false, searchTimer: null,
      supplierList: [], produkList: [],
      showFormModal: false, form: emptyForm(), error: '',
      editDetail: null, editPayForm: { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' },
      showSupplierModal: false, supplierForm: emptySupplierForm(), supplierError: '',
      showDetailModal: false, detail: null,
      columns: [
        { key: 'no_transaksi', label: 'No. Transaksi' },
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'supplier_nama', label: 'Supplier' },
        { key: 'total_qty', label: 'Qty', align: 'right' },
        { key: 'volume_liter', label: 'Volume', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'sudah_bayar', label: 'Terbayar', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
    };
  },
  computed: {
    formTotal() {
      return Math.max(0, this.form.items.reduce((s, it) => s + this.itemTotal(it), 0) - this.formPotongan);
    },
    formPotongan() {
      return (this.form.potongan_items || []).reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
    },
    formVolume() {
      if (this.form.input_type !== 'volume') return 0;
      return this.form.items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    },
  },
  mounted() {
    if (this.$route.query.status) this.status = this.$route.query.status;
    this.load();
    this.loadOptions();
  },
  methods: {
    rupiah, tanggalIndo,
    statusBadge(s) { return STATUS_BADGE[s] || 'badge-muted'; },
    async loadOptions() {
      const [s, p] = await Promise.all([
        api.get('/manajemen-user/pelanggan-supplier?limit=500'),
        api.get('/produk?limit=1000'),
      ]);
      this.supplierList = s.data.filter((x) => x.tipe !== 'pelanggan');
      this.produkList = p.data;
    },
    async load() {
      this.loading = true;
      const params = new URLSearchParams({
        search: this.search, status: this.status, start: this.start, end: this.end,
        page: this.page, limit: this.limit,
      });
      const res = await api.get('/pembelian?' + params.toString());
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
      this.editDetail = null;
      this.error = '';
      this.showFormModal = true;
    },
    async openEdit(row) {
      const d = await api.get('/pembelian/' + row.id);
      this.form = {
        id: d.id, supplier_id: d.supplier_id || '', tanggal: d.tanggal, jatuh_tempo: d.jatuh_tempo || '',
        catatan: d.catatan || '', bayar_awal: 0,
        input_type: Number(d.volume_pagi || 0) + Number(d.volume_sore || 0) > 0 ? 'volume' : 'qty',
        waktu_volume: Number(d.volume_sore || 0) > 0 ? 'sore' : 'pagi',
        volume_pagi: Number(d.volume_pagi || 0), volume_sore: Number(d.volume_sore || 0),
        potongan_items: d.potongan_items?.length
          ? d.potongan_items.map((item) => ({ keterangan: item.keterangan, jumlah: Number(item.jumlah) }))
          : [{ keterangan: '', jumlah: 0 }],
        kualitas_f: d.kualitas_f ?? '', kualitas_s: d.kualitas_s ?? '',
        kualitas_p: d.kualitas_p ?? '', kualitas_ts: d.kualitas_ts ?? '', kualitas_ph: d.kualitas_ph ?? '', kualitas_w: d.kualitas_w ?? '',
        items: d.items.map((it) => ({ produk_id: it.produk_id, qty: it.qty, harga_satuan: it.harga_satuan })),
      };
      this.editDetail = d;
      this.editPayForm = { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' };
      this.error = '';
      this.showFormModal = true;
    },
    editSudahBayar() {
      if (!this.editDetail) return 0;
      return this.editDetail.pembayaran.reduce((s, p) => s + Number(p.jumlah_bayar), 0);
    },
    editSisaBayar() {
      if (!this.editDetail) return 0;
      return Number(this.editDetail.total) - this.editSudahBayar();
    },
    async submitEditPembayaran() {
      if (!this.editPayForm.jumlah_bayar || this.editPayForm.jumlah_bayar <= 0) return;
      await api.post('/pembelian/' + this.form.id + '/pembayaran', this.editPayForm);
      this.editDetail = await api.get('/pembelian/' + this.form.id);
      this.editPayForm = { tanggal_bayar: todayStr(), jumlah_bayar: 0, keterangan: '' };
      this.load();
    },
    addItemRow() {
      this.form.items.push({ produk_id: '', qty: 1, harga_satuan: 0 });
    },
    removeItemRow(idx) {
      this.form.items.splice(idx, 1);
    },
    addPotonganRow() {
      this.form.potongan_items.push({ keterangan: '', jumlah: 0 });
    },
    removePotonganRow(index) {
      if (this.form.potongan_items.length === 1) {
        this.form.potongan_items[0] = { keterangan: '', jumlah: 0 };
        return;
      }
      this.form.potongan_items.splice(index, 1);
    },
    onProdukChange(item) {
      const p = this.produkList.find((x) => x.id === Number(item.produk_id));
      if (p) item.harga_satuan = p.harga_beli;
    },
    itemTotal(item) { return Number(item.qty || 0) * Number(item.harga_satuan || 0); },
    openSupplierModal() {
      this.supplierForm = emptySupplierForm();
      this.supplierError = '';
      this.showSupplierModal = true;
    },
    async saveSupplier() {
      this.supplierError = '';
      if (!this.supplierForm.nama) { this.supplierError = 'Nama wajib diisi.'; return; }
      try {
        const res = await api.post('/manajemen-user/pelanggan-supplier', this.supplierForm);
        await this.loadOptions();
        this.form.supplier_id = res.id;
        this.showSupplierModal = false;
      } catch (err) {
        this.supplierError = err.message;
      }
    },
    async save() {
      this.error = '';
      const items = this.form.items.filter((it) => it.produk_id && it.qty > 0);
      if (items.length === 0) { this.error = 'Minimal satu item produk wajib diisi.'; return; }
      try {
        const volume = this.form.input_type === 'volume' ? items.reduce((sum, it) => sum + Number(it.qty || 0), 0) : 0;
        const payload = {
          ...this.form, items,
          potongan: this.formPotongan,
          volume_pagi: this.form.input_type === 'volume' && this.form.waktu_volume === 'pagi' ? volume : 0,
          volume_sore: this.form.input_type === 'volume' && this.form.waktu_volume === 'sore' ? volume : 0,
        };
        if (this.form.id) {
          await api.put('/pembelian/' + this.form.id, payload);
        } else {
          await api.post('/pembelian', payload);
        }
        this.showFormModal = false;
        this.load();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm(`Hapus transaksi ${row.no_transaksi}?`)) return;
      await api.delete('/pembelian/' + row.id);
      this.load();
    },
    async openDetail(row) {
      this.detail = await api.get('/pembelian/' + row.id);
      this.showDetailModal = true;
    },
    sisaBayar() {
      if (!this.detail) return 0;
      const bayar = this.detail.pembayaran.reduce((s, p) => s + Number(p.jumlah_bayar), 0);
      return Number(this.detail.total) - bayar;
    },
    printThermal() {
      if (!this.detail) return;
      printThermalInvoice({
        tipe: 'pembelian',
        no_invoice: this.detail.no_transaksi,
        tanggal: this.detail.tanggal,
        jatuh_tempo: this.detail.jatuh_tempo,
        keterangan: this.detail.catatan,
        transaksi: {
          ...this.detail,
          pihak_nama: this.detail.supplier_nama,
        },
        items: this.detail.items,
        pembayaran: this.detail.pembayaran,
      });
    },
  },
  template: `
    <div>
      <div class="toolbar filter-toolbar">
        <div class="filter-disclosure">
          <input id="filter-pembelian" class="filter-toggle-control" type="checkbox" />
          <label for="filter-pembelian" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
          <div class="filter-fields">
            <input type="text" v-model="search" @input="onFilterChange" placeholder="Cari no. transaksi / supplier..." style="width:240px" />
            <select v-model="status" @change="onFilterChange">
              <option value="">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="hutang">Hutang</option>
              <option value="sebagian">Sebagian</option>
            </select>
            <input type="date" v-model="start" @change="onFilterChange" />
            <span class="text-muted filter-separator">s/d</span>
            <input type="date" v-model="end" @change="onFilterChange" />
          </div>
        </div>
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Tambah Pembelian</button>
      </div>

      <DataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-tanggal="{ row }">{{ tanggalIndo(row.tanggal) }}</template>
        <template #cell-total="{ row }">{{ rupiah(row.total) }}</template>
        <template #cell-volume_liter="{ row }">{{ Number(row.volume_pagi || 0) + Number(row.volume_sore || 0) }} L</template>
        <template #cell-sudah_bayar="{ row }">{{ rupiah(row.sudah_bayar) }}</template>
        <template #cell-status="{ row }"><span class="badge" :class="statusBadge(row.status)">{{ row.status }}</span></template>
        <template #actions="{ row }">
          <button class="btn-secondary btn-sm" @click="openDetail(row)">Detail</button>
          <button class="btn-secondary btn-sm" @click="openEdit(row)">Edit</button>
          <button class="btn-danger btn-sm" @click="remove(row)">Hapus</button>
        </template>
      </DataTable>
      <Pagination :total="total" :page="page" :limit="limit" @update:page="changePage" />

      <Modal :show="showFormModal" size="lg" :title="form.id ? 'Edit Pembelian' : 'Tambah Pembelian'" @close="showFormModal = false">
        <form @submit.prevent="save">
          <div class="field-row">
            <div class="field">
              <label>Supplier</label>
              <div style="display:flex;gap:6px">
                <select v-model="form.supplier_id" style="flex:1;min-width:0">
                  <option value="">- Pilih Supplier -</option>
                  <option v-for="s in supplierList" :key="s.id" :value="s.id">{{ s.nama }}</option>
                </select>
                <button type="button" class="btn-secondary btn-sm" @click="openSupplierModal">+ Baru</button>
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
            <div v-if="!form.id" class="field">
              <label>Bayar Awal</label>
              <input type="number" min="0" v-model.number="form.bayar_awal" style="width:100%" />
            </div>
          </div>
          <div class="purchase-extra-grid">
            <div class="purchase-extra-card">
              <div class="purchase-extra-icon note">✎</div>
              <div class="field">
                <label>Catatan Transaksi</label>
                <textarea v-model="form.catatan" rows="3" maxlength="1000" placeholder="Contoh: Kondisi susu, jadwal pengambilan, atau informasi tambahan" style="width:100%"></textarea>
              </div>
            </div>
            <div class="purchase-extra-card">
              <div class="purchase-extra-icon deduction">−</div>
              <div class="field">
                <label>Rincian Potongan</label>
                <div v-for="(item, index) in form.potongan_items" :key="index" class="deduction-item-row">
                  <input v-model="item.keterangan" maxlength="150" placeholder="Keterangan potongan" />
                  <input type="number" min="0" v-model.number="item.jumlah" placeholder="Jumlah (Rp)" />
                  <button type="button" class="btn-danger btn-sm" title="Hapus potongan" @click="removePotonganRow(index)">&times;</button>
                </div>
                <div class="deduction-footer"><button type="button" class="btn-secondary btn-sm" @click="addPotonganRow">+ Tambah Potongan</button><strong>{{ rupiah(formPotongan) }}</strong></div>
                <small class="text-muted">Total seluruh potongan akan mengurangi nilai transaksi.</small>
              </div>
            </div>
          </div>

          <div class="milk-data-card">
            <div class="milk-data-title"><strong>Data Kualitas Susu</strong></div>
            <div class="quality-grid">
              <div v-for="key in ['f','s','p','ts','ph','w']" :key="key" class="field"><label>{{ key.toUpperCase() }}</label><input type="number" step="0.01" v-model.number="form['kualitas_' + key]" /></div>
            </div>
          </div>

          <div v-if="form.id && editDetail" class="field" style="background:var(--bg-soft,#f6f6f8);border-radius:8px;padding:10px 12px;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <strong>Status Pembayaran</strong>
              <span class="badge" :class="statusBadge(editDetail.status)">{{ editDetail.status }}</span>
            </div>
            <p style="margin:0 0 8px">Total: {{ rupiah(editDetail.total) }} &nbsp;|&nbsp; Sudah Dibayar: {{ rupiah(editSudahBayar()) }} &nbsp;|&nbsp; Sisa: <strong>{{ rupiah(editSisaBayar()) }}</strong></p>
            <div v-if="editDetail.status !== 'lunas'" class="field-row" style="align-items:flex-end;margin:0">
              <div class="field">
                <label>Tanggal Bayar</label>
                <input type="date" v-model="editPayForm.tanggal_bayar" style="width:100%" />
              </div>
              <div class="field">
                <label>Jumlah Bayar</label>
                <input type="number" min="0" v-model.number="editPayForm.jumlah_bayar" style="width:100%" />
              </div>
              <div class="field">
                <button type="button" class="btn-primary" @click="submitEditPembayaran">Catat Pembayaran</button>
              </div>
            </div>
          </div>

          <div class="field">
            <label>Item Produk</label>
            <div class="transaction-input-switch">
              <label :class="{ active: form.input_type === 'qty' }"><input type="radio" value="qty" v-model="form.input_type" /> Qty</label>
              <label :class="{ active: form.input_type === 'volume' }"><input type="radio" value="volume" v-model="form.input_type" /> Volume (Liter)</label>
              <select v-if="form.input_type === 'volume'" v-model="form.waktu_volume"><option value="pagi">Pagi</option><option value="sore">Sore</option></select>
            </div>
            <div class="table-wrap product-items-wrap" style="margin-bottom:8px">
              <table class="product-items-table">
                <thead><tr><th>Produk</th><th style="width:120px">{{ form.input_type === 'volume' ? 'Volume (L)' : 'Qty' }}</th><th style="width:160px">Harga</th><th style="width:140px" class="text-right">Subtotal</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(it, idx) in form.items" :key="idx">
                    <td data-label="Produk">
                      <select v-model.number="it.produk_id" @change="onProdukChange(it)" style="width:100%">
                        <option value="">- Pilih -</option>
                        <option v-for="p in produkList" :key="p.id" :value="p.id">{{ p.nama_produk }}</option>
                      </select>
                    </td>
                    <td :data-label="form.input_type === 'volume' ? 'Volume (L)' : 'Qty'"><input type="number" min="0.01" :step="form.input_type === 'volume' ? '0.01' : '1'" v-model.number="it.qty" style="width:100%;padding:10px 8px" /></td>
                    <td data-label="Harga"><input type="number" min="0" v-model.number="it.harga_satuan" style="width:100%;padding:10px 8px" /></td>
                    <td data-label="Subtotal" class="text-right product-item-subtotal">{{ rupiah(itemTotal(it)) }}</td>
                    <td class="product-item-action"><button type="button" class="btn-danger btn-sm" @click="removeItemRow(idx)">&times;</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="btn-secondary btn-sm" @click="addItemRow">+ Tambah Item</button>
          </div>

          <div v-if="!form.id" class="field" style="margin-top:10px">
            <label style="display:inline-flex;align-items:center;gap:8px;font-size:0.86rem;color:var(--text);cursor:pointer">
              <input type="checkbox" v-model="form.buat_nota" style="box-shadow:none" />
              Buat nota pembayaran otomatis untuk transaksi ini
            </label>
          </div>

          <p style="text-align:right;font-weight:600;margin-top:12px">Volume: {{ formVolume }} L &nbsp;|&nbsp; Total setelah potongan: {{ rupiah(formTotal) }}</p>
          <p v-if="error" class="error-text">{{ error }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showFormModal = false">Batal</button>
          <button class="btn-primary" @click="save">Simpan</button>
        </template>
      </Modal>

      <Modal :show="showSupplierModal" title="Tambah Supplier Baru" @close="showSupplierModal = false">
        <form @submit.prevent="saveSupplier">
          <div class="field"><label>Nama</label><input v-model="supplierForm.nama" required style="width:100%" /></div>
          <div class="field">
            <label>Tipe</label>
            <select v-model="supplierForm.tipe" style="width:100%">
              <option value="supplier">Supplier</option>
              <option value="pelanggan">Pelanggan</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field"><label>Telepon</label><input v-model="supplierForm.telepon" style="width:100%" /></div>
            <div class="field"><label>Email</label><input v-model="supplierForm.email" style="width:100%" /></div>
          </div>
          <div class="field"><label>Alamat</label><input v-model="supplierForm.alamat" style="width:100%" /></div>
          <p v-if="supplierError" class="error-text">{{ supplierError }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showSupplierModal = false">Batal</button>
          <button class="btn-primary" @click="saveSupplier">Simpan</button>
        </template>
      </Modal>

      <Modal :show="showDetailModal" size="lg" title="Detail Pembelian" @close="showDetailModal = false">
        <div v-if="detail">
          <p><strong>{{ detail.no_transaksi }}</strong> &mdash; {{ detail.supplier_nama || '-' }} &mdash; {{ tanggalIndo(detail.tanggal) }}
            <span class="badge" :class="statusBadge(detail.status)">{{ detail.status }}</span></p>
          <div class="transaction-metrics">
            <span><b>Volume:</b> {{ Number(detail.volume_pagi || 0) + Number(detail.volume_sore || 0) }} L (Pagi {{ detail.volume_pagi || 0 }} / Sore {{ detail.volume_sore || 0 }})</span>
            <span><b>Kualitas:</b> F {{ detail.kualitas_f ?? '-' }} · S {{ detail.kualitas_s ?? '-' }} · P {{ detail.kualitas_p ?? '-' }} · TS {{ detail.kualitas_ts ?? '-' }} · PH {{ detail.kualitas_ph ?? '-' }} · W {{ detail.kualitas_w ?? '-' }}</span>
          </div>
          <div v-if="detail.potongan_items?.length" class="detail-deduction-list">
            <strong>Rincian Potongan</strong>
            <div v-for="item in detail.potongan_items" :key="item.id" class="detail-deduction-row"><span>{{ item.keterangan }}</span><span>-{{ rupiah(item.jumlah) }}</span></div>
          </div>

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
          <p v-if="detail.status !== 'lunas'" class="text-muted" style="text-align:right;font-size:0.85rem">Gunakan tombol "Edit" untuk mencatat pembayaran.</p>
          <div class="detail-print-actions">
            <button type="button" class="btn-primary" @click="printThermal">Cetak Thermal 80mm</button>
          </div>
        </div>
      </Modal>
    </div>
  `,
};
