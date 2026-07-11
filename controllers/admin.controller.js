const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const [rows] = await pool.query(
    `SELECT a.id, a.nama, a.username, a.email, a.status, a.role_id, r.nama_role, a.created_at
     FROM admins a JOIN roles r ON r.id = a.role_id
     WHERE a.nama LIKE ? OR a.username LIKE ? OR a.email LIKE ?
     ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    [like, like, like, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM admins WHERE nama LIKE ? OR username LIKE ? OR email LIKE ?',
    [like, like, like]
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const create = asyncHandler(async (req, res) => {
  const { nama, username, email, password, role_id, status } = req.body;
  if (!nama || !username || !password || !role_id) {
    return res.status(400).json({ message: 'Nama, username, password, dan role wajib diisi.' });
  }

  const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Username sudah digunakan.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO admins (nama, username, email, password_hash, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nama, username, email || null, passwordHash, role_id, status || 'aktif']
  );
  res.status(201).json({ id: result.insertId });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nama, username, email, password, role_id, status } = req.body;

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE admins SET nama=?, username=?, email=?, password_hash=?, role_id=?, status=? WHERE id=?`,
      [nama, username, email || null, passwordHash, role_id, status || 'aktif', id]
    );
  } else {
    await pool.query(
      `UPDATE admins SET nama=?, username=?, email=?, role_id=?, status=? WHERE id=?`,
      [nama, username, email || null, role_id, status || 'aktif', id]
    );
  }

  res.json({ message: 'Admin berhasil diperbarui.' });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'Tidak bisa menghapus akun yang sedang digunakan.' });
  }
  await pool.query('DELETE FROM admins WHERE id = ?', [id]);
  res.json({ message: 'Admin berhasil dihapus.' });
});

module.exports = { getAll, create, update, remove };
