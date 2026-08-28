require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const produkRoutes = require('./routes/produk.routes');
const pembelianRoutes = require('./routes/pembelian.routes');
const penjualanRoutes = require('./routes/penjualan.routes');
const userRoutes = require('./routes/user.routes');
const kasRoutes = require('./routes/kas.routes');
const pemasukanRoutes = require('./routes/pemasukan.routes');
const notaRoutes = require('./routes/nota.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const laporanRoutes = require('./routes/laporan.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/produk', produkRoutes);
app.use('/api/pembelian', pembelianRoutes);
app.use('/api/penjualan', penjualanRoutes);
app.use('/api/manajemen-user', userRoutes);
app.use('/api/pengeluaran-kas', kasRoutes);
app.use('/api/pemasukan-kas', pemasukanRoutes);
app.use('/api/nota', notaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/laporan', laporanRoutes);

app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Terjadi kesalahan pada server.' });
});

const initDb = require('./db/init');

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err.message);
    console.error('Pastikan MySQL berjalan dan kredensial di file .env sudah benar.');
    process.exit(1);
  });
