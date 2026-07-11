const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getKas = asyncHandler(async (req, res) => {
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
    `SELECT * FROM pengeluaran_kas ${where} ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM pengeluaran_kas ${where}`, params);

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const createKas = asyncHandler(async (req, res) => {
  const { tanggal, tipe, keterangan, jumlah } = req.body;
  if (!tanggal || !tipe || !jumlah) {
    return res.status(400).json({ message: 'Tanggal, tipe, dan jumlah wajib diisi.' });
  }
  const [result] = await pool.query(
    'INSERT INTO pengeluaran_kas (tanggal, tipe, keterangan, jumlah) VALUES (?, ?, ?, ?)',
    [tanggal, tipe, keterangan || null, jumlah]
  );
  res.status(201).json({ id: result.insertId });
});

const updateKas = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tanggal, tipe, keterangan, jumlah } = req.body;
  await pool.query(
    'UPDATE pengeluaran_kas SET tanggal=?, tipe=?, keterangan=?, jumlah=? WHERE id=?',
    [tanggal, tipe, keterangan || null, jumlah, id]
  );
  res.json({ message: 'Data berhasil diperbarui.' });
});

const deleteKas = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM pengeluaran_kas WHERE id = ?', [req.params.id]);
  res.json({ message: 'Data berhasil dihapus.' });
});

module.exports = { getKas, createKas, updateKas, deleteKas };
