import { api } from '../api.js';
import { rupiah, todayStr, tanggalIndo } from '../format.js';
import DataTable from '../components/DataTable.js';
import Pagination from '../components/Pagination.js';
import Modal from '../components/Modal.js';
import { downloadInvoicePdf } from '../invoicePdf.js?v=20260818-4';
import { printThermalInvoice } from '../thermalPrint.js?v=20260818-5';

const STATUS_BADGE = { paid: 'badge-success', unpaid: 'badge-warning', overdue: 'badge-danger' };

const emptyForm = () => ({
  no_invoice: 'INV-' + Date.now(), tipe: 'penjualan', referensi_id: '',
  tanggal: todayStr(), jatuh_tempo: '', status: 'unpaid', keterangan: '', manual: false,
  pihak_nama: '', pihak_alamat: '', pihak_telepon: '',
  items: [{ nama_item: '', qty: 1, satuan: 'liter', harga_satuan: 0 }],
});

const dateInput = (value) => value ? String(value).slice(0, 10) : '';

export default {
  components: { DataTable, Pagination, Modal },
  data() {
    return {
      rows: [], total: 0, page: 1, limit: 20,
      search: '', status: '', tipe: '',
      loading: false, searchTimer: null,
      referensiList: [],
      showFormModal: false, form: emptyForm(), error: '',
      showEditModal: false, editForm: { id: null, jatuh_tempo: '', status: 'unpaid', keterangan: '' }, editError: '',
      showDetailModal: false, detail: null,
      columns: [
        { key: 'no_invoice', label: 'No. Dokumen' },
        { key: 'tipe', label: 'Tipe' },
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'jatuh_tempo', label: 'Jatuh Tempo' },
        { key: 'status', label: 'Status' },
      ],
    };
  },
  mounted() {
    this.load();
    this.loadReferensi();
  },
  methods: {
    rupiah, tanggalIndo,
    nomorLabel(doc) { return doc?.tipe === 'pembelian' ? 'No. Nota' : 'No. Invoice'; },
    tanggalLabel(doc) { return doc?.tipe === 'pembelian' ? 'Tanggal Nota' : 'Tanggal Invoice'; },
    statusBadge(s) { return STATUS_BADGE[s] || 'badge-muted'; },
    totalPembayaran() {
      return (this.detail?.pembayaran || []).reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
    },
    sisaPembayaran() {
      return Math.max(0, Number(this.detail?.transaksi?.total || 0) - this.totalPembayaran());
    },
    async loadReferensi() {
      const url = this.form.tipe === 'penjualan' ? '/penjualan?limit=200' : '/pembelian?limit=200';
      const res = await api.get(url);
      this.referensiList = res.data;
    },
    async load() {
      this.loading = true;
      const params = new URLSearchParams({
        search: this.search, status: this.status, tipe: this.tipe, page: this.page, limit: this.limit,
      });
      const res = await api.get('/nota?' + params.toString());
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
      this.loadReferensi();
      this.showFormModal = true;
    },
    async save() {
      this.error = '';
      if (!this.form.manual && !this.form.referensi_id) { this.error = 'Pilih transaksi referensi atau gunakan mode nota manual.'; return; }
      try {
        await api.post('/nota', { ...this.form, referensi_id: this.form.manual ? null : this.form.referensi_id });
        this.showFormModal = false;
        this.load();
      } catch (err) {
        this.error = err.message;
      }
    },
    async remove(row) {
      if (!confirm(`Hapus nota ${row.no_invoice}?`)) return;
      await api.delete('/nota/' + row.id);
      this.load();
    },
    openEdit(row) {
      this.editForm = {
        id: row.id,
        jatuh_tempo: dateInput(row.jatuh_tempo),
        status: row.status,
        keterangan: row.keterangan || '',
      };
      this.editError = '';
      this.showEditModal = true;
    },
    async saveEdit() {
      this.editError = '';
      try {
        await api.put('/nota/' + this.editForm.id, this.editForm);
        this.showEditModal = false;
        await this.load();
        if (this.detail?.id === this.editForm.id) {
          this.detail = await api.get('/nota/' + this.editForm.id);
        }
      } catch (err) {
        this.editError = err.message;
      }
    },
    async openDetail(row) {
      this.detail = await api.get('/nota/' + row.id);
      this.showDetailModal = true;
    },
    async downloadPdf() {
      if (!this.detail) return;
      await downloadInvoicePdf(this.detail);
    },
    printThermal() {
      if (this.detail) printThermalInvoice(this.detail);
    },
    addManualItem() {
      this.form.items.push({ nama_item: '', qty: 1, satuan: 'liter', harga_satuan: 0 });
    },
    removeManualItem(index) {
      this.form.items.splice(index, 1);
    },
  },
  watch: {
    'form.tipe'() {
      this.form.no_invoice = (this.form.tipe === 'pembelian' ? 'NOTA-' : 'INV-') + Date.now();
      this.form.referensi_id = '';
      this.loadReferensi();
    },
    'form.manual'(manual) {
      if (manual) this.form.referensi_id = '';
    },
  },
  template: `
    <div>
      <div class="toolbar filter-toolbar">
        <div class="filter-disclosure">
          <input id="filter-nota" class="filter-toggle-control" type="checkbox" />
          <label for="filter-nota" class="filter-toggle"><span>Filter data</span><span class="filter-chevron">⌄</span></label>
          <div class="filter-fields">
            <input type="text" v-model="search" @input="onFilterChange" placeholder="Cari nomor dokumen..." style="width:220px" />
            <select v-model="tipe" @change="onFilterChange">
              <option value="">Semua Tipe</option>
              <option value="penjualan">Penjualan</option>
              <option value="pembelian">Pembelian</option>
            </select>
            <select v-model="status" @change="onFilterChange">
              <option value="">Semua Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <div class="spacer"></div>
        <button class="btn-primary" @click="openCreate">+ Buat Nota</button>
      </div>

      <DataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-tanggal="{ row }">{{ tanggalIndo(row.tanggal) }}</template>
        <template #cell-jatuh_tempo="{ row }">{{ row.jatuh_tempo ? tanggalIndo(row.jatuh_tempo) : '-' }}</template>
        <template #cell-tipe="{ row }">{{ row.tipe === 'pembelian' ? 'Nota Pembayaran' : 'Invoice Penjualan' }}</template>
        <template #cell-status="{ row }"><span class="badge" :class="statusBadge(row.status)">{{ row.status }}</span></template>
        <template #actions="{ row }">
          <button class="btn-secondary btn-sm" @click="openDetail(row)">Lihat</button>
          <button class="btn-secondary btn-sm" @click="openEdit(row)">Edit</button>
          <button class="btn-danger btn-sm" @click="remove(row)">Hapus</button>
        </template>
      </DataTable>
      <Pagination :total="total" :page="page" :limit="limit" @update:page="changePage" />

      <Modal :show="showFormModal" title="Buat Nota" @close="showFormModal = false">
        <form @submit.prevent="save">
          <div class="field">
            <label>{{ form.tipe === 'pembelian' ? 'No. Nota' : 'No. Invoice' }}</label>
            <input v-model="form.no_invoice" required style="width:100%" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Tipe</label>
              <select v-model="form.tipe" style="width:100%">
                <option value="penjualan">Invoice Penjualan</option>
                <option value="pembelian">Nota Pembayaran Pembelian</option>
              </select>
            </div>
            <div class="field">
              <label>Transaksi Referensi</label>
              <select v-model.number="form.referensi_id" :disabled="form.manual" style="width:100%">
                <option value="">- Pilih -</option>
                <option v-for="r in referensiList" :key="r.id" :value="r.id">{{ r.no_transaksi }}</option>
              </select>
            </div>
          </div>
          <label class="manual-invoice-toggle"><input type="checkbox" v-model="form.manual" /> Buat nota manual / nota kosong</label>
          <div v-if="form.manual" class="manual-invoice-box">
            <div class="field-row">
              <div class="field"><label>Nama Pihak</label><input v-model="form.pihak_nama" placeholder="Boleh dikosongkan" style="width:100%" /></div>
              <div class="field"><label>Telepon</label><input v-model="form.pihak_telepon" style="width:100%" /></div>
            </div>
            <div class="field"><label>Alamat</label><input v-model="form.pihak_alamat" style="width:100%" /></div>
            <label>Item Manual <span class="text-muted">(boleh kosong)</span></label>
            <div v-for="(it, index) in form.items" :key="index" class="manual-item-row">
              <input v-model="it.nama_item" placeholder="Nama item" />
              <input type="number" min="0" step="0.01" v-model.number="it.qty" placeholder="Qty" />
              <input v-model="it.satuan" placeholder="Satuan" />
              <input type="number" min="0" v-model.number="it.harga_satuan" placeholder="Harga" />
              <button type="button" class="btn-danger btn-sm" @click="removeManualItem(index)">&times;</button>
            </div>
            <button type="button" class="btn-secondary btn-sm" @click="addManualItem">+ Tambah Item</button>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Tanggal</label>
              <input type="date" v-model="form.tanggal" required style="width:100%" />
            </div>
            <div class="field">
              <label>Jatuh Tempo</label>
              <input type="date" v-model="form.jatuh_tempo" style="width:100%" />
            </div>
          </div>
          <div class="field">
            <label>Keterangan</label>
            <textarea v-model="form.keterangan" rows="3" maxlength="1000" style="width:100%" placeholder="Contoh: Termin pembayaran, pesan untuk pelanggan, atau informasi tambahan"></textarea>
          </div>
          <p v-if="error" class="error-text">{{ error }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showFormModal = false">Batal</button>
          <button class="btn-primary" @click="save">Simpan</button>
        </template>
      </Modal>

      <Modal :show="showEditModal" title="Edit Nota" @close="showEditModal = false">
        <form @submit.prevent="saveEdit">
          <div class="field-row">
            <div class="field">
              <label>Jatuh Tempo</label>
              <input type="date" v-model="editForm.jatuh_tempo" style="width:100%" />
            </div>
            <div class="field">
              <label>Status</label>
              <select v-model="editForm.status" style="width:100%">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Keterangan</label>
            <textarea v-model="editForm.keterangan" rows="4" maxlength="1000" style="width:100%" placeholder="Tulis keterangan yang akan tampil di nota"></textarea>
          </div>
          <p v-if="editError" class="error-text">{{ editError }}</p>
        </form>
        <template #footer>
          <button class="btn-secondary" @click="showEditModal = false">Batal</button>
          <button class="btn-primary" @click="saveEdit">Simpan Perubahan</button>
        </template>
      </Modal>

      <Modal :show="showDetailModal" size="lg" title="" @close="showDetailModal = false">
        <div v-if="detail" class="print-area invoice-doc">
          <div class="invoice-header">
            <div class="invoice-header-diagonal">
              <span class="invoice-header-title" :class="{ 'invoice-header-title-long': detail.tipe === 'pembelian' }">{{ detail.tipe === 'pembelian' ? 'NOTA PEMBAYARAN SUSU' : 'INVOICE PENJUALAN' }}</span>
            </div>
            <img class="invoice-header-logo" src="/img/logo.png" alt="Mitrayasa" />
          </div>
          <div class="invoice-meta-row">
            <span>{{ nomorLabel(detail) }}: {{ detail.no_invoice }}</span>
            <span>{{ tanggalLabel(detail) }}: {{ tanggalIndo(detail.tanggal) }}</span>
          </div>
          <div class="invoice-divider"></div>

          <div class="invoice-info-grid">
            <div>
              <p><strong>{{ nomorLabel(detail) }}:</strong> {{ detail.no_invoice }}</p>
              <p><strong>{{ tanggalLabel(detail) }}:</strong> {{ tanggalIndo(detail.tanggal) }}</p>
              <p><strong>Jatuh Tempo:</strong> {{ detail.jatuh_tempo ? tanggalIndo(detail.jatuh_tempo) : '-' }}</p>
              <p><span class="badge" :class="statusBadge(detail.status)">{{ detail.status }}</span></p>
            </div>
            <div class="text-right">
              <p><strong>Kepada Yth:</strong></p>
              <p>{{ detail.transaksi?.pihak_nama || '-' }}</p>
              <p class="text-muted">{{ detail.transaksi?.pihak_alamat || detail.transaksi?.pihak_telepon || '' }}</p>
            </div>
          </div>

          <div v-if="detail.tipe === 'pembelian'" class="transaction-metrics invoice-milk-metrics">
            <span><b>Volume:</b> {{ Number(detail.transaksi?.volume_pagi || 0) + Number(detail.transaksi?.volume_sore || 0) }} L (Pagi {{ detail.transaksi?.volume_pagi || 0 }} / Sore {{ detail.transaksi?.volume_sore || 0 }})</span>
            <span><b>Kualitas:</b> F {{ detail.transaksi?.kualitas_f ?? '-' }} · S {{ detail.transaksi?.kualitas_s ?? '-' }} · P {{ detail.transaksi?.kualitas_p ?? '-' }} · TS {{ detail.transaksi?.kualitas_ts ?? '-' }} · PH {{ detail.transaksi?.kualitas_ph ?? '-' }} · W {{ detail.transaksi?.kualitas_w ?? '-' }}</span>
          </div>

          <div class="table-wrap invoice-table-wrap" style="margin-bottom:14px">
            <table>
              <thead><tr><th>{{ detail.tipe === 'pembelian' ? 'Tanggal' : 'Produk' }}</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="it in detail.items" :key="it.id">
                  <td>{{ detail.tipe === 'pembelian' ? tanggalIndo(it.tanggal || detail.transaksi?.tanggal || detail.tanggal) : it.nama_produk }}</td>
                  <td class="text-right">{{ it.satuan ? it.qty + ' ' + it.satuan : it.qty }}</td>
                  <td class="text-right">{{ rupiah(it.harga_satuan) }}</td>
                  <td class="text-right">{{ rupiah(it.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="detail.tipe === 'pembelian'">
            <p class="invoice-section-title"><strong>Riwayat Pembayaran</strong></p>
            <div class="table-wrap invoice-table-wrap" style="margin-bottom:14px">
              <table>
                <thead><tr><th>Tanggal</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead>
                <tbody>
                  <tr v-if="!detail.pembayaran?.length"><td colspan="3" class="empty-state">Belum ada pembayaran.</td></tr>
                  <tr v-for="p in (detail.pembayaran || [])" :key="p.id">
                    <td>{{ tanggalIndo(p.tanggal_bayar) }}</td>
                    <td class="text-right">{{ rupiah(p.jumlah_bayar) }}</td>
                    <td>{{ p.keterangan || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="detail.potongan_items?.length" class="detail-deduction-list">
              <strong>Rincian Potongan</strong>
              <div v-for="item in detail.potongan_items" :key="item.id" class="detail-deduction-row"><span>{{ item.keterangan }}</span><span>-{{ rupiah(item.jumlah) }}</span></div>
            </div>
          </template>

          <div class="invoice-totals">
            <div class="invoice-totals-box">
              <template v-if="detail.tipe === 'pembelian'">
                <div class="row"><span>Total:</span><span>{{ rupiah(detail.transaksi?.total) }}</span></div>
                <div class="row"><span>Sudah dibayar:</span><span>{{ rupiah(totalPembayaran()) }}</span></div>
                <div class="row total"><span>SISA:</span><span>{{ rupiah(sisaPembayaran()) }}</span></div>
              </template>
              <template v-else>
                <div class="row"><span>Subtotal:</span><span>{{ rupiah(detail.transaksi?.total) }}</span></div>
                <div class="row"><span>Pajak:</span><span>{{ rupiah(0) }}</span></div>
                <div class="row total"><span>TOTAL:</span><span>{{ rupiah(detail.transaksi?.total) }}</span></div>
              </template>
            </div>
          </div>

          <div v-if="detail.keterangan" class="invoice-notes">
            <strong>Keterangan:</strong>
            <p>{{ detail.keterangan }}</p>
          </div>

          <div class="invoice-signature">
            <p>Hormat kami,</p>
            <img class="invoice-sign-logo" src="/img/logo.png" alt="Mitrayasa" />
            <br/>
            <br/>
            <p class="text-muted invoice-payment-info">Pembayaran bisa ditransfer ke Bank BSI 7280830806 a.n. Fariz Amroeni</p>
          </div>

          <div class="invoice-footer">
            <p><em>Terima kasih atas kepercayaan Anda</em></p>
            <p>Jl. Pagerageung No. 28 Kab. Tasikmalaya - Jabar 46158 | Telp: 0813 8538 9191 | Email: mitrayasadairy@gmail.com</p>
          </div>

          <div class="no-print" style="text-align:right;margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn-secondary" @click="printThermal">Cetak Thermal 80mm</button>
            <button class="btn-primary" @click="downloadPdf">Cetak A4 / PDF</button>
          </div>
        </div>
      </Modal>
    </div>
  `,
};
