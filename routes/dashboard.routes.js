const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('dashboard'));

router.get('/summary', ctrl.getSummary);
router.get('/chart', ctrl.getChart);
router.get('/insight', ctrl.getInsight);

module.exports = router;
