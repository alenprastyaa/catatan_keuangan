const pool = require('../config/db');

// Dibaca dari beberapa controller (dashboard, laporan, pemasukan), jadi
// dipisah agar bentuk nilainya konsisten: jumlah selalu Number.
async function readSaldoAwal() {
  const [rows] = await pool.query(
    "SELECT kunci, nilai FROM pengaturan WHERE kunci IN ('saldo_awal_kas','saldo_awal_tanggal')"
  );
  const map = Object.fromEntries(rows.map((r) => [r.kunci, r.nilai]));
  return {
    jumlah: Number(map.saldo_awal_kas || 0),
    tanggal: map.saldo_awal_tanggal || null,
  };
}

module.exports = { readSaldoAwal };
