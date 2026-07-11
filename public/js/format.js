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
