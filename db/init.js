// Inisialisasi database otomatis saat server start:
// menjalankan schema.sql (CREATE TABLE IF NOT EXISTS) dan membuat admin default bila belum ada.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDb() {
  // koneksi tanpa memilih database, agar CREATE DATABASE di schema.sql bisa jalan
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(schema);
  await conn.end();

  const pool = require('../config/db');
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM admins');
  if (n === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO admins (nama, username, email, password_hash, role_id, status)
       VALUES ('Super Admin', 'admin', 'admin@example.com', ?, 1, 'aktif')`,
      [hash]
    );
    console.log('Akun default dibuat -> username: admin, password: admin123 (segera ganti!)');
  }
}

module.exports = initDb;
