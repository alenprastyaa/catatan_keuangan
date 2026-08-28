const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const ALL_MENUS = [
  'dashboard', 'pembelian', 'penjualan', 'produk',
  'manajemen-user', 'pengeluaran-kas', 'pemasukan-kas', 'nota', 'laporan',
];

const getRoles = asyncHandler(async (req, res) => {
  const [roles] = await pool.query('SELECT * FROM roles ORDER BY id');
  const [menus] = await pool.query('SELECT role_id, menu_key FROM menu_access');

  const result = roles.map((role) => ({
    ...role,
    menu_access: menus.filter((m) => m.role_id === role.id).map((m) => m.menu_key),
  }));

  res.json({ data: result, availableMenus: ALL_MENUS });
});

const createRole = asyncHandler(async (req, res) => {
  const { nama_role, menu_access = [] } = req.body;
  if (!nama_role) return res.status(400).json({ message: 'Nama role wajib diisi.' });

  const [result] = await pool.query('INSERT INTO roles (nama_role) VALUES (?)', [nama_role]);
  const roleId = result.insertId;

  if (menu_access.length > 0) {
    const values = menu_access.map((key) => [roleId, key]);
    await pool.query('INSERT INTO menu_access (role_id, menu_key) VALUES ?', [values]);
  }

  res.status(201).json({ id: roleId });
});

const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nama_role, menu_access = [] } = req.body;

  if (nama_role) {
    await pool.query('UPDATE roles SET nama_role = ? WHERE id = ?', [nama_role, id]);
  }

  await pool.query('DELETE FROM menu_access WHERE role_id = ?', [id]);
  if (menu_access.length > 0) {
    const values = menu_access.map((key) => [id, key]);
    await pool.query('INSERT INTO menu_access (role_id, menu_key) VALUES ?', [values]);
  }

  res.json({ message: 'Role berhasil diperbarui.' });
});

const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [used] = await pool.query('SELECT id FROM admins WHERE role_id = ? LIMIT 1', [id]);
  if (used.length > 0) {
    return res.status(400).json({ message: 'Role masih digunakan oleh admin, tidak bisa dihapus.' });
  }
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
  res.json({ message: 'Role berhasil dihapus.' });
});

module.exports = { getRoles, createRole, updateRole, deleteRole };
