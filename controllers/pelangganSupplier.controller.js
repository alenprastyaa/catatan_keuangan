const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const { search = '', tipe = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const conditions = ['(nama LIKE ? OR telepon LIKE ? OR email LIKE ?)'];
  const params = [like, like, like];
  if (tipe) {
    conditions.push('tipe = ?');
    params.push(tipe);
  }
  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT * FROM pelanggan_supplier ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM pelanggan_supplier ${where}`, params);

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const create = asyncHandler(async (req, res) => {
  const { nama, tipe, telepon, alamat, email } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama wajib diisi.' });

  const [result] = await pool.query(
    'INSERT INTO pelanggan_supplier (nama, tipe, telepon, alamat, email) VALUES (?, ?, ?, ?, ?)',
    [nama, tipe || 'supplier', telepon || null, alamat || null, email || null]
  );
  res.status(201).json({ id: result.insertId });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nama, tipe, telepon, alamat, email } = req.body;
  await pool.query(
    'UPDATE pelanggan_supplier SET nama=?, tipe=?, telepon=?, alamat=?, email=? WHERE id=?',
    [nama, tipe || 'supplier', telepon || null, alamat || null, email || null, id]
  );
  res.json({ message: 'Data berhasil diperbarui.' });
});

const remove = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM pelanggan_supplier WHERE id = ?', [req.params.id]);
  res.json({ message: 'Data berhasil dihapus.' });
});

module.exports = { getAll, create, update, remove };
