import { rupiah } from './format.js';
import { getLogoDataUrl, LOGO_RATIO } from './logo.js';

// Data perusahaan untuk kop & footer invoice — sesuaikan di sini bila berubah.
const COMPANY_ADDRESS = 'Jl. Pagerageung No. 28 Kab. Tasikmalaya - Jabar 46158';
const COMPANY_PHONE = '0813 8538 9191';
const COMPANY_EMAIL = 'mitrayasadairy@gmail.com';
const BANK_INFO = 'Bank BSI 7280830806 a.n. Fariz Amroeni';

const NAVY = [33, 61, 138];
const TEXT = [26, 30, 46];
const MUTED = [110, 117, 140];
const FAINT = [160, 165, 184];
const BORDER = [223, 226, 236];
const LIGHT_GREY = [246, 247, 251];

function tanggalShort(v) {
  if (!v) return '-';
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function drawHeader(doc, logoDataUrl, documentTitle = 'INVOICE') {
  const pageW = doc.internal.pageSize.getWidth();
  const H = 38;
  const wBottom = 100;
  const wTop = 132;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, wBottom, H, 'F');
  doc.triangle(wBottom, 0, wTop, 0, wBottom, H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(documentTitle.length > 28 ? 15 : documentTitle.length > 12 ? 21 : 28);
  doc.setTextColor(255, 255, 255);
  doc.text(documentTitle, 14, 25);

  if (logoDataUrl) {
    const logoW = 58;
    const logoH = logoW * LOGO_RATIO;
    const logoX = pageW - 14 - logoW;
    const logoY = (H - logoH) / 2 + 2;
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
  }

  return H;
}

function drawMetaRow(doc, { documentNo, tanggal, numberLabel = 'No. Invoice', dateLabel = 'Tanggal Invoice' }, headerH) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = headerH + 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`${numberLabel}: ${documentNo}      ${dateLabel}: ${tanggal}`, pageW - 14, y, { align: 'right' });

  y += 5;
  doc.setFillColor(...NAVY);
  doc.rect(0, y, pageW, 1, 'F');

  return y + 12;
}

function drawInfoBlock(doc, { documentNo, tanggalStr, jatuhTempoStr, pihakNama, pihakSub, numberLabel = 'No. Invoice' }, startY) {
  const leftLabelX = 14;
  const leftValueX = 50;
  const rightX = 118;

  const rows = [
    [`${numberLabel}:`, documentNo],
    ['Tanggal:', tanggalStr],
    ['Jatuh Tempo:', jatuhTempoStr],
  ];
  rows.forEach(([label, value], i) => {
    const ry = startY + i * 6.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(label, leftLabelX, ry);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(String(value || '-'), leftValueX, ry);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT);
  doc.text('Kepada Yth:', rightX, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(pihakNama || '-', rightX, startY + 6.4);
  if (pihakSub) {
    doc.setTextColor(...MUTED);
    doc.text(pihakSub, rightX, startY + 12.4);
  }

  return startY + 26;
}

function drawMilkData(doc, transaksi, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const volumePagi = Number(transaksi?.volume_pagi || 0);
  const volumeSore = Number(transaksi?.volume_sore || 0);
  const qualities = [
    ['F', 'kualitas_f'], ['S', 'kualitas_s'], ['P', 'kualitas_p'],
    ['TS', 'kualitas_ts'], ['PH', 'kualitas_ph'], ['W', 'kualitas_w'],
  ].map(([label, key]) => `${label} ${transaksi?.[key] ?? '-'}`).join('  ·  ');

  doc.setFillColor(...LIGHT_GREY);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(14, startY, pageW - 28, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...TEXT);
  doc.text(`Volume: ${volumePagi + volumeSore} L (Pagi ${volumePagi} / Sore ${volumeSore})`, 19, startY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`Kualitas: ${qualities}`, 19, startY + 13);
  return startY + 25;
}

function drawItemsTable(doc, items, startY, { isPurchase = false, tanggal } = {}) {
  const body = items.map((it, i) => [
    String(i + 1),
    isPurchase ? tanggalShort(it.tanggal || tanggal) : it.nama_produk,
    it.satuan ? `${it.qty} ${it.satuan}` : String(it.qty),
    rupiah(it.harga_satuan),
    rupiah(it.subtotal),
  ]);

  doc.autoTable({
    startY,
    head: [['No', isPurchase ? 'Tanggal' : 'Produk', 'Qty', 'Harga Satuan', 'Subtotal']],
    body,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3.6, bottom: 3.6, left: 4, right: 4 }, textColor: TEXT },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.6 },
    alternateRowStyles: { fillColor: LIGHT_GREY },
    columnStyles: {
      0: { cellWidth: 12 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 10;
}

function drawPaymentsTable(doc, payments, startY) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Riwayat Pembayaran', 14, startY);

  const body = payments.length
    ? payments.map((p) => [tanggalShort(p.tanggal_bayar), rupiah(p.jumlah_bayar), p.keterangan || '-'])
    : [[{ content: 'Belum ada pembayaran.', colSpan: 3, styles: { halign: 'center', textColor: MUTED, fontStyle: 'italic' } }]];
  doc.autoTable({
    startY: startY + 4,
    head: [['Tanggal', 'Jumlah', 'Keterangan']],
    body,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3.4, bottom: 3.4, left: 4, right: 4 }, textColor: TEXT },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.6 },
    alternateRowStyles: { fillColor: LIGHT_GREY },
    columnStyles: { 0: { cellWidth: 35 }, 1: { halign: 'right', cellWidth: 45 } },
    margin: { left: 14, right: 14 },
  });
  return doc.lastAutoTable.finalY + 10;
}

