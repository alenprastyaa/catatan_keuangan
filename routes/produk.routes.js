const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/produk.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('produk'));

router.get('/', ctrl.getProduk);
router.get('/:id', ctrl.getProdukById);
router.post('/', ctrl.createProduk);
router.put('/:id', ctrl.updateProduk);
router.delete('/:id', ctrl.deleteProduk);

module.exports = router;
