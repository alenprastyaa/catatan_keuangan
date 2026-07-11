const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }

  const [rows] = await pool.query(
    `SELECT a.id, a.nama, a.username, a.password_hash, a.status, a.role_id, r.nama_role
     FROM admins a JOIN roles r ON r.id = a.role_id
     WHERE a.username = ?`,
    [username]
  );

  const admin = rows[0];
  if (!admin || admin.status !== 'aktif') {
    return res.status(401).json({ message: 'Username atau password salah.' });
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return res.status(401).json({ message: 'Username atau password salah.' });
  }

  const payload = {
    id: admin.id,
    username: admin.username,
    nama: admin.nama,
    role_id: admin.role_id,
    role_nama: admin.nama_role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  const [menus] = await pool.query('SELECT menu_key FROM menu_access WHERE role_id = ?', [admin.role_id]);

  res.json({
    token,
    user: payload,
    menuAccess: menus.map((m) => m.menu_key),
  });
});

const me = asyncHandler(async (req, res) => {
  const [menus] = await pool.query('SELECT menu_key FROM menu_access WHERE role_id = ?', [req.user.role_id]);
  res.json({ user: req.user, menuAccess: menus.map((m) => m.menu_key) });
});

module.exports = { login, me };