function drawDeductions(doc, items, startY) {
  if (!items?.length) return startY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Rincian Potongan', 14, startY);
  doc.autoTable({
    startY: startY + 4,
    head: [['Keterangan', 'Jumlah']],
    body: items.map((item) => [item.keterangan, `-${rupiah(item.jumlah)}`]),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3.2, bottom: 3.2, left: 4, right: 4 }, textColor: TEXT },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 48 } },
    margin: { left: 14, right: 14 },
  });
  return doc.lastAutoTable.finalY + 10;
}

function drawTotals(doc, { subtotal, pajak, total }, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const boxW = 85;
  const boxX = pageW - 14 - boxW;
  const rowH = 8;
  const y = startY;

  doc.setDrawColor(...BORDER);
  doc.setFillColor(...LIGHT_GREY);
  doc.roundedRect(boxX, y, boxW, rowH * 2 + 4, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Subtotal:', boxX + 6, y + 7);
  doc.setTextColor(...TEXT);
  doc.text(rupiah(subtotal), pageW - 14 - 6, y + 7, { align: 'right' });

  doc.setTextColor(...MUTED);
  doc.text('Pajak:', boxX + 6, y + 7 + rowH);
  doc.setTextColor(...TEXT);
  doc.text(rupiah(pajak), pageW - 14 - 6, y + 7 + rowH, { align: 'right' });

  const lineY = y + rowH * 2 + 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(boxX, lineY, boxX + boxW, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT);
  doc.text('TOTAL:', boxX + 6, lineY + 9);
  doc.text(rupiah(total), pageW - 14 - 6, lineY + 9, { align: 'right' });

  return lineY + 18;
}

function drawPurchaseTotals(doc, { total, paid, remaining }, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const boxW = 85;
  const boxX = pageW - 14 - boxW;
  const rowH = 8;

  doc.setDrawColor(...BORDER);
  doc.setFillColor(...LIGHT_GREY);
  doc.roundedRect(boxX, startY, boxW, rowH * 2 + 4, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  [['Total:', total], ['Sudah dibayar:', paid]].forEach(([label, value], index) => {
    const y = startY + 7 + index * rowH;
    doc.setTextColor(...MUTED);
    doc.text(label, boxX + 6, y);
    doc.setTextColor(...TEXT);
    doc.text(rupiah(value), pageW - 20, y, { align: 'right' });
  });

  const lineY = startY + rowH * 2 + 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(boxX, lineY, boxX + boxW, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT);
  doc.text('SISA:', boxX + 6, lineY + 9);
  doc.text(rupiah(remaining), pageW - 20, lineY + 9, { align: 'right' });
  return lineY + 18;
}

function drawKeterangan(doc, keterangan, startY) {
  if (!keterangan) return startY;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(String(keterangan), pageW - 40);
  const boxH = 13 + lines.length * 4.5;
  let y = startY;

  if (y + boxH > pageH - 36) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(...LIGHT_GREY);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(14, y, pageW - 28, boxH, 2, 2, 'FD');
  doc.setFillColor(...NAVY);
  doc.rect(14, y, 1.2, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text('Keterangan:', 19, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(lines, 19, y + 13);

  return y + boxH + 8;
}

function drawSignature(doc, logoDataUrl, startY) {
  let y = startY;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT);
  doc.text('Hormat kami,', 14, y);

  const sigW = 32;
  const sigH = sigW * LOGO_RATIO;
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 14, y + 4, sigW, sigH);

  y += sigH + 28;
  doc.setFontSize(8.6);
  doc.setTextColor(...MUTED);
  doc.text(`Pembayaran bisa ditransfer ke ${BANK_INFO}`, 14, y);
}

function drawFooter(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text('Terima kasih atas kepercayaan Anda', pageW / 2, pageH - 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${COMPANY_ADDRESS} | Telp: ${COMPANY_PHONE} | Email: ${COMPANY_EMAIL}`, pageW / 2, pageH - 21, { align: 'center' });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(14, pageH - 16, pageW - 14, pageH - 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(...FAINT);
  doc.text(`Dokumen ini digenerate otomatis pada ${printedAt}`, pageW / 2, pageH - 11, { align: 'center' });
}

export async function downloadInvoicePdf(detail) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoDataUrl = await getLogoDataUrl().catch(() => null);

  const isPurchase = detail.tipe === 'pembelian';
  const documentTitle = isPurchase ? 'NOTA PEMBAYARAN SUSU' : 'INVOICE PENJUALAN';
  const numberLabel = isPurchase ? 'No. Nota' : 'No. Invoice';
  const dateLabel = isPurchase ? 'Tanggal Nota' : 'Tanggal Invoice';
  const headerH = drawHeader(doc, logoDataUrl, documentTitle);
  let y = drawMetaRow(doc, { documentNo: detail.no_invoice, tanggal: tanggalShort(detail.tanggal), numberLabel, dateLabel }, headerH);
  y = drawInfoBlock(doc, {
    documentNo: detail.no_invoice,
    numberLabel,
    tanggalStr: tanggalShort(detail.tanggal),
    jatuhTempoStr: detail.jatuh_tempo ? tanggalShort(detail.jatuh_tempo) : '-',
    pihakNama: detail.transaksi?.pihak_nama || 'Umum',
    pihakSub: detail.transaksi?.pihak_alamat || detail.transaksi?.pihak_telepon || '',
  }, y);
  if (isPurchase) y = drawMilkData(doc, detail.transaksi, y);
  y = drawItemsTable(doc, detail.items, y, { isPurchase, tanggal: detail.transaksi?.tanggal || detail.tanggal });
  if (isPurchase) {
    const paid = (detail.pembayaran || []).reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
    const total = Number(detail.transaksi?.total || 0);
    y = drawPaymentsTable(doc, detail.pembayaran || [], y);
    y = drawDeductions(doc, detail.potongan_items || detail.transaksi?.potongan_items || [], y);
    y = drawPurchaseTotals(doc, { total, paid, remaining: Math.max(0, total - paid) }, y);
  } else {
    y = drawTotals(doc, { subtotal: detail.transaksi?.total, pajak: 0, total: detail.transaksi?.total }, y);
  }
  y = drawKeterangan(doc, detail.keterangan, y);
  drawSignature(doc, logoDataUrl, y);
  drawFooter(doc);

  doc.save(`${detail.no_invoice}.pdf`);
}
