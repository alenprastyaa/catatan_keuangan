import { api } from '../api.js';
import { rupiah, tanggalIndo, todayStr } from '../format.js';
import PeriodFilter from '../components/PeriodFilter.js';
import { downloadReportPdf } from '../pdf.js?v=20260816-1';
import { downloadCsv } from '../csv.js';
import { printThermalMilkReport } from '../thermalPrint.js?v=20260818-4';

const TABS = [
  ['pelanggan-supplier', 'Pelanggan/Supplier'],
  ['pembeli', 'Pembeli'],
  ['laba-rugi', 'Laba Rugi'],
  ['kas', 'Kas'],
  ['penjualan', 'Penjualan'],
  ['pembelian', 'Pembelian'],
  ['pengeluaran', 'Pengeluaran'],
  ['hutang-piutang', 'Hutang/Piutang'],
  ['data-supplier-konsumen', 'Data Supplier & Konsumen'],
  ['individu', 'Transaksi per Individu'],
];
const PERIOD_TABS = ['laba-rugi', 'kas', 'penjualan', 'pembelian', 'pengeluaran', 'individu'];

export default {
  components: { PeriodFilter },
  data() {
    return {
      activeTab: 'pelanggan-supplier',
      tabs: TABS,
      periode: { period: 'month', start: '', end: '' },
      loading: false,
      result: null,
      individuTipe: 'supplier', individuId: '',
    };
  },
  computed: {
    usesPeriod() {
      return PERIOD_TABS.includes(this.activeTab);
    },
  },
  mounted() {
    this.load();
  },
  watch: {
    periode: {
      handler() {
        if (this.usesPeriod) this.load();
      },
      deep: true,
    },
  },
  methods: {
    rupiah, tanggalIndo,
    switchTab(key) {
      this.activeTab = key;
      this.load();
    },
    async load() {
      this.loading = true;
      let url = '/laporan/' + this.activeTab;
      if (this.usesPeriod) {
        const params = new URLSearchParams({ period: this.periode.period });
        if (this.activeTab === 'individu') {
          params.set('tipe', this.individuTipe);
          if (this.individuId) params.set('id', this.individuId);
        }
        if (this.periode.period === 'custom') {
          if (this.periode.start) params.set('start', this.periode.start);
          if (this.periode.end) params.set('end', this.periode.end);
        }
        url += '?' + params.toString();
      }
      this.result = await api.get(url);
      this.loading = false;
    },
    exportExcel() {
      if (!this.result) return;
      const tabLabel = this.tabs.find((t) => t[0] === this.activeTab)[1];
      const fileName = `Laporan-${tabLabel.replace(/[\s/]+/g, '-')}-${todayStr()}.csv`;
      const r = this.result;
      let rows = [];

      if (this.activeTab === 'pelanggan-supplier') {
        rows = [['Nama', 'Tipe', 'Telepon', 'Email', 'Jumlah Transaksi', 'Total Transaksi'],
          ...r.data.map((x) => [x.nama, x.tipe, x.telepon, x.email, x.jumlah_transaksi, x.total_transaksi])];
      } else if (this.activeTab === 'pembeli') {
        rows = [['Nama', 'Telepon', 'Alamat', 'Jumlah Transaksi', 'Total Transaksi'],
          ...r.data.map((x) => [x.nama, x.telepon, x.alamat, x.jumlah_transaksi, x.total_transaksi])];
      } else if (this.activeTab === 'laba-rugi') {
        rows = [['Komponen', 'Nilai'],
          ['Total Penjualan', r.total_penjualan],
          ['HPP', r.hpp],
          ['Laba Kotor', r.laba_kotor],
          ['Total Pengeluaran', r.total_pengeluaran],
          ['Laba Bersih', r.laba_bersih]];
      } else if (this.activeTab === 'kas') {
        rows = [['Tanggal', 'Keterangan', 'Tipe', 'Jumlah', 'Saldo'],
          ...r.data.map((x) => [x.tanggal, x.keterangan, x.tipe, x.jumlah, x.saldo]),
          [], ['Total Masuk', r.total_masuk], ['Total Keluar', r.total_keluar]];
      } else if (this.activeTab === 'penjualan') {
        rows = [['No. Transaksi', 'Tanggal', 'Pembeli', 'Volume (L)', 'Status', 'Total'],
          ...r.data.map((x) => [x.no_transaksi, x.tanggal, x.pembeli_nama, Number(x.volume_pagi || 0) + Number(x.volume_sore || 0), x.status, x.total]),
          [], ['', '', '', r.total_volume, 'Total', r.total]];
      } else if (this.activeTab === 'pembelian') {
        rows = [['No. Transaksi', 'Tanggal', 'Supplier', 'Volume (L)', 'Status', 'Total'],
          ...r.data.map((x) => [x.no_transaksi, x.tanggal, x.supplier_nama, Number(x.volume_pagi || 0) + Number(x.volume_sore || 0), x.status, x.total]),
          [], ['', '', '', r.total_volume, 'Total', r.total]];
      } else if (this.activeTab === 'pengeluaran') {
        rows = [['Tanggal', 'Tipe', 'Keterangan', 'Jumlah'],
          ...r.data.map((x) => [x.tanggal, x.tipe, x.keterangan, x.jumlah]),
          [], ['', '', 'Total', r.total]];
      } else if (this.activeTab === 'hutang-piutang') {
        rows = [['Jenis', 'No. Transaksi', 'Pihak', 'Tanggal', 'Jatuh Tempo', 'Total', 'Sudah Bayar', 'Sisa'],
          ...r.hutang.map((x) => ['Hutang', x.no_transaksi, x.pihak_nama, x.tanggal, x.jatuh_tempo, x.total, x.sudah_bayar, x.sisa]),
          ...r.piutang.map((x) => ['Piutang', x.no_transaksi, x.pihak_nama, x.tanggal, x.jatuh_tempo, x.total, x.sudah_bayar, x.sisa])];
      } else if (this.activeTab === 'data-supplier-konsumen') {
        rows = [['Kelompok', 'Nama', 'Tipe', 'Telepon', 'Alamat'],
          ...r.supplier.map((x) => ['Supplier/Pelanggan', x.nama, x.tipe, x.telepon, x.alamat]),
          ...r.konsumen.map((x) => ['Konsumen', x.nama, '', x.telepon, x.alamat])];
      } else if (this.activeTab === 'individu') {
        if (this.individuTipe === 'supplier') {
          rows = [['Tanggal', 'Qty', 'Harga', 'Subtotal'],
            ...r.transaksi.map((x) => [x.tanggal, x.qty, x.harga_satuan, x.total]),
            [], ['Riwayat Pembayaran'], ['Tanggal', 'Jumlah', 'Keterangan'],
            ...(r.pembayaran || []).map((x) => [x.tanggal_bayar, x.jumlah_bayar, x.keterangan || '-'])];
        } else {
          rows = [['No. Transaksi', 'Tanggal', 'Volume (L)', 'Status', 'Total', 'Terbayar', 'Sisa'],
            ...r.transaksi.map((x) => [x.no_transaksi, x.tanggal, x.volume_liter, x.status, x.total, x.sudah_bayar, Number(x.total) - Number(x.sudah_bayar)])];
        }
      }

      downloadCsv(fileName, rows);
    },
    printThermalMilk() {
      if (!this.result?.individu || this.individuTipe !== 'supplier') return;
      printThermalMilkReport(this.result);
    },
    downloadPdf() {
      if (!this.result) return;

      const meta = [`Dicetak: ${new Date().toLocaleDateString('id-ID')}`];
      const subtitle = this.usesPeriod && this.result.periode
        ? `Periode: ${tanggalIndo(this.result.periode.start)} — ${tanggalIndo(this.result.periode.end)}`
        : undefined;
      const tabLabel = this.tabs.find((t) => t[0] === this.activeTab)[1];
      const fileName = `Laporan-${tabLabel.replace(/[\s/]+/g, '-')}-${todayStr()}.pdf`;
      const common = { fileName, meta, subtitle };

      if (this.activeTab === 'pelanggan-supplier') {
        downloadReportPdf({
          ...common,
          title: 'Laporan Pelanggan / Supplier',
          sections: [{
            columns: ['Nama', 'Tipe', 'Telepon', 'Jml Transaksi', 'Total Transaksi'],
            rows: this.result.data.map((r) => [r.nama, r.tipe, r.telepon || '-', r.jumlah_transaksi, rupiah(r.total_transaksi)]),
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'pembeli') {
        downloadReportPdf({
          ...common,
          title: 'Laporan Pembeli',
          sections: [{
            columns: ['Nama', 'Telepon', 'Jml Transaksi', 'Total Transaksi'],
            rows: this.result.data.map((r) => [r.nama, r.telepon || '-', r.jumlah_transaksi, rupiah(r.total_transaksi)]),
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'laba-rugi') {
        const labaPositif = Number(this.result.laba_bersih) >= 0;
        downloadReportPdf({
          ...common,
          title: 'Laporan Laba Rugi',
          orientation: 'portrait',
          stats: [
            { label: 'Penjualan', value: rupiah(this.result.total_penjualan), accent: [79, 70, 229] },
            { label: 'Laba Kotor', value: rupiah(this.result.laba_kotor) },
            { label: 'Laba Bersih', value: rupiah(this.result.laba_bersih), accent: labaPositif ? [11, 138, 97] : [207, 52, 52] },
          ],
          sections: [{
            heading: 'Rincian Perhitungan',
            columns: ['Komponen', 'Nilai'],
            rows: [
              ['Total Penjualan', rupiah(this.result.total_penjualan)],
              ['HPP (Harga Pokok Penjualan)', rupiah(this.result.hpp)],
              ['Laba Kotor', rupiah(this.result.laba_kotor)],
              ['Total Pengeluaran', rupiah(this.result.total_pengeluaran)],
            ],
            foot: ['Laba Bersih', rupiah(this.result.laba_bersih)],
            columnStyles: { 1: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'kas') {
        const saldoAkhir = Number(this.result.total_masuk) - Number(this.result.total_keluar);
        downloadReportPdf({
          ...common,
          title: 'Laporan Kas',
          stats: [
            { label: 'Total Masuk', value: rupiah(this.result.total_masuk), accent: [11, 138, 97] },
            { label: 'Total Keluar', value: rupiah(this.result.total_keluar), accent: [207, 52, 52] },
            { label: 'Saldo Periode', value: rupiah(saldoAkhir), accent: saldoAkhir >= 0 ? [79, 70, 229] : [207, 52, 52] },
          ],
          sections: [
            {
              heading: 'Arus Kas',
              columns: ['Tanggal', 'Keterangan', 'Tipe', 'Jumlah', 'Saldo'],
              rows: this.result.data.map((r) => [tanggalIndo(r.tanggal), r.keterangan, r.tipe, rupiah(r.jumlah), rupiah(r.saldo)]),
              statusColumn: 2,
              columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
            },
          ],
        });
      } else if (this.activeTab === 'penjualan') {
        const lunasCount = this.result.data.filter((r) => r.status === 'lunas').length;
        downloadReportPdf({
          ...common,
          title: 'Laporan Penjualan',
          stats: [
            { label: 'Total Penjualan', value: rupiah(this.result.total), accent: [79, 70, 229] },
            { label: 'Jumlah Transaksi', value: this.result.data.length },
            { label: 'Transaksi Lunas', value: `${lunasCount} dari ${this.result.data.length}`, accent: [11, 138, 97] },
          ],
          sections: [{
            heading: 'Daftar Transaksi',
            columns: ['No. Transaksi', 'Tanggal', 'Pembeli', 'Status', 'Total'],
            rows: this.result.data.map((r) => [r.no_transaksi, tanggalIndo(r.tanggal), r.pembeli_nama || '-', r.status, rupiah(r.total)]),
            foot: ['', '', '', 'Total', rupiah(this.result.total)],
            statusColumn: 3,
            columnStyles: { 4: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'pembelian') {
        const lunasCount = this.result.data.filter((r) => r.status === 'lunas').length;
        downloadReportPdf({
          ...common,
          title: 'Laporan Pembelian',
          stats: [
            { label: 'Total Pembelian', value: rupiah(this.result.total), accent: [79, 70, 229] },
            { label: 'Jumlah Transaksi', value: this.result.data.length },
            { label: 'Transaksi Lunas', value: `${lunasCount} dari ${this.result.data.length}`, accent: [11, 138, 97] },
          ],
          sections: [{
            heading: 'Daftar Transaksi',
            columns: ['No. Transaksi', 'Tanggal', 'Supplier', 'Status', 'Total'],
            rows: this.result.data.map((r) => [r.no_transaksi, tanggalIndo(r.tanggal), r.supplier_nama || '-', r.status, rupiah(r.total)]),
            foot: ['', '', '', 'Total', rupiah(this.result.total)],
            statusColumn: 3,
            columnStyles: { 4: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'pengeluaran') {
        downloadReportPdf({
          ...common,
          title: 'Laporan Pengeluaran',
          stats: [
            { label: 'Total Pengeluaran', value: rupiah(this.result.total), accent: [207, 52, 52] },
            { label: 'Jumlah Catatan', value: this.result.data.length },
          ],
          sections: [{
            heading: 'Rincian Pengeluaran',
            columns: ['Tanggal', 'Tipe', 'Keterangan', 'Jumlah'],
            rows: this.result.data.map((r) => [tanggalIndo(r.tanggal), r.tipe, r.keterangan || '-', rupiah(r.jumlah)]),
            foot: ['', '', 'Total', rupiah(this.result.total)],
            columnStyles: { 3: { halign: 'right' } },
          }],
        });
      } else if (this.activeTab === 'hutang-piutang') {
        const totalHutang = this.result.hutang.reduce((s, r) => s + Number(r.sisa), 0);
        const totalPiutang = this.result.piutang.reduce((s, r) => s + Number(r.sisa), 0);
        downloadReportPdf({
          ...common,
          title: 'Laporan Hutang / Piutang',
          stats: [
            { label: 'Sisa Hutang', value: rupiah(totalHutang), accent: [207, 52, 52] },
            { label: 'Sisa Piutang', value: rupiah(totalPiutang), accent: [180, 83, 9] },
            { label: 'Selisih Bersih', value: rupiah(totalPiutang - totalHutang), accent: [79, 70, 229] },
          ],
          sections: [
            {
              heading: 'Hutang (ke Supplier)',
              columns: ['No. Transaksi', 'Supplier', 'Tanggal', 'Jatuh Tempo', 'Total', 'Sudah Bayar', 'Sisa'],
              rows: this.result.hutang.map((r) => [r.no_transaksi, r.pihak_nama || '-', tanggalIndo(r.tanggal), r.jatuh_tempo ? tanggalIndo(r.jatuh_tempo) : '-', rupiah(r.total), rupiah(r.sudah_bayar), rupiah(r.sisa)]),
              columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
            },
            {
              heading: 'Piutang (dari Pembeli)',
              columns: ['No. Transaksi', 'Pembeli', 'Tanggal', 'Jatuh Tempo', 'Total', 'Sudah Bayar', 'Sisa'],
              rows: this.result.piutang.map((r) => [r.no_transaksi, r.pihak_nama || '-', tanggalIndo(r.tanggal), r.jatuh_tempo ? tanggalIndo(r.jatuh_tempo) : '-', rupiah(r.total), rupiah(r.sudah_bayar), rupiah(r.sisa)]),
              columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
            },
          ],
        });
      } else if (this.activeTab === 'individu' && this.result.individu) {
        if (this.individuTipe === 'supplier') {
          downloadReportPdf({
            ...common,
            title: 'Data Penerimaan / Pembayaran Susu',
            subtitle: `${this.result.individu.nama} · ${common.subtitle || ''}`,
            stats: [
              { label: 'Volume', value: `${this.result.ringkasan.total_volume} L` },
              { label: 'Total Penerimaan', value: rupiah(this.result.ringkasan.total_nilai) },
              { label: 'Total Dibayar', value: rupiah(this.result.ringkasan.total_bayar), accent: [11, 138, 97] },
              { label: 'Sisa', value: rupiah(this.result.ringkasan.sisa), accent: [207, 52, 52] },
            ],
            sections: [
              {
                heading: 'Data Penerimaan Susu',
                columns: ['Tanggal', 'Qty', 'Harga', 'Subtotal'],
                rows: this.result.transaksi.map((r) => [tanggalIndo(r.tanggal), `${r.qty} L`, rupiah(r.harga_satuan), rupiah(r.total)]),
                foot: ['', '', 'Total', rupiah(this.result.ringkasan.total_nilai)],
                columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
              },
              {
                heading: 'Riwayat Pembayaran',
                columns: ['Tanggal', 'Jumlah', 'Keterangan'],
                rows: (this.result.pembayaran || []).map((p) => [tanggalIndo(p.tanggal_bayar), rupiah(p.jumlah_bayar), p.keterangan || '-']),
                foot: ['', 'Total Dibayar', rupiah(this.result.ringkasan.total_bayar)],
                columnStyles: { 1: { halign: 'right' } },
              },
            ],
          });
        } else {
          downloadReportPdf({
            ...common, title: `Laporan Individu - ${this.result.individu.nama}`,
            stats: [
              { label: 'Volume', value: `${this.result.ringkasan.total_volume} L` },
              { label: 'Total Nilai', value: rupiah(this.result.ringkasan.total_nilai) },
              { label: 'Sisa', value: rupiah(this.result.ringkasan.sisa), accent: [207, 52, 52] },
            ],
            sections: [{
              columns: ['No. Transaksi', 'Tanggal', 'Volume', 'Status', 'Total', 'Terbayar', 'Sisa'],
              rows: this.result.transaksi.map((r) => [r.no_transaksi, tanggalIndo(r.tanggal), `${r.volume_liter} L`, r.status, rupiah(r.total), rupiah(r.sudah_bayar), rupiah(Number(r.total)-Number(r.sudah_bayar))]),
              columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
            }],
          });
        }
      } else if (this.activeTab === 'data-supplier-konsumen') {
        downloadReportPdf({
          ...common,
          title: 'Data Supplier & Konsumen',
          sections: [
            {
              heading: 'Supplier / Pelanggan',
              columns: ['Nama', 'Tipe', 'Telepon', 'Alamat'],
              rows: this.result.supplier.map((r) => [r.nama, r.tipe, r.telepon || '-', r.alamat || '-']),
            },
            {
              heading: 'Konsumen (Pembeli)',
              columns: ['Nama', 'Telepon', 'Alamat'],
              rows: this.result.konsumen.map((r) => [r.nama, r.telepon || '-', r.alamat || '-']),
            },
          ],
        });
      }
    },
  },
  template: `
    <div>
      <div class="tabs">
        <button v-for="t in tabs" :key="t[0]" :class="{ active: activeTab === t[0] }" @click="switchTab(t[0])">{{ t[1] }}</button>
      </div>

      <div class="toolbar report-toolbar">
        <div class="report-period"><PeriodFilter v-if="usesPeriod" v-model="periode" style="margin-bottom:0" /></div>
        <div class="spacer"></div>
        <div class="report-actions">
          <button class="btn-secondary" :disabled="!result || loading" @click="exportExcel">⬇ Excel</button>
          <button v-if="activeTab === 'individu' && individuTipe === 'supplier' && result && result.individu" class="btn-secondary" :disabled="loading" @click="printThermalMilk">🖨 Thermal 80mm</button>
          <button class="btn-primary" :disabled="!result || loading" @click="downloadPdf">⬇ PDF</button>
        </div>
      </div>

      <div v-if="loading" class="empty-state">Memuat laporan...</div>

      <template v-else-if="result">
        <div v-if="activeTab === 'individu'" class="individual-filter-card">
          <div class="field"><label>Jenis Individu</label><select v-model="individuTipe" @change="individuId=''; load()"><option value="supplier">Supplier</option><option value="pembeli">Pembeli / Konsumen</option></select></div>
          <div class="field"><label>Nama</label><select v-model="individuId" @change="load()"><option value="">- Pilih nama -</option><option v-for="p in result.options" :key="p.id" :value="p.id">{{ p.nama }}</option></select></div>
        </div>
        <!-- Pelanggan/Supplier -->
        <div v-if="activeTab === 'pelanggan-supplier'" class="table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Tipe</th><th>Telepon</th><th class="text-right">Jml Transaksi</th><th class="text-right">Total Transaksi</th></tr></thead>
            <tbody>
              <tr v-for="r in result.data" :key="r.id">
                <td>{{ r.nama }}</td><td>{{ r.tipe }}</td><td>{{ r.telepon }}</td>
                <td class="text-right">{{ r.jumlah_transaksi }}</td><td class="text-right">{{ rupiah(r.total_transaksi) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pembeli -->
        <div v-if="activeTab === 'pembeli'" class="table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Telepon</th><th class="text-right">Jml Transaksi</th><th class="text-right">Total Transaksi</th></tr></thead>
            <tbody>
              <tr v-for="r in result.data" :key="r.id">
                <td>{{ r.nama }}</td><td>{{ r.telepon }}</td>
                <td class="text-right">{{ r.jumlah_transaksi }}</td><td class="text-right">{{ rupiah(r.total_transaksi) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Laba Rugi -->
        <div v-if="activeTab === 'laba-rugi'" class="summary-grid">
          <div class="card summary-card"><div class="label">Total Penjualan</div><div class="value">{{ rupiah(result.total_penjualan) }}</div></div>
          <div class="card summary-card"><div class="label">HPP</div><div class="value">{{ rupiah(result.hpp) }}</div></div>
          <div class="card summary-card"><div class="label">Laba Kotor</div><div class="value">{{ rupiah(result.laba_kotor) }}</div></div>
          <div class="card summary-card"><div class="label">Total Pengeluaran</div><div class="value">{{ rupiah(result.total_pengeluaran) }}</div></div>
          <div class="card summary-card"><div class="label">Laba Bersih</div><div class="value">{{ rupiah(result.laba_bersih) }}</div></div>
        </div>

        <!-- Kas -->
        <div v-if="activeTab === 'kas'">
          <div class="summary-grid">
            <div class="card summary-card"><div class="label">Total Masuk</div><div class="value">{{ rupiah(result.total_masuk) }}</div></div>
            <div class="card summary-card"><div class="label">Total Keluar</div><div class="value">{{ rupiah(result.total_keluar) }}</div></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Tipe</th><th class="text-right">Jumlah</th><th class="text-right">Saldo</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in result.data" :key="i">
                  <td>{{ tanggalIndo(r.tanggal) }}</td><td>{{ r.keterangan }}</td>
                  <td><span class="badge" :class="r.tipe === 'masuk' ? 'badge-success' : 'badge-danger'">{{ r.tipe }}</span></td>
                  <td class="text-right">{{ rupiah(r.jumlah) }}</td><td class="text-right">{{ rupiah(r.saldo) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Penjualan -->
        <div v-if="activeTab === 'penjualan'">
          <p style="text-align:right;font-weight:600">Total volume: {{ result.total_volume }} L &nbsp;|&nbsp; Total: {{ rupiah(result.total) }}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Pembeli</th><th class="text-right">Volume</th><th>Status</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                <tr v-for="r in result.data" :key="r.id">
                  <td>{{ r.no_transaksi }}</td><td>{{ tanggalIndo(r.tanggal) }}</td><td>{{ r.pembeli_nama || '-' }}</td><td class="text-right">{{ Number(r.volume_pagi || 0) + Number(r.volume_sore || 0) }} L</td>
                  <td>{{ r.status }}</td><td class="text-right">{{ rupiah(r.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pembelian -->
        <div v-if="activeTab === 'pembelian'">
          <p style="text-align:right;font-weight:600">Total volume: {{ result.total_volume }} L &nbsp;|&nbsp; Total: {{ rupiah(result.total) }}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Supplier</th><th class="text-right">Volume</th><th>Status</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                <tr v-for="r in result.data" :key="r.id">
                  <td>{{ r.no_transaksi }}</td><td>{{ tanggalIndo(r.tanggal) }}</td><td>{{ r.supplier_nama || '-' }}</td><td class="text-right">{{ Number(r.volume_pagi || 0) + Number(r.volume_sore || 0) }} L</td>
                  <td>{{ r.status }}</td><td class="text-right">{{ rupiah(r.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pengeluaran -->
        <div v-if="activeTab === 'pengeluaran'">
          <div class="summary-grid">
            <div class="card summary-card"><div class="label">Total Pengeluaran</div><div class="value">{{ rupiah(result.total) }}</div></div>
            <div v-for="t in result.by_tipe" :key="t.tipe" class="card summary-card"><div class="label">{{ t.tipe }}</div><div class="value">{{ rupiah(t.total) }}</div></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th class="text-right">Jumlah</th></tr></thead>
              <tbody>
                <tr v-if="result.data.length === 0"><td colspan="4" class="empty-state">Tidak ada pengeluaran.</td></tr>
                <tr v-for="r in result.data" :key="r.id">
                  <td>{{ tanggalIndo(r.tanggal) }}</td><td>{{ r.tipe }}</td><td>{{ r.keterangan }}</td>
                  <td class="text-right">{{ rupiah(r.jumlah) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Hutang/Piutang -->
        <div v-if="activeTab === 'hutang-piutang'">
          <p style="font-weight:600;margin-top:0">Hutang (ke Supplier)</p>
          <div class="table-wrap" style="margin-bottom:20px">
            <table>
              <thead><tr><th>No. Transaksi</th><th>Supplier</th><th>Tanggal</th><th>Jatuh Tempo</th><th class="text-right">Total</th><th class="text-right">Sudah Bayar</th><th class="text-right">Sisa</th></tr></thead>
              <tbody>
                <tr v-if="result.hutang.length === 0"><td colspan="7" class="empty-state">Tidak ada hutang.</td></tr>
                <tr v-for="r in result.hutang" :key="r.id">
                  <td>{{ r.no_transaksi }}</td><td>{{ r.pihak_nama || '-' }}</td><td>{{ tanggalIndo(r.tanggal) }}</td>
                  <td>{{ r.jatuh_tempo ? tanggalIndo(r.jatuh_tempo) : '-' }}</td>
                  <td class="text-right">{{ rupiah(r.total) }}</td><td class="text-right">{{ rupiah(r.sudah_bayar) }}</td>
                  <td class="text-right">{{ rupiah(r.sisa) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style="font-weight:600">Piutang (dari Pembeli)</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>No. Transaksi</th><th>Pembeli</th><th>Tanggal</th><th>Jatuh Tempo</th><th class="text-right">Total</th><th class="text-right">Sudah Bayar</th><th class="text-right">Sisa</th></tr></thead>
              <tbody>
                <tr v-if="result.piutang.length === 0"><td colspan="7" class="empty-state">Tidak ada piutang.</td></tr>
                <tr v-for="r in result.piutang" :key="r.id">
                  <td>{{ r.no_transaksi }}</td><td>{{ r.pihak_nama || '-' }}</td><td>{{ tanggalIndo(r.tanggal) }}</td>
                  <td>{{ r.jatuh_tempo ? tanggalIndo(r.jatuh_tempo) : '-' }}</td>
                  <td class="text-right">{{ rupiah(r.total) }}</td><td class="text-right">{{ rupiah(r.sudah_bayar) }}</td>
                  <td class="text-right">{{ rupiah(r.sisa) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Data Supplier & Konsumen -->
        <div v-if="activeTab === 'data-supplier-konsumen'">
          <p style="font-weight:600;margin-top:0">Supplier / Pelanggan</p>
          <div class="table-wrap" style="margin-bottom:20px">
            <table>
              <thead><tr><th>Nama</th><th>Tipe</th><th>Telepon</th><th>Alamat</th></tr></thead>
              <tbody>
                <tr v-for="r in result.supplier" :key="r.id">
                  <td>{{ r.nama }}</td><td>{{ r.tipe }}</td><td>{{ r.telepon }}</td><td>{{ r.alamat }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style="font-weight:600">Konsumen (Pembeli)</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Telepon</th><th>Alamat</th></tr></thead>
              <tbody>
                <tr v-for="r in result.konsumen" :key="r.id">
                  <td>{{ r.nama }}</td><td>{{ r.telepon }}</td><td>{{ r.alamat }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'individu' && result.individu">
          <div class="individual-profile"><span class="text-muted">Laporan transaksi individu</span><h3>{{ result.individu.nama }}</h3><p>{{ result.individu.telepon || '-' }} · {{ result.individu.alamat || '-' }}</p></div>
          <div class="summary-grid" v-if="result.ringkasan">
            <div class="card summary-card"><div class="label">Transaksi</div><div class="value">{{ result.ringkasan.jumlah_transaksi }}</div></div>
            <div class="card summary-card"><div class="label">Volume</div><div class="value">{{ result.ringkasan.total_volume }} L</div></div>
            <div class="card summary-card"><div class="label">Total Nilai</div><div class="value">{{ rupiah(result.ringkasan.total_nilai) }}</div></div>
            <div class="card summary-card"><div class="label">Terbayar</div><div class="value">{{ rupiah(result.ringkasan.total_bayar) }}</div></div>
            <div class="card summary-card"><div class="label">Sisa</div><div class="value">{{ rupiah(result.ringkasan.sisa) }}</div></div>
          </div>
          <template v-if="individuTipe === 'supplier'">
            <p style="font-weight:600">Data Penerimaan Susu</p>
            <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead><tbody>
              <tr v-if="!result.transaksi.length"><td colspan="4" class="empty-state">Belum ada transaksi pada periode ini.</td></tr>
              <tr v-for="r in result.transaksi" :key="r.id"><td>{{ tanggalIndo(r.tanggal) }}</td><td class="text-right">{{ r.qty }} L</td><td class="text-right">{{ rupiah(r.harga_satuan) }}</td><td class="text-right">{{ rupiah(r.total) }}</td></tr>
            </tbody></table></div>
            <p style="font-weight:600;margin-top:20px">Riwayat Pembayaran</p>
            <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead><tbody>
              <tr v-if="!result.pembayaran?.length"><td colspan="3" class="empty-state">Belum ada pembayaran.</td></tr>
              <tr v-for="p in (result.pembayaran || [])" :key="p.id"><td>{{ tanggalIndo(p.tanggal_bayar) }}</td><td class="text-right">{{ rupiah(p.jumlah_bayar) }}</td><td>{{ p.keterangan || '-' }}</td></tr>
            </tbody></table></div>
          </template>
          <div v-else class="table-wrap"><table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th class="text-right">Volume</th><th>Status</th><th class="text-right">Total</th><th class="text-right">Terbayar</th><th class="text-right">Sisa</th></tr></thead><tbody>
              <tr v-if="!result.transaksi.length"><td colspan="7" class="empty-state">Belum ada transaksi pada periode ini.</td></tr>
              <tr v-for="r in result.transaksi" :key="r.id"><td>{{ r.no_transaksi }}</td><td>{{ tanggalIndo(r.tanggal) }}</td><td class="text-right">{{ r.volume_liter }} L</td><td>{{ r.status }}</td><td class="text-right">{{ rupiah(r.total) }}</td><td class="text-right">{{ rupiah(r.sudah_bayar) }}</td><td class="text-right">{{ rupiah(Number(r.total)-Number(r.sudah_bayar)) }}</td></tr>
          </tbody></table></div>
        </div>
      </template>
    </div>
  `,
};
