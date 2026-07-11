const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const [rows] = await pool.query(
    `SELECT * FROM pembeli WHERE nama LIKE ? OR telepon LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    [like, like, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM pembeli WHERE nama LIKE ? OR telepon LIKE ?',
    [like, like]
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const create = asyncHandler(async (req, res) => {
  const { nama, telepon, alamat } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama wajib diisi.' });

  const [result] = await pool.query(
    'INSERT INTO pembeli (nama, telepon, alamat) VALUES (?, ?, ?)',
    [nama, telepon || null, alamat || null]
  );
  res.status(201).json({ id: result.insertId });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nama, telepon, alamat } = req.body;
  await pool.query('UPDATE pembeli SET nama=?, telepon=?, alamat=? WHERE id=?', [nama, telepon || null, alamat || null, id]);
  res.json({ message: 'Data berhasil diperbarui.' });
});

const remove = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM pembeli WHERE id = ?', [req.params.id]);
  res.json({ message: 'Data berhasil dihapus.' });
});

module.exports = { getAll, create, update, remove };
