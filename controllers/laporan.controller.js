const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { resolvePeriode } = require('../utils/periode');
const { readSaldoAwal } = require('../utils/saldoAwal');

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
  const [masukLain] = await pool.query(
    `SELECT tanggal, CONCAT('Pemasukan: ', tipe) AS keterangan, jumlah, 'masuk' AS tipe
     FROM pemasukan_kas WHERE tanggal BETWEEN ? AND ?`,
    [start, end]
  );

  // Saldo berjalan harus mulai dari posisi kas sebenarnya di awal periode,
  // yaitu saldo awal usaha ditambah seluruh mutasi sebelum tanggal mulai.
  const saldoAwalUsaha = await readSaldoAwal();
  const [[{ mutasi_sebelumnya }]] = await pool.query(
    `SELECT
       COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran WHERE tanggal_bayar < ?),0)
     + COALESCE((SELECT SUM(jumlah) FROM pemasukan_kas WHERE tanggal < ?),0)
     - COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran WHERE tanggal_bayar < ?),0)
     - COALESCE((SELECT SUM(jumlah) FROM pengeluaran_kas WHERE tanggal < ?),0) AS mutasi_sebelumnya`,
    [start, start, start, start]
  );
  const saldoAwalPeriode = saldoAwalUsaha.jumlah + Number(mutasi_sebelumnya);

  const rows = [...masuk, ...masukLain, ...keluarBeli, ...keluarKas].sort(
    (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
  );

  let saldo = saldoAwalPeriode;
  const dataWithSaldo = rows.map((r) => {
    saldo += r.tipe === 'masuk' ? Number(r.jumlah) : -Number(r.jumlah);
    return { ...r, saldo };
  });

  const totalMasuk = [...masuk, ...masukLain].reduce((s, r) => s + Number(r.jumlah), 0);
  const totalKeluar = [...keluarBeli, ...keluarKas].reduce((s, r) => s + Number(r.jumlah), 0);

  res.json({
    periode: { start, end },
    data: dataWithSaldo,
    saldo_awal: saldoAwalPeriode,
    saldo_akhir: saldo,
    total_masuk: totalMasuk,
    total_keluar: totalKeluar,
  });
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
  const totalVolume = rows.reduce((sum, row) => sum + Number(row.volume_pagi || 0) + Number(row.volume_sore || 0), 0);
  res.json({ periode: { start, end }, data: rows, total, total_volume: totalVolume });
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
  const totalVolume = rows.reduce((sum, row) => sum + Number(row.volume_pagi || 0) + Number(row.volume_sore || 0), 0);
  res.json({ periode: { start, end }, data: rows, total, total_volume: totalVolume });
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

const laporanIndividu = asyncHandler(async (req, res) => {
  const { tipe = 'supplier', id = '' } = req.query;
  if (!['supplier', 'pembeli'].includes(tipe)) return res.status(400).json({ message: 'Tipe individu tidak valid.' });

  const [options] = tipe === 'supplier'
    ? await pool.query("SELECT id, nama, telepon, alamat FROM pelanggan_supplier WHERE tipe IN ('supplier','keduanya') ORDER BY nama")
    : await pool.query('SELECT id, nama, telepon, alamat FROM pembeli ORDER BY nama');
  if (!id) return res.json({ tipe, options, individu: null, transaksi: [], pembayaran: [], ringkasan: null });
  const { start, end } = resolvePeriode(req.query);

  const individu = options.find((row) => Number(row.id) === Number(id));
  if (!individu) return res.status(404).json({ message: 'Data individu tidak ditemukan.' });
  const dateSql = ' AND t.tanggal BETWEEN ? AND ?';
  const params = [id, start, end];
  let transaksi;
  let pembayaran = [];
  if (tipe === 'supplier') {
    [transaksi] = await pool.query(
      `SELECT t.*, (COALESCE(t.volume_pagi,0)+COALESCE(t.volume_sore,0)) AS volume_liter,
       COALESCE((SELECT SUM(pi.qty) FROM pembelian_items pi WHERE pi.pembelian_id=t.id),0) AS qty,
       COALESCE((SELECT SUM(pi.subtotal)/NULLIF(SUM(pi.qty),0) FROM pembelian_items pi WHERE pi.pembelian_id=t.id),0) AS harga_satuan,
       COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran p WHERE p.pembelian_id=t.id),0) AS sudah_bayar
       FROM pembelian t WHERE t.supplier_id=?${dateSql} ORDER BY t.tanggal, t.id`, params
    );
    [pembayaran] = await pool.query(
      `SELECT pp.id, pp.tanggal_bayar, pp.jumlah_bayar, pp.keterangan, t.no_transaksi
       FROM pembelian_pembayaran pp
       JOIN pembelian t ON t.id=pp.pembelian_id
       WHERE t.supplier_id=?${dateSql}
       ORDER BY pp.tanggal_bayar, pp.id`,
      params
    );
    if (transaksi.length) {
      const ids = transaksi.map((row) => row.id);
      const [potonganRows] = await pool.query(
        `SELECT pembelian_id, id, keterangan, jumlah FROM pembelian_potongan
         WHERE pembelian_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
        ids
      );
      const byTransaction = potonganRows.reduce((map, row) => {
        if (!map[row.pembelian_id]) map[row.pembelian_id] = [];
        map[row.pembelian_id].push(row);
        return map;
      }, {});
      transaksi = transaksi.map((row) => ({ ...row, potongan_items: byTransaction[row.id] || [] }));
    }
  } else {
    [transaksi] = await pool.query(
      `SELECT t.*, (COALESCE(t.volume_pagi,0)+COALESCE(t.volume_sore,0)) AS volume_liter,
       COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran p WHERE p.penjualan_id=t.id),0) AS sudah_bayar
       FROM penjualan t WHERE t.pembeli_id=?${dateSql} ORDER BY t.tanggal, t.id`, params
    );
  }
  const ringkasan = transaksi.reduce((acc, row) => {
    acc.jumlah_transaksi += 1;
    acc.total_volume += Number(row.volume_liter || 0);
    acc.total_nilai += Number(row.total || 0);
    acc.total_bayar += Number(row.sudah_bayar || 0);
    acc.sisa += Number(row.total || 0) - Number(row.sudah_bayar || 0);
    return acc;
  }, { jumlah_transaksi: 0, total_volume: 0, total_nilai: 0, total_bayar: 0, sisa: 0 });
  res.json({ tipe, options, individu, transaksi, pembayaran, ringkasan, periode: { start, end } });
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
  laporanIndividu,
};
