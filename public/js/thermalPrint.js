import { rupiah, tanggalIndo } from './format.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[c]));

const angka = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value || 0));

export function printThermalMilkReport(report, { documentNo = '', note = '', documentTitle = 'DATA PENERIMAAN / PEMBAYARAN SUSU', numberLabel = 'No.' } = {}) {
  const transactions = report.transaksi || [];
  const payments = report.pembayaran || [];
  const party = report.individu || {};
  const transactionRows = transactions.length
    ? transactions.map((tx) => {
      const pagi = Number(tx.volume_pagi || 0);
      const sore = Number(tx.volume_sore || 0);
      const jumlah = pagi + sore || Number(tx.qty || 0);
      const quality = [['F', 'kualitas_f'], ['S', 'kualitas_s'], ['P', 'kualitas_p'], ['TS', 'kualitas_ts'], ['pH', 'kualitas_ph'], ['W', 'kualitas_w']]
        .map(([label, key]) => `<div><small>${label}</small><b>${esc(tx[key] ?? '-')}</b></div>`).join('');
      return `<section class="transaction">
        <div class="tx-head line"><b>${esc(tanggalIndo(tx.tanggal))}</b><span>${esc(tx.no_transaksi || '')}</span></div>
        <div class="quality-grid">${quality}</div>
        <div class="volume-grid"><div><small>PAGI</small><b>${esc(angka(pagi))} L</b></div><div><small>SORE</small><b>${esc(angka(sore))} L</b></div><div><small>JUMLAH</small><b>${esc(angka(jumlah))} L</b></div></div>
        <div class="line calc"><span>${esc(angka(jumlah))} L × ${esc(rupiah(tx.harga_satuan || 0))}</span><b>${esc(rupiah(Number(tx.total || 0) + Number(tx.potongan || 0)))}</b></div>
        ${Number(tx.potongan || 0) ? `<div class="line deduction"><span>Potongan</span><span>-${esc(rupiah(tx.potongan))}</span></div>` : ''}
      </section>`;
    }).join('')
    : '<div class="empty">Belum ada data penerimaan susu.</div>';

  const paymentRows = payments.length
    ? payments.map((p) => `<div class="payment line"><span>${esc(tanggalIndo(p.tanggal_bayar))}<small>${esc(p.keterangan || '-')}</small></span><b>${esc(rupiah(p.jumlah_bayar))}</b></div>`).join('')
    : '<div class="empty compact">Belum ada pembayaran.</div>';
  const totalVolume = Number(report.ringkasan?.total_volume || transactions.reduce((sum, tx) => {
    const volume = Number(tx.volume_pagi || 0) + Number(tx.volume_sore || 0);
    return sum + (volume || Number(tx.qty || 0));
  }, 0));
  const totalPotongan = transactions.reduce((sum, tx) => sum + Number(tx.potongan || 0), 0);
  const totalNet = Number(report.ringkasan?.total_nilai || transactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0));
  const totalGross = totalNet + totalPotongan;
  const totalPaid = Number(report.ringkasan?.total_bayar || payments.reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0));
  const remaining = Math.max(0, Number(report.ringkasan?.sisa ?? totalNet - totalPaid));
  const start = report.periode?.start;
  const end = report.periode?.end;
  const periodLabel = start ? (end && end !== start ? `${tanggalIndo(start)} s/d ${tanggalIndo(end)}` : tanggalIndo(start)) : '';

  const popup = window.open('', '_blank', 'width=430,height=760');
  if (!popup) throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak thermal.');
  popup.document.write(`<!doctype html><html><head><title>Data Susu - ${esc(party.nama || '')}</title><style>
    @page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;color:#111;font:10px/1.3 Arial,sans-serif}
    .center{text-align:center}.brand{font-size:14px;font-weight:800;letter-spacing:.3px}.title{font-size:12px;font-weight:800;margin:7px 0 5px}.sub{font-size:8px}.dash{border-top:1px dashed #111;margin:7px 0}.line{display:flex;justify-content:space-between;gap:6px}.line>:last-child{text-align:right}
    .party{font-size:12px;font-weight:800}.meta{margin:2px 0}.transaction{border:1px solid #222;margin:7px 0;break-inside:avoid}.tx-head{padding:4px 5px;background:#eee;border-bottom:1px solid #222}.tx-head span{font-size:8px}
    .quality-grid{display:grid;grid-template-columns:repeat(6,1fr);border-bottom:1px solid #aaa}.quality-grid div,.volume-grid div{text-align:center;padding:3px 1px;border-right:1px solid #aaa}.quality-grid div:last-child,.volume-grid div:last-child{border-right:0}
    small{display:block;font-size:7px;color:#333}.quality-grid b,.volume-grid b{display:block;font-size:9px}.volume-grid{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #aaa}.calc{padding:4px 5px;font-size:10px}.deduction{padding:0 5px 4px;color:#333}
    .section-title{font-weight:800;margin:9px 0 3px}.summary{border-top:1px solid #111;border-bottom:1px solid #111;padding:5px 0;margin-top:8px}.summary .line{margin:2px 0}.grand{font-size:13px;font-weight:800;border-top:1px dashed #777;padding-top:4px;margin-top:4px}
    .payment{padding:4px 0;border-bottom:1px dotted #999}.payment small{text-align:left}.empty{text-align:center;padding:14px 0;color:#555}.compact{padding:6px 0}.notes{white-space:pre-wrap;margin-top:7px}.footer{margin:12px 0 4px;text-align:center;font-size:8px}
    @media print{body{width:72mm}}
  </style></head><body>
    <div class="center"><div class="brand">MITRAYASA DAIRY NATURAL</div><div class="sub">Jl. Pagerageung No. 28, Tasikmalaya · 0813 8538 9191</div><div class="title">${esc(documentTitle)}</div></div>
    <div class="dash"></div><div class="party">${esc(party.nama || 'Supplier')}</div>
    ${party.alamat || party.telepon ? `<div class="sub">${esc(party.alamat || party.telepon)}</div>` : ''}
    ${documentNo ? `<div class="meta line"><span>${esc(numberLabel)}</span><span>${esc(documentNo)}</span></div>` : ''}
    ${periodLabel ? `<div class="meta line"><span>Periode</span><span>${esc(periodLabel)}</span></div>` : ''}
    ${transactionRows}
    <div class="summary"><div class="line"><span>Jumlah volume</span><b>${esc(angka(totalVolume))} L</b></div><div class="line"><span>Nilai susu</span><span>${esc(rupiah(totalGross))}</span></div><div class="line"><span>Potongan</span><span>-${esc(rupiah(totalPotongan))}</span></div><div class="line grand"><span>TOTAL PEMBAYARAN</span><span>${esc(rupiah(totalNet))}</span></div><div class="line"><span>Sudah dibayar</span><span>${esc(rupiah(totalPaid))}</span></div><div class="line"><b>SISA</b><b>${esc(rupiah(remaining))}</b></div></div>
    <div class="section-title">RIWAYAT PEMBAYARAN</div>${paymentRows}
    ${note ? `<div class="notes"><b>Catatan:</b><br>${esc(note)}</div>` : ''}
    <div class="dash"></div><div class="footer">Dokumen dicetak ${esc(new Date().toLocaleString('id-ID'))}<br>Terima kasih</div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
  popup.document.close();
}

export function printThermalInvoice(detail) {
  const tx = detail.transaksi || {};
  const items = detail.items || [];
  const isPurchase = detail.tipe === 'pembelian';
  if (isPurchase) {
    const qty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const gross = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const paid = (detail.pembayaran || []).reduce((sum, payment) => sum + Number(payment.jumlah_bayar || 0), 0);
    const total = Number(tx.total || 0);
    return printThermalMilkReport({
      individu: { nama: tx.pihak_nama, alamat: tx.pihak_alamat, telepon: tx.pihak_telepon },
      periode: { start: tx.tanggal || detail.tanggal, end: tx.tanggal || detail.tanggal },
      transaksi: [{ ...tx, qty, harga_satuan: qty ? gross / qty : 0 }],
      pembayaran: detail.pembayaran || [],
      ringkasan: {
        total_volume: Number(tx.volume_pagi || 0) + Number(tx.volume_sore || 0) || qty,
        total_nilai: total,
        total_bayar: paid,
        sisa: Math.max(0, total - paid),
      },
    }, { documentNo: detail.no_invoice, note: detail.keterangan, documentTitle: 'NOTA PEMBAYARAN SUSU', numberLabel: 'No. Nota' });
  }
  const volume = Number(tx.volume_pagi || 0) + Number(tx.volume_sore || 0);
  const documentTitle = isPurchase ? 'NOTA PEMBAYARAN SUSU' : 'INVOICE PENJUALAN';
  const numberLabel = isPurchase ? 'No. Nota' : 'No. Invoice';
  const dateLabel = isPurchase ? 'Tanggal Nota' : 'Tanggal Invoice';
  const rows = items.length
    ? items.map((it) => `<div class="item"><b>${esc(isPurchase ? tanggalIndo(it.tanggal || tx.tanggal || detail.tanggal) : it.nama_produk || it.nama_item)}</b><div class="line"><span>${esc(it.qty)} ${esc(it.satuan || '')} × ${esc(rupiah(it.harga_satuan))}</span><span>${esc(rupiah(it.subtotal))}</span></div></div>`).join('')
    : '<div class="empty">— Invoice kosong —</div>';
  const totalPaid = (detail.pembayaran || []).reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
  const remaining = Math.max(0, Number(tx.total || 0) - totalPaid);
  const paymentRows = (detail.pembayaran || []).length
    ? detail.pembayaran.map((p) => `<div class="payment line"><span>${esc(tanggalIndo(p.tanggal_bayar))}<br><small>${esc(p.keterangan || '-')}</small></span><span>${esc(rupiah(p.jumlah_bayar))}</span></div>`).join('')
    : '<div class="empty compact">Belum ada pembayaran.</div>';
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
    .milk{border:1px solid #111;padding:5px;margin:6px 0}.milk-title,.section-title{font-weight:700;margin-bottom:3px}.payment{padding:4px 0;border-bottom:1px dotted #999}.compact{padding:6px 0}.notes{white-space:pre-wrap;margin-top:6px}.footer{margin:12px 0 4px;text-align:center;font-size:9px}
    @media print{body{width:72mm}.no-print{display:none}}
  </style></head><body>
    <div class="center"><div class="brand">MITRAYASA DAIRY NATURAL</div><div class="sub">Jl. Pagerageung No. 28, Tasikmalaya</div><div class="sub">0813 8538 9191</div></div>
    <div class="dash"></div><div class="center"><b>${documentTitle}</b></div>
    <div class="meta line"><span>${numberLabel}</span><span>${esc(detail.no_invoice)}</span></div><div class="meta line"><span>${dateLabel}</span><span>${esc(tanggalIndo(detail.tanggal))}</span></div>
    <div class="party">${esc(tx.pihak_nama || 'Umum')}</div><div class="sub">${esc(tx.pihak_alamat || tx.pihak_telepon || '')}</div>
    ${volume || quality ? `<div class="milk"><div class="milk-title">DATA SUSU</div>${volume ? `<div class="line"><span>Pagi ${esc(tx.volume_pagi || 0)} L</span><span>Sore ${esc(tx.volume_sore || 0)} L</span></div><div class="line"><b>Total volume</b><b>${esc(volume)} L</b></div>` : ''}${quality ? `<div class="sub">${quality}</div>` : ''}</div>` : ''}
    <div class="dash"></div>${rows}
    ${isPurchase ? `<div class="section-title" style="margin-top:8px">RIWAYAT PEMBAYARAN</div>${paymentRows}<div class="line" style="margin-top:7px"><span>Total</span><span>${esc(rupiah(tx.total || 0))}</span></div><div class="line"><span>Sudah dibayar</span><span>${esc(rupiah(totalPaid))}</span></div><div class="line total"><span>SISA</span><span>${esc(rupiah(remaining))}</span></div>` : `<div class="line total"><span>TOTAL</span><span>${esc(rupiah(tx.total || 0))}</span></div>`}
    ${tx.potongan ? `<div class="line"><span>Potongan</span><span>${esc(rupiah(tx.potongan))}</span></div>` : ''}
    ${detail.keterangan ? `<div class="notes"><b>Catatan:</b><br>${esc(detail.keterangan)}</div>` : ''}
    <div class="dash"></div><div class="footer">Terima kasih atas kepercayaan Anda<br>Dokumen dicetak ${esc(new Date().toLocaleString('id-ID'))}</div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
  popup.document.close();
}
