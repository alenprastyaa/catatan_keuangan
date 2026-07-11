const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan, silakan login kembali.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, nama, role_id, role_nama }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

function checkMenuAccess(menuKey) {
  return async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT id FROM menu_access WHERE role_id = ? AND menu_key = ?',
        [req.user.role_id, menuKey]
      );
      if (rows.length === 0) {
        return res.status(403).json({ message: 'Anda tidak memiliki akses ke menu ini.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { verifyToken, checkMenuAccess };
