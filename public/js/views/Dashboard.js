import { api } from '../api.js';
import { rupiah, tanggalIndo } from '../format.js';
import PeriodFilter from '../components/PeriodFilter.js';

const COLOR_PENJUALAN = '#4f46e5';
const COLOR_PEMBELIAN = '#10b981';

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => rupiah(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#7a8199', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: '#eceef5' },
        border: { display: false },
        ticks: { color: '#7a8199', font: { size: 11 }, callback: (v) => rupiah(v) },
      },
    },
  };
}

function shortDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default {
  components: { PeriodFilter },
  data() {
    return {
      periode: { period: 'month', start: '', end: '' },
      summary: null,
      chartData: null,
      recentTxns: [],
      insight: null,
      loading: false,
      chartPenjualan: null,
      chartPembelian: null,
      chartCashflow: null,
    };
  },
  computed: {
    // Kas minus hampir selalu berarti saldo pembuka belum dicatat, bukan usaha rugi.
    perluSaldoAwal() {
      return !!this.summary && Number(this.summary.kas_terkini) < 0 && !Number(this.summary.saldo_awal);
    },
    netCashflow() {
      if (!this.summary) return 0;
      return Number(this.summary.total_penjualan) - Number(this.summary.total_pembelian);
    },
    growthPenjualan() {
      return this.growth(this.summary?.total_penjualan, this.summary?.prev?.total_penjualan);
    },
    growthPembelian() {
      return this.growth(this.summary?.total_pembelian, this.summary?.prev?.total_pembelian);
    },
    dueList() {
      if (!this.insight) return [];
      return [
        ...this.insight.hutangDue.map((r) => ({ ...r, jenis: 'Hutang' })),
        ...this.insight.piutangDue.map((r) => ({ ...r, jenis: 'Piutang' })),
      ].sort((a, b) => new Date(a.jatuh_tempo) - new Date(b.jatuh_tempo));
    },
  },
  mounted() {
    this.load();
    this.loadRecentTxns();
    this.loadInsight();
  },
  watch: {
    periode: {
      handler() {
        this.load();
      },
      deep: true,
    },
  },
  methods: {
    rupiah, tanggalIndo,
    growth(current, prev) {
      const c = Number(current) || 0;
      const p = Number(prev) || 0;
      if (p === 0) return null;
      return ((c - p) / p) * 100;
    },
    fmtGrowth(g) {
      return (g >= 0 ? '+' : '') + g.toFixed(1).replace('.', ',') + '%';
    },
    go(path, query = {}) {
      this.$router.push({ path, query });
    },
    async loadInsight() {
      try {
        this.insight = await api.get('/dashboard/insight');
      } catch (e) { /* insight opsional */ }
    },
    async load() {
      this.loading = true;
      const params = new URLSearchParams({ period: this.periode.period });
      if (this.periode.period === 'custom') {
        if (this.periode.start) params.set('start', this.periode.start);
        if (this.periode.end) params.set('end', this.periode.end);
      }
      const qs = params.toString();
      const [summary, chart] = await Promise.all([
        api.get('/dashboard/summary?' + qs),
        api.get('/dashboard/chart?' + qs),
      ]);
      this.summary = summary;
      this.chartData = chart;
      this.loading = false;
      this.$nextTick(() => this.renderCharts());
    },
    async loadRecentTxns() {
      const [pjRes, pbRes] = await Promise.allSettled([
        api.get('/penjualan?limit=5'),
        api.get('/pembelian?limit=5'),
      ]);
      const txns = [];
      if (pjRes.status === 'fulfilled') {
        txns.push(...pjRes.value.data.map((r) => ({
          key: 'pj-' + r.id, type: 'penjualan', title: r.no_transaksi,
          pihak: r.pembeli_nama || 'Umum', tanggal: r.tanggal, total: r.total,
        })));
      }
      if (pbRes.status === 'fulfilled') {
        txns.push(...pbRes.value.data.map((r) => ({
          key: 'pb-' + r.id, type: 'pembelian', title: r.no_transaksi,
          pihak: r.supplier_nama || 'Umum', tanggal: r.tanggal, total: r.total,
        })));
      }
      txns.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      this.recentTxns = txns.slice(0, 8);
    },
    renderCharts() {
      const penjualanCtx = this.$refs.penjualanChart;
      const pembelianCtx = this.$refs.pembelianChart;
      const cashflowCtx = this.$refs.cashflowChart;
      if (!penjualanCtx || !pembelianCtx || !cashflowCtx || !this.chartData || !this.summary) return;

      if (this.chartPenjualan) this.chartPenjualan.destroy();
      if (this.chartPembelian) this.chartPembelian.destroy();
      if (this.chartCashflow) this.chartCashflow.destroy();

      this.chartPenjualan = new Chart(penjualanCtx, {
        type: 'line',
        data: {
          labels: this.chartData.penjualan.map((r) => shortDate(r.tanggal)),
          datasets: [{
            label: 'Penjualan',
            data: this.chartData.penjualan.map((r) => Number(r.total)),
            borderColor: COLOR_PENJUALAN,
            backgroundColor: 'rgba(79,70,229,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: COLOR_PENJUALAN,
            tension: 0.3,
            fill: true,
          }],
        },
        options: baseChartOptions(),
      });

      this.chartPembelian = new Chart(pembelianCtx, {
        type: 'line',
        data: {
          labels: this.chartData.pembelian.map((r) => shortDate(r.tanggal)),
          datasets: [{
            label: 'Pembelian',
            data: this.chartData.pembelian.map((r) => Number(r.total)),
            borderColor: COLOR_PEMBELIAN,
            backgroundColor: 'rgba(16,185,129,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: COLOR_PEMBELIAN,
            tension: 0.3,
            fill: true,
          }],
        },
        options: baseChartOptions(),
      });

      const penjualanVal = Number(this.summary.total_penjualan);
      const pembelianVal = Number(this.summary.total_pembelian);
      const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';

      this.chartCashflow = new Chart(cashflowCtx, {
        type: 'doughnut',
        data: {
          labels: ['Penjualan', 'Pembelian'],
          datasets: [{
            data: [penjualanVal, pembelianVal],
            backgroundColor: [COLOR_PENJUALAN, COLOR_PEMBELIAN],
            borderColor: surfaceColor || '#ffffff',
            borderWidth: 3,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${rupiah(ctx.parsed)}` } },
          },
        },
      });
    },
  },
  template: `
    <div>
      <PeriodFilter v-model="periode" />

      <template v-if="summary">
        <div class="dash-hero">
          <div class="dash-hero-pattern"></div>
          <div class="dash-hero-header">
            <span class="dash-hero-badge">Ringkasan Kas</span>
            <div class="dash-hero-logo">
              <img src="/img/logo.png" alt="Mitrayasa" />
            </div>
          </div>
          <div class="dash-hero-body">
            <div>
              <div class="dash-balance-label">Kas Terkini</div>
              <div class="dash-balance-value">{{ rupiah(summary.kas_terkini) }}</div>
              <div v-if="perluSaldoAwal" class="dash-balance-hint">
                Kas minus karena saldo awal belum diatur.
                <a href="#/pemasukan-kas" @click.prevent="go('/pemasukan-kas')">Atur saldo awal</a>
              </div>
            </div>
            <div class="dash-hero-stats">
              <div class="dash-hero-stat clickable-card" role="link" tabindex="0" @click="go('/laporan')" @keydown.enter="go('/laporan')">
                <div class="dash-hero-stat-icon income">&darr;</div>
                <div>
                  <div class="stat-label">Pemasukan</div>
                  <div class="stat-value">{{ rupiah(summary.kas_masuk) }}</div>
                </div>
              </div>
              <div class="dash-hero-stat clickable-card" role="link" tabindex="0" @click="go('/laporan')" @keydown.enter="go('/laporan')">
                <div class="dash-hero-stat-icon expense">&uarr;</div>
                <div>
                  <div class="stat-label">Pengeluaran</div>
                  <div class="stat-value">{{ rupiah(summary.kas_keluar) }}</div>
                </div>
              </div>
              <div class="dash-hero-stat clickable-card" role="link" tabindex="0" @click="go('/penjualan')" @keydown.enter="go('/penjualan')">
                <div class="dash-hero-stat-icon income">&darr;</div>
                <div>
                  <div class="stat-label">Penjualan</div>
                  <div class="stat-value">{{ rupiah(summary.total_penjualan) }}<span v-if="growthPenjualan !== null" class="growth-chip" :class="growthPenjualan >= 0 ? 'up' : 'down'">{{ fmtGrowth(growthPenjualan) }}</span></div>
                </div>
              </div>
              <div class="dash-hero-stat clickable-card" role="link" tabindex="0" @click="go('/pembelian')" @keydown.enter="go('/pembelian')">
                <div class="dash-hero-stat-icon expense">&uarr;</div>
                <div>
                  <div class="stat-label">Pembelian</div>
                  <div class="stat-value">{{ rupiah(summary.total_pembelian) }}<span v-if="growthPembelian !== null" class="growth-chip" :class="growthPembelian >= 0 ? 'up' : 'down'">{{ fmtGrowth(growthPembelian) }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mini-card-row">
          <div class="mini-card highlight clickable-card" role="link" tabindex="0" @click="go('/produk')" @keydown.enter="go('/produk')">
            <div class="icon-badge">&#128230;</div>
            <div class="mini-label">Total Produk</div>
            <div class="mini-value">{{ summary.total_produk }}</div>
          </div>
          <div class="mini-card clickable-card" role="link" tabindex="0" @click="go('/produk')" @keydown.enter="go('/produk')">
            <div class="icon-badge">&#128200;</div>
            <div class="mini-label">Total Stok</div>
            <div class="mini-value">{{ summary.total_stok }}</div>
          </div>
          <div class="mini-card clickable-card" role="link" tabindex="0" @click="go('/pembelian', { status: 'hutang' })" @keydown.enter="go('/pembelian', { status: 'hutang' })">
            <div class="icon-badge danger">&darr;</div>
            <div class="mini-label">Total Hutang</div>
            <div class="mini-value">{{ rupiah(summary.total_hutang) }}</div>
          </div>
          <div class="mini-card clickable-card" role="link" tabindex="0" @click="go('/penjualan', { status: 'piutang' })" @keydown.enter="go('/penjualan', { status: 'piutang' })">
            <div class="icon-badge warning">&uarr;</div>
            <div class="mini-label">Total Piutang</div>
            <div class="mini-value">{{ rupiah(summary.total_piutang) }}</div>
          </div>
        </div>

        <div class="dash-grid-2">
          <div class="card chart-card">
            <div class="card-header-row"><h3>Grafik Penjualan</h3></div>
            <div class="chart-canvas-wrap">
              <canvas ref="penjualanChart"></canvas>
            </div>
          </div>
          <div class="card chart-card">
            <div class="card-header-row"><h3>Grafik Pembelian</h3></div>
            <div class="chart-canvas-wrap">
              <canvas ref="pembelianChart"></canvas>
            </div>
          </div>
        </div>

        <div class="dash-grid-2">
          <div class="card cashflow-card">
            <div class="card-header-row"><h3>Cashflow</h3></div>
            <div class="donut-wrap">
              <canvas ref="cashflowChart"></canvas>
              <div class="donut-center">
                <div class="donut-center-label">Total Cashflow</div>
                <div class="donut-center-value">{{ rupiah(netCashflow) }}</div>
              </div>
            </div>
            <div class="cashflow-legend">
              <div class="legend-item"><span class="dot income"></span>Penjualan <strong>{{ rupiah(summary.total_penjualan) }}</strong></div>
              <div class="legend-item"><span class="dot expense"></span>Pembelian <strong>{{ rupiah(summary.total_pembelian) }}</strong></div>
            </div>
          </div>

          <div class="card txn-card">
            <div class="card-header-row"><h3>Transaksi Terbaru</h3></div>
            <div class="txn-list">
              <div v-if="recentTxns.length === 0" class="empty-state">Belum ada transaksi.</div>
              <div v-for="t in recentTxns" :key="t.key" class="txn-row">
                <div class="txn-icon" :class="t.type">{{ t.type === 'penjualan' ? '↓' : '↑' }}</div>
                <div class="txn-info">
                  <div class="txn-title">{{ t.title }}</div>
                  <div class="txn-sub">{{ tanggalIndo(t.tanggal) }} &middot; {{ t.pihak }}</div>
                </div>
                <div class="txn-amount" :class="t.type === 'penjualan' ? 'positive' : 'negative'">
                  {{ t.type === 'penjualan' ? '+' : '-' }} {{ rupiah(t.total) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dash-grid-2" v-if="insight">
          <div class="card">
            <div class="card-header-row"><h3>⚠ Stok Menipis</h3></div>
            <div class="insight-list">
              <div v-if="insight.lowStock.length === 0" class="insight-empty">Semua stok produk aman.</div>
              <div v-for="p in insight.lowStock" :key="p.id" class="insight-row">
                <div class="insight-info">
                  <div class="insight-title">{{ p.nama_produk }}</div>
                  <div class="insight-sub">{{ p.kode_produk }} &middot; minimum {{ p.stok_minimum }} {{ p.satuan }}</div>
                </div>
                <span class="badge" :class="p.stok <= 0 ? 'badge-danger' : 'badge-warning'">sisa {{ p.stok }} {{ p.satuan }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header-row"><h3>⏰ Jatuh Tempo (7 Hari ke Depan)</h3></div>
            <div class="insight-list">
              <div v-if="dueList.length === 0" class="insight-empty">Tidak ada hutang/piutang yang jatuh tempo.</div>
              <div v-for="d in dueList" :key="d.jenis + d.id" class="insight-row">
                <div class="insight-info">
                  <div class="insight-title">{{ d.no_transaksi }} &middot; {{ d.pihak_nama || '-' }}</div>
                  <div class="insight-sub">{{ d.jenis }} &middot; jatuh tempo {{ tanggalIndo(d.jatuh_tempo) }} &middot; sisa {{ rupiah(d.sisa) }}</div>
                </div>
                <span class="badge" :class="d.terlambat ? 'badge-danger' : 'badge-warning'">{{ d.terlambat ? 'Terlambat' : 'Segera' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="empty-state">Memuat dashboard...</div>
    </div>
  `,
};
