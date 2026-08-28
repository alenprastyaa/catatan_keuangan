export function rupiah(value) {
  const n = Number(value) || 0;
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function tanggalIndo(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Judul bawaan dipakai bila nota tidak punya judul kustom.
export function judulDefault(tipe) {
  return tipe === 'pembelian' ? 'NOTA PEMBAYARAN' : 'INVOICE PENJUALAN';
}

// Judul yang tampil di kop nota: kustom bila diisi, selain itu judul bawaan.
export function judulNota(detail) {
  const custom = String(detail?.judul || '').trim();
  return custom ? custom.toUpperCase() : judulDefault(detail?.tipe);
}
