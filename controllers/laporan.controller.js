const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { resolvePeriode } = require('../utils/periode');

const laporanPelangganSupplier = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.*,
      COALESCE((SELECT COUNT(*) FROM pembelian p WHERE p.supplier_id = s.id), 0) AS jumlah_transaksi,
      COALESCE((SELECT SUM(p.total) FROM pembelian p WHERE p.supplier_id = s.id), 0) AS total_transaksi
    FROM pelanggan_supplier s
    ORDER BY s.nama
  `);
  res.json({ data: rows });
});

const laporanPembeli = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT b.*,
      COALESCE((SELECT COUNT(*) FROM penjualan p WHERE p.pembeli_id = b.id), 0) AS jumlah_transaksi,
      COALESCE((SELECT SUM(p.total) FROM penjualan p WHERE p.pembeli_id = b.id), 0) AS total_transaksi
    FROM pembeli b
    ORDER BY b.nama
  `);
  res.json({ data: rows });
});

const laporanLabaRugi = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);

  const [[{ total_penjualan }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS total_penjualan FROM penjualan WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );

  const [[{ hpp }]] = await pool.query(
    `SELECT COALESCE(SUM(pi.qty * pr.harga_beli),0) AS hpp
     FROM penjualan_items pi
     JOIN penjualan p ON p.id = pi.penjualan_id
     JOIN produk pr ON pr.id = pi.produk_id
     WHERE p.tanggal BETWEEN ? AND ?`,
    [start, end]
  );

  const [[{ total_pengeluaran }]] = await pool.query(
    'SELECT COALESCE(SUM(jumlah),0) AS total_pengeluaran FROM pengeluaran_kas WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );

  const labaKotor = Number(total_penjualan) - Number(hpp);
  const labaBersih = labaKotor - Number(total_pengeluaran);

  res.json({
    periode: { start, end },
    total_penjualan,
    hpp,
    laba_kotor: labaKotor,
    total_pengeluaran,
    laba_bersih: labaBersih,
  });
});

const laporanKas = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);

  const [masuk] = await pool.query(
    `SELECT pp.tanggal_bayar AS tanggal, 'Pembayaran Penjualan' AS keterangan, pp.jumlah_bayar AS jumlah, 'masuk' AS tipe
     FROM penjualan_pembayaran pp WHERE pp.tanggal_bayar BETWEEN ? AND ?`,
    [start, end]
  );
  const [keluarBeli] = await pool.query(
    `SELECT pp.tanggal_bayar AS tanggal, 'Pembayaran Pembelian' AS keterangan, pp.jumlah_bayar AS jumlah, 'keluar' AS tipe
     FROM pembelian_pembayaran pp WHERE pp.tanggal_bayar BETWEEN ? AND ?`,
    [start, end]
  );
  const [keluarKas] = await pool.query(
    `SELECT tanggal, CONCAT('Pengeluaran: ', tipe) AS keterangan, jumlah, 'keluar' AS tipe
     FROM pengeluaran_kas WHERE tanggal BETWEEN ? AND ?`,
    [start, end]
  );

  const rows = [...masuk, ...keluarBeli, ...keluarKas].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

  let saldo = 0;
  const dataWithSaldo = rows.map((r) => {
    saldo += r.tipe === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah);
    return { ...r, saldo };
  });

  const totalMasuk = masuk.reduce((s, r) => s + Number(r.jumlah), 0);
  const totalKeluar = [...keluarBeli, ...keluarKas].reduce((s, r) => s + Number(r.jumlah), 0);

  res.json({ periode: { start, end }, data: dataWithSaldo, total_masuk: totalMasuk, total_keluar: totalKeluar });
});

const laporanPenjualan = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);
  const [rows] = await pool.query(
    `SELECT p.*, b.nama AS pembeli_nama FROM penjualan p
     LEFT JOIN pembeli b ON b.id = p.pembeli_id
     WHERE p.tanggal BETWEEN ? AND ? ORDER BY p.tanggal`,
    [start, end]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS total FROM penjualan WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );
  res.json({ periode: { start, end }, data: rows, total });
});

const laporanPembelian = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);
  const [rows] = await pool.query(
    `SELECT p.*, s.nama AS supplier_nama FROM pembelian p
     LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id
     WHERE p.tanggal BETWEEN ? AND ? ORDER BY p.tanggal`,
    [start, end]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) AS total FROM pembelian WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );
  res.json({ periode: { start, end }, data: rows, total });
});

const laporanHutangPiutang = asyncHandler(async (req, res) => {
  const [hutang] = await pool.query(`
    SELECT p.id, p.no_transaksi, p.tanggal, p.jatuh_tempo, p.total,
      COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran pp WHERE pp.pembelian_id = p.id),0) AS sudah_bayar,
      s.nama AS pihak_nama
    FROM pembelian p LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id
    WHERE p.status != 'lunas' ORDER BY p.jatuh_tempo
  `);
  const [piutang] = await pool.query(`
    SELECT p.id, p.no_transaksi, p.tanggal, p.jatuh_tempo, p.total,
      COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran pp WHERE pp.penjualan_id = p.id),0) AS sudah_bayar,
      b.nama AS pihak_nama
    FROM penjualan p LEFT JOIN pembeli b ON b.id = p.pembeli_id
    WHERE p.status != 'lunas' ORDER BY p.jatuh_tempo
  `);

  const withSisa = (rows) => rows.map((r) => ({ ...r, sisa: Number(r.total) - Number(r.sudah_bayar) }));

  res.json({ hutang: withSisa(hutang), piutang: withSisa(piutang) });
});

const laporanPengeluaran = asyncHandler(async (req, res) => {
  const { start, end } = resolvePeriode(req.query);

  const [rows] = await pool.query(
    'SELECT * FROM pengeluaran_kas WHERE tanggal BETWEEN ? AND ? ORDER BY tanggal, id',
    [start, end]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COALESCE(SUM(jumlah),0) AS total FROM pengeluaran_kas WHERE tanggal BETWEEN ? AND ?',
    [start, end]
  );
  const [byTipe] = await pool.query(
    `SELECT tipe, COALESCE(SUM(jumlah),0) AS total FROM pengeluaran_kas
     WHERE tanggal BETWEEN ? AND ? GROUP BY tipe ORDER BY total DESC`,
    [start, end]
  );

  res.json({ periode: { start, end }, data: rows, total, by_tipe: byTipe });
});

const dataSupplierKonsumen = asyncHandler(async (req, res) => {
  const [supplier] = await pool.query("SELECT * FROM pelanggan_supplier ORDER BY nama");
  const [konsumen] = await pool.query('SELECT * FROM pembeli ORDER BY nama');
  res.json({ supplier, konsumen });
});

module.exports = {
  laporanPelangganSupplier,
  laporanPembeli,
  laporanLabaRugi,
  laporanKas,
  laporanPenjualan,
  laporanPembelian,
  laporanPengeluaran,
  laporanHutangPiutang,
  dataSupplierKonsumen,
};
