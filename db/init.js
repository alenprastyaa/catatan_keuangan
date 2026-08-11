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

  // CREATE TABLE IF NOT EXISTS tidak menambah kolom baru pada instalasi lama.
  // Migrasi kecil ini menjaga database yang sudah berjalan tetap kompatibel.
  const [keteranganColumns] = await pool.query("SHOW COLUMNS FROM nota LIKE 'keterangan'");
  if (keteranganColumns.length === 0) {
    await pool.query('ALTER TABLE nota ADD COLUMN keterangan TEXT NULL AFTER status');
  }

  async function addColumnIfMissing(table, column, definition) {
    const [columns] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (columns.length === 0) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }

  for (const [column, definition] of [
    ['volume_pagi', 'DECIMAL(12,2) DEFAULT 0'], ['volume_sore', 'DECIMAL(12,2) DEFAULT 0'],
    ['kualitas_f', 'DECIMAL(8,2) NULL'], ['kualitas_s', 'DECIMAL(8,2) NULL'],
    ['kualitas_p', 'DECIMAL(8,2) NULL'], ['kualitas_ts', 'DECIMAL(8,2) NULL'],
    ['kualitas_ph', 'DECIMAL(8,2) NULL'], ['kualitas_w', 'DECIMAL(8,2) NULL'],
    ['potongan', 'DECIMAL(15,2) DEFAULT 0'],
  ]) await addColumnIfMissing('pembelian', column, definition);
  await addColumnIfMissing('penjualan', 'volume_pagi', 'DECIMAL(12,2) DEFAULT 0');
  await addColumnIfMissing('penjualan', 'volume_sore', 'DECIMAL(12,2) DEFAULT 0');
  await addColumnIfMissing('nota', 'pihak_nama', 'VARCHAR(150) NULL');
  await addColumnIfMissing('nota', 'pihak_alamat', 'TEXT NULL');
  await addColumnIfMissing('nota', 'pihak_telepon', 'VARCHAR(30) NULL');
  await addColumnIfMissing('nota', 'total_manual', 'DECIMAL(15,2) DEFAULT 0');
  // Volume susu dapat memiliki pecahan liter; pelebaran INT ke DECIMAL tidak mengubah nilai lama.
  await pool.query('ALTER TABLE produk MODIFY stok DECIMAL(12,2) DEFAULT 0, MODIFY stok_minimum DECIMAL(12,2) DEFAULT 0');
  await pool.query('ALTER TABLE pembelian_items MODIFY qty DECIMAL(12,2) NOT NULL');
  await pool.query('ALTER TABLE penjualan_items MODIFY qty DECIMAL(12,2) NOT NULL');
  const [refColumns] = await pool.query("SHOW COLUMNS FROM nota LIKE 'referensi_id'");
  if (refColumns[0] && refColumns[0].Null === 'NO') {
    await pool.query('ALTER TABLE nota MODIFY referensi_id INT NULL');
  }

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
