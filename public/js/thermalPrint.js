import { rupiah, tanggalIndo } from './format.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[c]));

export function printThermalInvoice(detail) {
  const tx = detail.transaksi || {};
  const items = detail.items || [];
  const volume = Number(tx.volume_pagi || 0) + Number(tx.volume_sore || 0);
  const documentTitle = detail.tipe === 'pembelian' ? 'NOTA PEMBAYARAN' : 'INVOICE PENJUALAN';
  const rows = items.length
    ? items.map((it) => `<div class="item"><b>${esc(it.nama_produk || it.nama_item)}</b><div class="line"><span>${esc(it.qty)} ${esc(it.satuan || '')} × ${esc(rupiah(it.harga_satuan))}</span><span>${esc(rupiah(it.subtotal))}</span></div></div>`).join('')
    : '<div class="empty">— Invoice kosong —</div>';
  const qualityKeys = [['F','kualitas_f'],['S','kualitas_s'],['P','kualitas_p'],['TS','kualitas_ts'],['PH','kualitas_ph'],['W','kualitas_w']];
  const quality = qualityKeys.filter(([, key]) => tx[key] !== null && tx[key] !== undefined && tx[key] !== '')
    .map(([label, key]) => `${label} ${esc(tx[key])}`).join(' · ');
  const popup = window.open('', '_blank', 'width=430,height=760');
  if (!popup) throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak thermal.');
  popup.document.write(`<!doctype html><html><head><title>${esc(detail.no_invoice)}</title><style>
    @page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;color:#111;font:11px/1.35 Arial,sans-serif}
    .center{text-align:center}.brand{font-size:15px;font-weight:800;letter-spacing:.4px}.sub{font-size:9px}.dash{border-top:1px dashed #111;margin:7px 0}
    .line{display:flex;justify-content:space-between;gap:8px}.line span:last-child{text-align:right}.meta{margin:2px 0}.party{font-size:12px;font-weight:700;margin-top:5px}
    .item{padding:5px 0;border-bottom:1px dotted #999}.empty{text-align:center;padding:16px 0;color:#666}.total{font-size:14px;font-weight:800;margin-top:7px}
    .milk{border:1px solid #111;padding:5px;margin:6px 0}.milk-title{font-weight:700;margin-bottom:3px}.notes{white-space:pre-wrap;margin-top:6px}.footer{margin:12px 0 4px;text-align:center;font-size:9px}
    @media print{body{width:72mm}.no-print{display:none}}
  </style></head><body>
    <div class="center"><div class="brand">MITRAYASA DAIRY NATURAL</div><div class="sub">Jl. Pagerageung No. 28, Tasikmalaya</div><div class="sub">0813 8538 9191</div></div>
    <div class="dash"></div><div class="center"><b>${documentTitle}</b></div>
    <div class="meta line"><span>No</span><span>${esc(detail.no_invoice)}</span></div><div class="meta line"><span>Tanggal</span><span>${esc(tanggalIndo(detail.tanggal))}</span></div>
    <div class="party">${esc(tx.pihak_nama || 'Umum')}</div><div class="sub">${esc(tx.pihak_alamat || tx.pihak_telepon || '')}</div>
    ${volume || quality ? `<div class="milk"><div class="milk-title">DATA SUSU</div>${volume ? `<div class="line"><span>Pagi ${esc(tx.volume_pagi || 0)} L</span><span>Sore ${esc(tx.volume_sore || 0)} L</span></div><div class="line"><b>Total volume</b><b>${esc(volume)} L</b></div>` : ''}${quality ? `<div class="sub">${quality}</div>` : ''}</div>` : ''}
    <div class="dash"></div>${rows}<div class="line total"><span>TOTAL</span><span>${esc(rupiah(tx.total || 0))}</span></div>
    ${tx.potongan ? `<div class="line"><span>Potongan</span><span>${esc(rupiah(tx.potongan))}</span></div>` : ''}
    ${detail.keterangan ? `<div class="notes"><b>Catatan:</b><br>${esc(detail.keterangan)}</div>` : ''}
    <div class="dash"></div><div class="footer">Terima kasih atas kepercayaan Anda<br>Dokumen dicetak ${esc(new Date().toLocaleString('id-ID'))}</div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
  popup.document.close();
}
