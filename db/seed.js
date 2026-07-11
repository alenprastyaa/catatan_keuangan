// Membuat akun Super Admin default. Jalankan setelah schema.sql di-import: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const username = 'admin';
  const password = 'admin123';

  const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
  if (existing.length > 0) {
    console.log('Akun admin sudah ada, tidak membuat ulang.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admins (nama, username, email, password_hash, role_id, status)
     VALUES (?, ?, ?, ?, ?, 'aktif')`,
    ['Super Admin', username, 'admin@example.com', passwordHash, 1]
  );

  console.log('Akun Super Admin berhasil dibuat.');
  console.log('username:', username);
  console.log('password:', password);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Gagal seeding:', err.message);
  process.exit(1);
});
