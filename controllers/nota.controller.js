const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function normalizeKeterangan(value) {
  return typeof value === 'string' ? value.trim() || null : null;
}

// Judul kosong berarti nota memakai judul bawaan sesuai tipenya.
function normalizeJudul(value) {
  return typeof value === 'string' ? value.trim().slice(0, 120) || null : null;
}

function keteranganTerlaluPanjang(value) {
  return typeof value === 'string' && value.length > 1000;
}

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

  if (!nota.referensi_id) {
    const [items] = await pool.query('SELECT * FROM nota_items WHERE nota_id = ? ORDER BY id', [id]);
    return res.json({
      ...nota,
      manual: true,
      transaksi: {
        pihak_nama: nota.pihak_nama,
        pihak_alamat: nota.pihak_alamat,
        pihak_telepon: nota.pihak_telepon,
        total: nota.total_manual,
      },
      items: items.map((it) => ({ ...it, nama_produk: it.nama_item })),
    });
  }

  if (nota.tipe === 'penjualan') {
    const [[header]] = await pool.query(
      `SELECT p.*, b.nama AS pihak_nama, b.alamat AS pihak_alamat, b.telepon AS pihak_telepon
       FROM penjualan p LEFT JOIN pembeli b ON b.id = p.pembeli_id WHERE p.id = ?`,
      [nota.referensi_id]
    );
    const [items] = await pool.query(
      `SELECT pi.*, pr.nama_produk, pr.satuan FROM penjualan_items pi JOIN produk pr ON pr.id = pi.produk_id WHERE pi.penjualan_id = ?`,
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
    `SELECT pi.*, pr.nama_produk, pr.satuan FROM pembelian_items pi JOIN produk pr ON pr.id = pi.produk_id WHERE pi.pembelian_id = ?`,
    [nota.referensi_id]
  );
  const [pembayaran] = await pool.query(
    `SELECT id, tanggal_bayar, jumlah_bayar, keterangan
     FROM pembelian_pembayaran WHERE pembelian_id = ? ORDER BY tanggal_bayar, id`,
    [nota.referensi_id]
  );
  const [potonganItems] = await pool.query(
    'SELECT id, keterangan, jumlah FROM pembelian_potongan WHERE pembelian_id = ? ORDER BY id',
    [nota.referensi_id]
  );
  res.json({ ...nota, transaksi: { ...header, potongan_items: potonganItems }, items, pembayaran, potongan_items: potonganItems });
});

const createNota = asyncHandler(async (req, res) => {
  const { no_invoice, tipe, judul, referensi_id, tanggal, jatuh_tempo, status, keterangan,
    pihak_nama, pihak_alamat, pihak_telepon, items = [] } = req.body;
  if (!no_invoice || !tipe || !tanggal) {
    return res.status(400).json({ message: 'Nomor nota, tipe, dan tanggal wajib diisi.' });
  }
  if (keteranganTerlaluPanjang(keterangan)) {
    return res.status(400).json({ message: 'Keterangan maksimal 1000 karakter.' });
  }
  const manual = !referensi_id;
  const validItems = manual ? items.filter((it) => String(it.nama_item || '').trim()) : [];
  const totalManual = validItems.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.harga_satuan || 0), 0);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO nota (no_invoice, tipe, judul, referensi_id, tanggal, jatuh_tempo, status, keterangan,
       pihak_nama, pihak_alamat, pihak_telepon, total_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [no_invoice, tipe, normalizeJudul(judul), referensi_id || null, tanggal, jatuh_tempo || null, status || 'unpaid',
       normalizeKeterangan(keterangan), manual ? String(pihak_nama || '').trim() || null : null,
       manual ? String(pihak_alamat || '').trim() || null : null, manual ? String(pihak_telepon || '').trim() || null : null, totalManual]
    );
    for (const item of validItems) {
      const qty = Number(item.qty || 0);
      const harga = Number(item.harga_satuan || 0);
      await conn.query(
        `INSERT INTO nota_items (nota_id, nama_item, qty, satuan, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, String(item.nama_item).trim(), qty, String(item.satuan || 'pcs').trim(), harga, qty * harga]
      );
    }
    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const updateNota = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { jatuh_tempo, status, keterangan, judul } = req.body;
  if (!['paid', 'unpaid', 'overdue'].includes(status)) {
    return res.status(400).json({ message: 'Status nota tidak valid.' });
  }
  if (keteranganTerlaluPanjang(keterangan)) {
    return res.status(400).json({ message: 'Keterangan maksimal 1000 karakter.' });
  }
  await pool.query(
    'UPDATE nota SET jatuh_tempo=?, status=?, keterangan=?, judul=? WHERE id=?',
    [jatuh_tempo || null, status, normalizeKeterangan(keterangan), normalizeJudul(judul), id]
  );
  res.json({ message: 'Nota berhasil diperbarui.' });
});

const deleteNota = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM nota WHERE id = ?', [req.params.id]);
  res.json({ message: 'Nota berhasil dihapus.' });
});

module.exports = { getNota, getNotaById, createNota, updateNota, deleteNota };
