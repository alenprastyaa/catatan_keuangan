const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { resolvePeriode } = require('../utils/periode');

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

const getSummary = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);

  // periode pembanding: rentang dengan panjang sama, tepat sebelum periode aktif
  const startD = new Date(start);
  const endD = new Date(end);
  const days = Math.round((endD - startD) / 86400000) + 1;
  const prevEnd = new Date(startD);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));

  const [[{ total_produk }]] = await pool.query('SELECT COUNT(*) AS total_produk FROM produk');
  const [[{ total_stok }]] = await pool.query('SELECT COALESCE(SUM(stok),0) AS total_stok FROM produk');

  const [[{ masuk }]] = await pool.query('SELECT COALESCE(SUM(jumlah_bayar),0) AS masuk FROM penjualan_pembayaran');
  const [[{ keluar_beli }]] = await pool.query('SELECT COALESCE(SUM(jumlah_bayar),0) AS keluar_beli FROM pembelian_pembayaran');
  const [[{ keluar_kas }]] = await pool.query('SELECT COALESCE(SUM(jumlah),0) AS keluar_kas FROM pengeluaran_kas');
  const kasTerkini = Number(masuk) - Number(keluar_beli) - Number(keluar_kas);

  const [[{ total_penjualan }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS total_penjualan FROM penjualan WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );
  const [[{ total_pembelian }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS total_pembelian FROM pembelian WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );

  const [[{ prev_penjualan }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS prev_penjualan FROM penjualan WHERE tanggal BETWEEN ? AND ?',
    [toDateStr(prevStart), toDateStr(prevEnd)]
  );
  const [[{ prev_pembelian }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS prev_pembelian FROM pembelian WHERE tanggal BETWEEN ? AND ?',
    [toDateStr(prevStart), toDateStr(prevEnd)]
  );

  const [[{ total_hutang }]] = await pool.query(`
    SELECT COALESCE(SUM(sisa),0) AS total_hutang FROM (
      SELECT p.total - COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran pp WHERE pp.pembelian_id = p.id),0) AS sisa
      FROM pembelian p WHERE p.status != 'lunas'
    ) x
  `);
  const [[{ total_piutang }]] = await pool.query(`
    SELECT COALESCE(SUM(sisa),0) AS total_piutang FROM (
      SELECT p.total - COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran pp WHERE pp.penjualan_id = p.id),0) AS sisa
      FROM penjualan p WHERE p.status != 'lunas'
    ) x
  `);

  res.json({
    periode: { start, end },
    total_produk,
    total_stok,
    kas_terkini: kasTerkini,
    total_penjualan,
    total_pembelian,
    total_hutang,
    total_piutang,
    prev: { total_penjualan: prev_penjualan, total_pembelian: prev_pembelian },
  });
});

const getInsight = asyncHandler(async (req, res) => {
  const [lowStock] = await pool.query(
    `SELECT id, kode_produk, nama_produk, stok, stok_minimum, satuan
     FROM produk WHERE stok <= stok_minimum ORDER BY (stok - stok_minimum) ASC LIMIT 10`
  );

  const [hutangDue] = await pool.query(`
    SELECT p.id, p.no_transaksi, p.jatuh_tempo, s.nama AS pihak_nama,
      (p.total - COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran pp WHERE pp.pembelian_id = p.id),0)) AS sisa,
      (p.jatuh_tempo < CURDATE()) AS terlambat
    FROM pembelian p LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id
    WHERE p.status != 'lunas' AND p.jatuh_tempo IS NOT NULL
      AND p.jatuh_tempo <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY p.jatuh_tempo ASC LIMIT 10
  `);

  const [piutangDue] = await pool.query(`
    SELECT p.id, p.no_transaksi, p.jatuh_tempo, b.nama AS pihak_nama,
      (p.total - COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran pp WHERE pp.penjualan_id = p.id),0)) AS sisa,
      (p.jatuh_tempo < CURDATE()) AS terlambat
    FROM penjualan p LEFT JOIN pembeli b ON b.id = p.pembeli_id
    WHERE p.status != 'lunas' AND p.jatuh_tempo IS NOT NULL
      AND p.jatuh_tempo <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY p.jatuh_tempo ASC LIMIT 10
  `);

  res.json({ lowStock, hutangDue, piutangDue });
});

const getChart = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);

  const [penjualan] = await pool.query(
    `SELECT tanggal, SUM(total) AS total FROM penjualan WHERE tanggal BETWEEN ? AND ? GROUP BY tanggal ORDER BY tanggal`,
    [start, end]
  );
  const [pembelian] = await pool.query(
    `SELECT tanggal, SUM(total) AS total FROM pembelian WHERE tanggal BETWEEN ? AND ? GROUP BY tanggal ORDER BY tanggal`,
    [start, end]
  );

  res.json({ periode: { start, end }, penjualan, pembelian });
});

module.exports = { getSummary, getChart, getInsight };
