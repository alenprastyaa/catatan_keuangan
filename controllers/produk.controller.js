const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getProduk = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const [rows] = await pool.query(
    `SELECT * FROM produk
     WHERE nama_produk LIKE ? OR kode_produk LIKE ? OR kategori LIKE ?
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [like, like, like, Number(limit), offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM produk
     WHERE nama_produk LIKE ? OR kode_produk LIKE ? OR kategori LIKE ?`,
    [like, like, like]
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const getProdukById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM produk WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
  res.json(rows[0]);
});

const createProduk = asyncHandler(async (req, res) => {
  const { kode_produk, nama_produk, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum } = req.body;
  if (!kode_produk || !nama_produk) {
    return res.status(400).json({ message: 'Kode dan nama produk wajib diisi.' });
  }

  const [result] = await pool.query(
    `INSERT INTO produk (kode_produk, nama_produk, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [kode_produk, nama_produk, kategori || null, satuan || 'pcs', harga_beli || 0, harga_jual || 0, stok || 0, stok_minimum || 0]
  );

  res.status(201).json({ id: result.insertId });
});

const updateProduk = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { kode_produk, nama_produk, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum } = req.body;

  await pool.query(
    `UPDATE produk SET kode_produk=?, nama_produk=?, kategori=?, satuan=?, harga_beli=?, harga_jual=?, stok=?, stok_minimum=?
     WHERE id=?`,
    [kode_produk, nama_produk, kategori || null, satuan || 'pcs', harga_beli || 0, harga_jual || 0, stok || 0, stok_minimum || 0, id]
  );

  res.json({ message: 'Produk berhasil diperbarui.' });
});

const deleteProduk = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM produk WHERE id = ?', [req.params.id]);
  res.json({ message: 'Produk berhasil dihapus.' });
});

module.exports = { getProduk, getProdukById, createProduk, updateProduk, deleteProduk };
