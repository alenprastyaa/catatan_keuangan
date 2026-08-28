const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { readSaldoAwal } = require('../utils/saldoAwal');

const getPemasukan = asyncHandler(async (req, res) => {
  const { search = '', tipe = '', start = '', end = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const conditions = ['(keterangan LIKE ? OR tipe LIKE ?)'];
  const params = [like, like];
  if (tipe) {
    conditions.push('tipe = ?');
    params.push(tipe);
  }
  if (start) {
    conditions.push('tanggal >= ?');
    params.push(start);
  }
  if (end) {
    conditions.push('tanggal <= ?');
    params.push(end);
  }
  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT * FROM pemasukan_kas ${where} ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM pemasukan_kas ${where}`, params);
  const [[{ total_jumlah }]] = await pool.query(
    `SELECT COALESCE(SUM(jumlah),0) AS total_jumlah FROM pemasukan_kas ${where}`,
    params
  );

  res.json({ data: rows, total, total_jumlah, page: Number(page), limit: Number(limit) });
});

const createPemasukan = asyncHandler(async (req, res) => {
  const { tanggal, tipe, keterangan, jumlah } = req.body;
  if (!tanggal || !tipe || !jumlah) {
    return res.status(400).json({ message: 'Tanggal, tipe, dan jumlah wajib diisi.' });
  }
  const [result] = await pool.query(
    'INSERT INTO pemasukan_kas (tanggal, tipe, keterangan, jumlah) VALUES (?, ?, ?, ?)',
    [tanggal, tipe, keterangan || null, jumlah]
  );
  res.status(201).json({ id: result.insertId });
});

const updatePemasukan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tanggal, tipe, keterangan, jumlah } = req.body;
  await pool.query(
    'UPDATE pemasukan_kas SET tanggal=?, tipe=?, keterangan=?, jumlah=? WHERE id=?',
    [tanggal, tipe, keterangan || null, jumlah, id]
  );
  res.json({ message: 'Data berhasil diperbarui.' });
});

const deletePemasukan = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM pemasukan_kas WHERE id = ?', [req.params.id]);
  res.json({ message: 'Data berhasil dihapus.' });
});

// Saldo awal kas: uang yang sudah dipegang usaha sebelum pencatatan dimulai.
// Tanpa ini, kas terkini selalu minus karena pengeluaran lama tercatat tetapi
// uang pembukanya tidak.
const getSaldoAwal = asyncHandler(async (req, res) => {
  res.json(await readSaldoAwal());
});

const updateSaldoAwal = asyncHandler(async (req, res) => {
  const { jumlah, tanggal } = req.body;
  const nilai = Number(jumlah);
  if (!Number.isFinite(nilai)) {
    return res.status(400).json({ message: 'Jumlah saldo awal tidak valid.' });
  }
  await pool.query(
    'INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)',
    ['saldo_awal_kas', String(nilai)]
  );
  await pool.query(
    'INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)',
    ['saldo_awal_tanggal', tanggal || null]
  );
  res.json({ message: 'Saldo awal berhasil disimpan.' });
});

module.exports = {
  getPemasukan,
  createPemasukan,
  updatePemasukan,
  deletePemasukan,
  getSaldoAwal,
  updateSaldoAwal,
};
