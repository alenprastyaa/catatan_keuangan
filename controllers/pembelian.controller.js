const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function hitungStatus(total, sudahBayar) {
  if (sudahBayar <= 0) return 'hutang';
  if (sudahBayar >= total) return 'lunas';
  return 'sebagian';
}

function angkaAtauNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

const getPembelian = asyncHandler(async (req, res) => {
  const { search = '', status = '', start = '', end = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const like = `%${search}%`;

  const conditions = ['(p.no_transaksi LIKE ? OR s.nama LIKE ?)'];
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
    `SELECT p.*, s.nama AS supplier_nama,
       COALESCE((SELECT SUM(jumlah_bayar) FROM pembelian_pembayaran pp WHERE pp.pembelian_id = p.id), 0) AS sudah_bayar,
       COALESCE((SELECT SUM(qty) FROM pembelian_items pi WHERE pi.pembelian_id = p.id), 0) AS total_qty,
       (COALESCE(p.volume_pagi,0) + COALESCE(p.volume_sore,0)) AS volume_liter
     FROM pembelian p
     LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id
     ${where}
     ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM pembelian p LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id ${where}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

const getPembelianById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [[header]] = await pool.query(
    `SELECT p.*, s.nama AS supplier_nama FROM pembelian p
     LEFT JOIN pelanggan_supplier s ON s.id = p.supplier_id WHERE p.id = ?`,
    [id]
  );
  if (!header) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

  const [items] = await pool.query(
    `SELECT pi.*, pr.nama_produk, pr.kode_produk FROM pembelian_items pi
     JOIN produk pr ON pr.id = pi.produk_id WHERE pi.pembelian_id = ?`,
    [id]
  );
  const [pembayaran] = await pool.query(
    'SELECT * FROM pembelian_pembayaran WHERE pembelian_id = ? ORDER BY tanggal_bayar',
    [id]
  );

  res.json({ ...header, items, pembayaran });
});

const createPembelian = asyncHandler(async (req, res) => {
  const { supplier_id, tanggal, jatuh_tempo, catatan, items = [], bayar_awal = 0, buat_nota = false,
    volume_pagi = 0, volume_sore = 0, kualitas_f = null, kualitas_s = null, kualitas_p = null,
    kualitas_ts = null, kualitas_ph = null, kualitas_w = null, potongan = 0 } = req.body;

  if (!tanggal || items.length === 0) {
    return res.status(400).json({ message: 'Tanggal dan minimal satu item wajib diisi.' });
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.qty) * Number(it.harga_satuan), 0);
  const total = Math.max(0, subtotal - Number(potongan || 0));
  const status = hitungStatus(total, Number(bayar_awal));
  const noTransaksi = 'PB-' + Date.now();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO pembelian (no_transaksi, supplier_id, tanggal, total, status, jatuh_tempo, catatan,
        volume_pagi, volume_sore, kualitas_f, kualitas_s, kualitas_p, kualitas_ts, kualitas_ph, kualitas_w, potongan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [noTransaksi, supplier_id || null, tanggal, total, status, jatuh_tempo || null, catatan || null,
       volume_pagi || 0, volume_sore || 0, angkaAtauNull(kualitas_f), angkaAtauNull(kualitas_s), angkaAtauNull(kualitas_p),
       angkaAtauNull(kualitas_ts), angkaAtauNull(kualitas_ph), angkaAtauNull(kualitas_w), potongan || 0]
    );
    const pembelianId = result.insertId;

    for (const it of items) {
      const subtotal = Number(it.qty) * Number(it.harga_satuan);
      await conn.query(
        `INSERT INTO pembelian_items (pembelian_id, produk_id, qty, harga_satuan, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [pembelianId, it.produk_id, it.qty, it.harga_satuan, subtotal]
      );
      await conn.query('UPDATE produk SET stok = stok + ? WHERE id = ?', [it.qty, it.produk_id]);
    }

    if (Number(bayar_awal) > 0) {
      await conn.query(
        `INSERT INTO pembelian_pembayaran (pembelian_id, tanggal_bayar, jumlah_bayar, keterangan)
         VALUES (?, ?, ?, ?)`,
        [pembelianId, tanggal, bayar_awal, 'Pembayaran awal']
      );
    }

    if (buat_nota) {
      await conn.query(
        `INSERT INTO nota (no_invoice, tipe, referensi_id, tanggal, jatuh_tempo, status, keterangan)
         VALUES (?, 'pembelian', ?, ?, ?, ?, ?)`,
        ['NOTA-' + Date.now(), pembelianId, tanggal, jatuh_tempo || null, status === 'lunas' ? 'paid' : 'unpaid', catatan?.trim() || null]
      );
    }

    await conn.commit();
    res.status(201).json({ id: pembelianId, no_transaksi: noTransaksi });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const updatePembelian = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { supplier_id, tanggal, jatuh_tempo, catatan, items, volume_pagi = 0, volume_sore = 0,
    kualitas_f = null, kualitas_s = null, kualitas_p = null, kualitas_ts = null, kualitas_ph = null,
    kualitas_w = null, potongan = 0 } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total;
    if (Array.isArray(items)) {
      const [oldItems] = await conn.query('SELECT produk_id, qty FROM pembelian_items WHERE pembelian_id = ?', [id]);
      for (const oi of oldItems) {
        await conn.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [oi.qty, oi.produk_id]);
      }
      await conn.query('DELETE FROM pembelian_items WHERE pembelian_id = ?', [id]);

      total = Math.max(0, items.reduce((sum, it) => sum + Number(it.qty) * Number(it.harga_satuan), 0) - Number(potongan || 0));
      for (const it of items) {
        const subtotal = Number(it.qty) * Number(it.harga_satuan);
        await conn.query(
          `INSERT INTO pembelian_items (pembelian_id, produk_id, qty, harga_satuan, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [id, it.produk_id, it.qty, it.harga_satuan, subtotal]
        );
        await conn.query('UPDATE produk SET stok = stok + ? WHERE id = ?', [it.qty, it.produk_id]);
      }
    } else {
      const [[row]] = await conn.query('SELECT total FROM pembelian WHERE id = ?', [id]);
      total = row.total;
    }

    const [[{ sudah_bayar }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah_bayar),0) AS sudah_bayar FROM pembelian_pembayaran WHERE pembelian_id = ?',
      [id]
    );
    const status = hitungStatus(total, sudah_bayar);

    await conn.query(
      `UPDATE pembelian SET supplier_id=?, tanggal=?, total=?, status=?, jatuh_tempo=?, catatan=?,
       volume_pagi=?, volume_sore=?, kualitas_f=?, kualitas_s=?, kualitas_p=?, kualitas_ts=?, kualitas_ph=?, kualitas_w=?, potongan=? WHERE id=?`,
      [supplier_id || null, tanggal, total, status, jatuh_tempo || null, catatan || null,
       volume_pagi || 0, volume_sore || 0, angkaAtauNull(kualitas_f), angkaAtauNull(kualitas_s), angkaAtauNull(kualitas_p),
       angkaAtauNull(kualitas_ts), angkaAtauNull(kualitas_ph), angkaAtauNull(kualitas_w), potongan || 0, id]
    );

    await conn.commit();
    res.json({ message: 'Transaksi pembelian berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const deletePembelian = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query('SELECT produk_id, qty FROM pembelian_items WHERE pembelian_id = ?', [id]);
    for (const it of items) {
      await conn.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [it.qty, it.produk_id]);
    }
    await conn.query('DELETE FROM pembelian WHERE id = ?', [id]);
    await conn.commit();
    res.json({ message: 'Transaksi pembelian berhasil dihapus.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const bayarHutang = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tanggal_bayar, jumlah_bayar, keterangan } = req.body;

  if (!tanggal_bayar || !jumlah_bayar) {
    return res.status(400).json({ message: 'Tanggal dan jumlah bayar wajib diisi.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO pembelian_pembayaran (pembelian_id, tanggal_bayar, jumlah_bayar, keterangan)
       VALUES (?, ?, ?, ?)`,
      [id, tanggal_bayar, jumlah_bayar, keterangan || null]
    );

    const [[{ total }]] = await conn.query('SELECT total FROM pembelian WHERE id = ?', [id]);
    const [[{ sudah_bayar }]] = await conn.query(
      'SELECT COALESCE(SUM(jumlah_bayar),0) AS sudah_bayar FROM pembelian_pembayaran WHERE pembelian_id = ?',
      [id]
    );
    const status = hitungStatus(total, sudah_bayar);
    await conn.query('UPDATE pembelian SET status = ? WHERE id = ?', [status, id]);

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
  getPembelian, getPembelianById, createPembelian, updatePembelian, deletePembelian, bayarHutang,
};
