-- Jalankan file ini di MySQL sebelum menjalankan aplikasi
-- Contoh: mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS catatan_keuangan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE catatan_keuangan;

-- =========================
-- ROLE & MENU ACCESS
-- =========================
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_role VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  menu_key VARCHAR(50) NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_menu (role_id, menu_key)
);

-- =========================
-- ADMIN (user login)
-- =========================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  status ENUM('aktif','nonaktif') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- =========================
-- PELANGGAN / SUPPLIER & PEMBELI
-- =========================
CREATE TABLE IF NOT EXISTS pelanggan_supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  tipe ENUM('pelanggan','supplier','keduanya') NOT NULL DEFAULT 'supplier',
  telepon VARCHAR(30),
  alamat TEXT,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pembeli (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  telepon VARCHAR(30),
  alamat TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PRODUK
-- =========================
CREATE TABLE IF NOT EXISTS produk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode_produk VARCHAR(50) NOT NULL UNIQUE,
  nama_produk VARCHAR(150) NOT NULL,
  kategori VARCHAR(100),
  satuan VARCHAR(30) DEFAULT 'pcs',
  harga_beli DECIMAL(15,2) DEFAULT 0,
  harga_jual DECIMAL(15,2) DEFAULT 0,
  stok DECIMAL(12,2) DEFAULT 0,
  stok_minimum DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PEMBELIAN
-- =========================
CREATE TABLE IF NOT EXISTS pembelian (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_transaksi VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT,
  tanggal DATE NOT NULL,
  total DECIMAL(15,2) DEFAULT 0,
  status ENUM('lunas','hutang','sebagian') DEFAULT 'hutang',
  jatuh_tempo DATE,
  catatan TEXT,
  volume_pagi DECIMAL(12,2) DEFAULT 0,
  volume_sore DECIMAL(12,2) DEFAULT 0,
  kualitas_f DECIMAL(8,2) NULL,
  kualitas_s DECIMAL(8,2) NULL,
  kualitas_p DECIMAL(8,2) NULL,
  kualitas_ts DECIMAL(8,2) NULL,
  kualitas_ph DECIMAL(8,2) NULL,
  kualitas_w DECIMAL(8,2) NULL,
  potongan DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES pelanggan_supplier(id)
);

CREATE TABLE IF NOT EXISTS pembelian_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id INT NOT NULL,
  produk_id INT NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  harga_satuan DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE,
  FOREIGN KEY (produk_id) REFERENCES produk(id)
);

CREATE TABLE IF NOT EXISTS pembelian_pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id INT NOT NULL,
  tanggal_bayar DATE NOT NULL,
  jumlah_bayar DECIMAL(15,2) NOT NULL,
  keterangan VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pembelian_potongan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id INT NOT NULL,
  keterangan VARCHAR(150) NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE
);

-- =========================
-- PENJUALAN
-- =========================
CREATE TABLE IF NOT EXISTS penjualan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_transaksi VARCHAR(50) NOT NULL UNIQUE,
  pembeli_id INT,
  tanggal DATE NOT NULL,
  total DECIMAL(15,2) DEFAULT 0,
  status ENUM('lunas','piutang','sebagian') DEFAULT 'piutang',
  jatuh_tempo DATE,
  catatan TEXT,
  volume_pagi DECIMAL(12,2) DEFAULT 0,
  volume_sore DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pembeli_id) REFERENCES pembeli(id)
);

CREATE TABLE IF NOT EXISTS penjualan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  penjualan_id INT NOT NULL,
  produk_id INT NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  harga_satuan DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (penjualan_id) REFERENCES penjualan(id) ON DELETE CASCADE,
  FOREIGN KEY (produk_id) REFERENCES produk(id)
);

CREATE TABLE IF NOT EXISTS penjualan_pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  penjualan_id INT NOT NULL,
  tanggal_bayar DATE NOT NULL,
  jumlah_bayar DECIMAL(15,2) NOT NULL,
  keterangan VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (penjualan_id) REFERENCES penjualan(id) ON DELETE CASCADE
);

-- =========================
-- PENGELUARAN KAS
-- =========================
CREATE TABLE IF NOT EXISTS pengeluaran_kas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  tipe VARCHAR(50) NOT NULL,
  keterangan VARCHAR(255),
  jumlah DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PEMASUKAN KAS (modal, pinjaman, pendapatan lain di luar penjualan)
-- =========================
CREATE TABLE IF NOT EXISTS pemasukan_kas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  tipe VARCHAR(50) NOT NULL,
  keterangan VARCHAR(255),
  jumlah DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PENGATURAN (key-value, mis. saldo awal kas)
-- =========================
CREATE TABLE IF NOT EXISTS pengaturan (
  kunci VARCHAR(50) PRIMARY KEY,
  nilai TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================
-- NOTA / INVOICE
-- =========================
CREATE TABLE IF NOT EXISTS nota (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_invoice VARCHAR(50) NOT NULL UNIQUE,
  tipe ENUM('penjualan','pembelian') NOT NULL,
  judul VARCHAR(120) NULL,
  referensi_id INT NULL,
  tanggal DATE NOT NULL,
  jatuh_tempo DATE,
  status ENUM('paid','unpaid','overdue') DEFAULT 'unpaid',
  keterangan TEXT,
  pihak_nama VARCHAR(150) NULL,
  pihak_alamat TEXT NULL,
  pihak_telepon VARCHAR(30) NULL,
  total_manual DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nota_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nota_id INT NOT NULL,
  nama_item VARCHAR(150) NOT NULL,
  qty DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30) DEFAULT 'pcs',
  harga_satuan DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (nota_id) REFERENCES nota(id) ON DELETE CASCADE
);

-- =========================
-- SEED DATA DASAR (roles & menu access)
-- =========================
INSERT IGNORE INTO roles (id, nama_role) VALUES
  (1, 'Super Admin'),
  (2, 'Admin'),
  (3, 'Kasir');

INSERT IGNORE INTO menu_access (role_id, menu_key) VALUES
  (1,'dashboard'),(1,'pembelian'),(1,'penjualan'),(1,'produk'),
  (1,'manajemen-user'),(1,'pengeluaran-kas'),(1,'pemasukan-kas'),(1,'nota'),(1,'laporan'),
  (2,'dashboard'),(2,'pembelian'),(2,'penjualan'),(2,'produk'),
  (2,'pengeluaran-kas'),(2,'pemasukan-kas'),(2,'nota'),(2,'laporan'),
  (3,'dashboard'),(3,'penjualan'),(3,'produk'),(3,'nota');

-- Catatan: user admin default dibuat lewat `npm run seed` (perlu hashing password),
-- bukan lewat file SQL ini.
