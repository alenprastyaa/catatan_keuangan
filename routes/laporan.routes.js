const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/laporan.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('laporan'));

router.get('/pelanggan-supplier', ctrl.laporanPelangganSupplier);
router.get('/pembeli', ctrl.laporanPembeli);
router.get('/laba-rugi', ctrl.laporanLabaRugi);
router.get('/kas', ctrl.laporanKas);
router.get('/penjualan', ctrl.laporanPenjualan);
router.get('/pembelian', ctrl.laporanPembelian);
router.get('/pengeluaran', ctrl.laporanPengeluaran);
router.get('/hutang-piutang', ctrl.laporanHutangPiutang);
router.get('/data-supplier-konsumen', ctrl.dataSupplierKonsumen);

module.exports = router;
