const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function hitungStatus(total, sudahBayar) {
  if (sudahBayar <= 0) return 'piutang';
  if (sudahBayar >= total) return 'lunas';
  return 'sebagian';
}

const getPenjualan = asyncHandler(async (req, res) => {
  const { search = '', status = '', start = '', end = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const conditions = ['(p.no_transaksi LIKE ? OR b.nama LIKE ?)'];
  const params = [like, like];

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (start) {
    conditions.push('p.tanggal >= ?');
    params.push(start);
  }
  if (end) {
    conditions.push('p.tanggal <= ?');
    params.push(end);
  }
  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT p.*, b.nama AS pembeli_nama,
       COALESCE((SELECT SUM(jumlah_bayar) FROM penjualan_pembayaran pp WHERE pp.penjualan_id = p.id), 0) AS sudah_bayar,
       COALESCE((SELECT SUM(qty) FROM penjualan_items pi WHERE pi.penjualan_id = p.id), 0) AS total_qty
     FROM penjualan p
     LEFT JOIN pembeli b ON b.id = p.pembeli_id
     ${where}
     ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM penjualan p LEFT JOIN pembeli b ON b.id = p.pembeli_id ${where}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const getPenjualanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [[header]] = await pool.query(
    `SELECT p.*, b.nama AS pembeli_nama FROM penjualan p
     LEFT JOIN pembeli b ON b.id = p.pembeli_id WHERE p.id = ?`,
    [id]
  );
  if (!header) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

  const [items] = await pool.query(
    `SELECT pi.*, pr.nama_produk, pr.kode_produk FROM penjualan_items pi
     JOIN produk pr ON pr.id = pi.produk_id WHERE pi.penjualan_id = ?`,
    [id]
  );
  const [pembayaran] = await pool.query(
    'SELECT * FROM penjualan_pembayaran WHERE penjualan_id = ? ORDER BY tanggal_bayar',
    [id]
  );

  res.json({ ...header, items, pembayaran });
});

const createPenjualan = asyncHandler(async (req, res) => {
  const { pembeli_id, tanggal, jatuh_tempo, catatan, items = [], bayar_awal = 0, buat_nota = false } = req.body;

  if (!tanggal || items.length === 0) {
    return res.status(400).json({ message: 'Tanggal dan minimal satu item wajib diisi.' });
  }

  const total = items.reduce((sum, it) => sum + Number(it.qty) * Number(it.harga_satuan), 0);
  const status = hitungStatus(total, Number(bayar_awal));
  const noTransaksi = 'PJ-' + Date.now();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const it of items) {
      const [[prod]] = await conn.query('SELECT stok, nama_produk FROM produk WHERE id = ? FOR UPDATE', [it.produk_id]);
      if (!prod) {
        await conn.rollback();
        return res.status(400).json({ message: 'Produk tidak ditemukan.' });
      }
      if (Number(prod.stok) < Number(it.qty)) {
        await conn.rollback();
        return res.status(400).json({ message: `Stok "${prod.nama_produk}" tidak cukup (tersisa ${prod.stok}).` });
      }
    }

    const [result] = await conn.query(
      `INSERT INTO penjualan (no_transaksi, pembeli_id, tanggal, total, status, jatuh_tempo, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [noTransaksi, pembeli_id || null, tanggal, total, status, jatuh_tempo || null, catatan || null]
    );
    const penjualanId = result.insertId;

    for (const it of items) {
      const subtotal = Number(it.qty) * Number(it.harga_satuan);
      await conn.query(
        `INSERT INTO penjualan_items (penjualan_id, produk_id, qty, harga_satuan, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [penjualanId, it.produk_id, it.qty, it.harga_satuan, subtotal]
      );
      await conn.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [it.qty, it.produk_id]);
    }

    if (Number(bayar_awal) > 0) {
      await conn.query(
        `INSERT INTO penjualan_pembayaran (penjualan_id, tanggal_bayar, jumlah_bayar, keterangan)
         VALUES (?, ?, ?, ?)`,
        [penjualanId, tanggal, bayar_awal, 'Pembayaran awal']
      );
    }

    if (buat_nota) {
      await conn.query(
        `INSERT INTO nota (no_invoice, tipe, referensi_id, tanggal, jatuh_tempo, status, keterangan)
         VALUES (?, 'penjualan', ?, ?, ?, ?, ?)`,
        ['INV-' + Date.now(), penjualanId, tanggal, jatuh_tempo || null, status === 'lunas' ? 'paid' : 'unpaid', catatan?.trim() || null]
      );
    }

    await conn.commit();
    res.status(201).json({ id: penjualanId, no_transaksi: noTransaksi });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const updatePenjualan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pembeli_id, tanggal, jatuh_tempo, catatan, items } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total;
    if (Array.isArray(items)) {
      const [oldItems] = await conn.query('SELECT produk_id, qty FROM penjualan_items WHERE penjualan_id = ?', [id]);
      for (const oi of oldItems) {
        await conn.query('UPDATE produk SET stok = stok + ? WHERE id = ?', [oi.qty, oi.produk_id]);
      }
      await conn.query('DELETE FROM penjualan_items WHERE penjualan_id = ?', [id]);

      for (const it of items) {
        const [[prod]] = await conn.query('SELECT stok, nama_produk FROM produk WHERE id = ? FOR UPDATE', [it.produk_id]);
        if (!prod || Number(prod.stok) < Number(it.qty)) {
          await conn.rollback();
          return res.status(400).json({ message: `Stok "${prod ? prod.nama_produk : 'produk'}" tidak cukup (tersisa ${prod ? prod.stok : 0}).` });
        }
      }

      total = items.reduce((sum, it) => sum + Number(it.qty) * Number(it.harga_satuan), 0);
      for (const it of items) {
        const subtotal = Number(it.qty) * Number(it.harga_satuan);
        await conn.query(
          `INSERT INTO penjualan_items (penjualan_id, produk_id, qty, harga_satuan, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [id, it.produk_id, it.qty, it.harga_satuan, subtotal]
        );
        await conn.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [it.qty, it.produk_id]);
      }
    } else {
      const [[row]] = await conn.query('SELECT total FROM penjualan WHERE id = ?', [id]);
      total = row.total;
    }

    const [[{ sudah_bayar }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah_bayar),0) AS sudah_bayar FROM penjualan_pembayaran WHERE penjualan_id = ?',
      [id]
    );
    const status = hitungStatus(total, sudah_bayar);

    await conn.query(
      `UPDATE penjualan SET pembeli_id=?, tanggal=?, total=?, status=?, jatuh_tempo=?, catatan=? WHERE id=?`,
      [pembeli_id || null, tanggal, total, status, jatuh_tempo || null, catatan || null, id]
    );

    await conn.commit();
    res.json({ message: 'Transaksi penjualan berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const deletePenjualan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query('SELECT produk_id, qty FROM penjualan_items WHERE penjualan_id = ?', [id]);
    for (const it of items) {
      await conn.query('UPDATE produk SET stok = stok + ? WHERE id = ?', [it.qty, it.produk_id]);
    }
    await conn.query('DELETE FROM penjualan WHERE id = ?', [id]);
    await conn.commit();
    res.json({ message: 'Transaksi penjualan berhasil dihapus.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const bayarPiutang = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tanggal_bayar, jumlah_bayar, keterangan } = req.body;

  if (!tanggal_bayar || !jumlah_bayar) {
    return res.status(400).json({ message: 'Tanggal dan jumlah bayar wajib diisi.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO penjualan_pembayaran (penjualan_id, tanggal_bayar, jumlah_bayar, keterangan)
       VALUES (?, ?, ?, ?)`,
      [id, tanggal_bayar, jumlah_bayar, keterangan || null]
    );

    const [[{ total }]] = await conn.query('SELECT total FROM penjualan WHERE id = ?', [id]);
    const [[{ sudah_bayar }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah_bayar),0) AS sudah_bayar FROM penjualan_pembayaran WHERE penjualan_id = ?',
      [id]
    );
    const status = hitungStatus(total, sudah_bayar);
    await conn.query('UPDATE penjualan SET status = ? WHERE id = ?', [status, id]);

    await conn.commit();
    res.status(201).json({ message: 'Pembayaran berhasil dicatat.', status });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = {
  getPenjualan, getPenjualanById, createPenjualan, updatePenjualan, deletePenjualan, bayarPiutang,
};
