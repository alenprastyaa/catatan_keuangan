const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

async function syncOverdue() {
  await pool.query(
    `UPDATE nota SET status = 'overdue'
     WHERE status = 'unpaid' AND jatuh_tempo IS NOT NULL AND jatuh_tempo < CURDATE()`
  );
}

const getNota = asyncHandler(async (req, res) => {
  await syncOverdue();

  const { search = '', status = '', tipe = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const conditions = ['no_invoice LIKE ?'];
  const params = [like];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (tipe) {
    conditions.push('tipe = ?');
    params.push(tipe);
  }
  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT * FROM nota ${where} ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM nota ${where}`, params);

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const getNotaById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [[nota]] = await pool.query('SELECT * FROM nota WHERE id = ?', [id]);
  if (!nota) return res.status(404).json({ message: 'Nota tidak ditemukan.' });

  if (nota.tipe === 'penjualan') {
    const [[header]] = await pool.query(
      `SELECT p.*, b.nama AS pihak_nama, b.alamat AS pihak_alamat, b.telepon AS pihak_telepon
       FROM penjualan p LEFT JOIN pembeli b ON b.id = p.pembeli_id WHERE p.id = ?`,
      [nota.referensi_id]
    );
    const [items] = await pool.query(
      `SELECT pi.*, pr.nama_produk FROM penjualan_items pi JOIN produk pr ON pr.id = pi.produk_id WHERE pi.penjualan_id = ?`,
      [nota.referensi_id]
    );
    return res.json({ ...nota, transaksi: header, items });
  }

  const [[header]] = await pool.query(
    `SELECT p.*, s.nama AS pihak_nama, s.alamat AS pihak_alamat, s.telepon AS pihak_telepon
     FROM pembelian p LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id WHERE p.id = ?`,
    [nota.referensi_id]
  );
  const [items] = await pool.query(
    `SELECT pi.*, pr.nama_produk FROM pembelian_items pi JOIN produk pr ON pr.id = pi.produk_id WHERE pi.pembelian_id = ?`,
    [nota.referensi_id]
  );
  res.json({ ...nota, transaksi: header, items });
});

const createNota = asyncHandler(async (req, res) => {
  const { no_invoice, tipe, referensi_id, tanggal, jatuh_tempo, status } = req.body;
  if (!no_invoice || !tipe || !referensi_id || !tanggal) {
    return res.status(400).json({ message: 'No invoice, tipe, referensi, dan tanggal wajib diisi.' });
  }
  const [result] = await pool.query(
    `INSERT INTO nota (no_invoice, tipe, referensi_id, tanggal, jatuh_tempo, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [no_invoice, tipe, referensi_id, tanggal, jatuh_tempo || null, status || 'unpaid']
  );
  res.status(201).json({ id: result.insertId });
});

const updateNota = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { jatuh_tempo, status } = req.body;
  await pool.query('UPDATE nota SET jatuh_tempo=?, status=? WHERE id=?', [jatuh_tempo || null, status, id]);
  res.json({ message: 'Nota berhasil diperbarui.' });
});

const deleteNota = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM nota WHERE id = ?', [req.params.id]);
  res.json({ message: 'Nota berhasil dihapus.' });
});

module.exports = { getNota, getNotaById, createNota, updateNota, deleteNota };
