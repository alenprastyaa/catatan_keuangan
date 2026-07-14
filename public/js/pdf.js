import { getLogoDataUrl, LOGO_RATIO } from './logo.js';

const COMPANY_ADDRESS = 'Jl. Pagerageung No. 28 Kab. Tasikmalaya - Jabar 46158';
const COMPANY_PHONE = '0813 8538 9191';
const COMPANY_EMAIL = 'mitrayasadairy@gmail.com';

const C = {
  navy: [33, 61, 138],
  primary: [79, 70, 229],
  accent: [124, 108, 246],
  text: [23, 28, 46],
  muted: [122, 129, 153],
  faint: [176, 181, 199],
  rowAlt: [246, 247, 252],
  border: [232, 234, 242],
  cardBg: [248, 249, 253],
  success: [11, 138, 97],
  warning: [180, 83, 9],
  danger: [207, 52, 52],
};

const STATUS_COLOR = {
  lunas: C.success,
  paid: C.success,
  masuk: C.success,
  hutang: C.danger,
  piutang: C.danger,
  overdue: C.danger,
  keluar: C.danger,
  sebagian: C.warning,
  unpaid: C.warning,
};

function drawHeader(doc, { title, subtitle, meta }, logoDataUrl) {
  const pageW = doc.internal.pageSize.getWidth();
  const H = 36;
  const wBottom = pageW * 0.34;
  const wTop = pageW * 0.44;

  doc.setFillColor(...C.navy);
  doc.rect(0, 0, wBottom, H, 'F');
  doc.triangle(wBottom, 0, wTop, 0, wBottom, H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(255, 255, 255);
  doc.text(String(title).toUpperCase(), 14, 17, { maxWidth: wBottom - 20 });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(203, 208, 232);
    doc.text(subtitle, 14, 26, { maxWidth: wBottom - 20 });
  }

  if (logoDataUrl) {
    const logoW = Math.min(56, pageW * 0.24);
    const logoH = logoW * LOGO_RATIO;
    const logoX = pageW - 14 - logoW;
    const logoY = (H - logoH) / 2 + 2;
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
  }

  let y = H + 9;
  if (meta && meta.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(...C.text);
    doc.text(meta.join('      '), pageW - 14, y, { align: 'right' });
  }

  y += 5;
  doc.setFillColor(...C.navy);
  doc.rect(0, y, pageW, 1, 'F');

  return y + 10;
}

function drawStats(doc, stats, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const gap = 5;
  const cardW = (pageW - 28 - gap * (stats.length - 1)) / stats.length;
  const cardH = 19;

  stats.forEach((s, i) => {
    const x = 14 + i * (cardW + gap);

    doc.setFillColor(...C.cardBg);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, startY, cardW, cardH, 3.2, 3.2, 'FD');

    // aksen kecil di kiri kartu
    const accentColor = s.accent || C.primary;
    doc.setFillColor(...accentColor);
    doc.roundedRect(x + 4, startY + 5.4, 1.5, 8.2, 0.75, 0.75, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...C.muted);
    doc.text(String(s.label).toUpperCase(), x + 8.5, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...(s.accent || C.text));
    doc.text(String(s.value), x + 8.5, startY + 14.8);
  });

  return startY + cardH + 9;
}

function drawSectionHeading(doc, heading, y) {
  doc.setFillColor(...C.navy);
  doc.roundedRect(14, y - 3.4, 1.6, 4.6, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...C.text);
  doc.text(heading, 18.5, y);
  return y + 5.5;
}

function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...C.text);
    doc.text('MITRAYASA DAIRY NATURAL', 14, pageH - 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`${COMPANY_ADDRESS} | Telp: ${COMPANY_PHONE} | Email: ${COMPANY_EMAIL}`, 14, pageH - 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...C.faint);
    doc.text(`Dicetak ${printedAt}`, pageW - 14, pageH - 10.5, { align: 'right' });

    // pill nomor halaman
    const label = `${i} / ${pageCount}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    const w = doc.getTextWidth(label) + 8;
    doc.setFillColor(...C.navy);
    doc.roundedRect(pageW - 14 - w, pageH - 15, w, 6.6, 3.3, 3.3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, pageW - 14 - w / 2, pageH - 10.6, { align: 'center' });
  }
}

function statusCellHook(statusColumn) {
  return (data) => {
    if (data.section === 'body' && data.column.index === statusColumn) {
      const color = STATUS_COLOR[String(data.cell.raw).toLowerCase()];
      if (color) {
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  };
}

export async function downloadReportPdf({ fileName, title, subtitle, meta = [], stats, sections, orientation = 'landscape' }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const logoDataUrl = await getLogoDataUrl().catch(() => null);

  let y = drawHeader(doc, { title, subtitle, meta }, logoDataUrl);

  if (stats && stats.length) {
    y = drawStats(doc, stats, y);
  }

  sections.forEach((section) => {
    if (section.heading) {
      y = drawSectionHeading(doc, section.heading, y);
    }

    const rows = section.rows.length > 0
      ? section.rows
      : [[{ content: 'Tidak ada data.', colSpan: section.columns.length, styles: { halign: 'center', textColor: C.muted, fontStyle: 'italic' } }]];

    doc.autoTable({
      startY: y,
      head: [section.columns.map((c) => String(c).toUpperCase())],
      body: rows,
      foot: section.foot ? [section.foot] : undefined,
      theme: 'plain',
      styles: { fontSize: 8.4, cellPadding: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 }, textColor: C.text },
      headStyles: {
        fillColor: C.navy,
        textColor: [224, 227, 245],
        fontStyle: 'bold',
        fontSize: 7,
      },
      footStyles: { fillColor: C.primary, textColor: 255, fontStyle: 'bold', fontSize: 8.8 },
      alternateRowStyles: { fillColor: C.rowAlt },
      margin: { left: 14, right: 14, top: 44 },
      columnStyles: section.columnStyles || {},
      didParseCell: section.statusColumn !== undefined ? statusCellHook(section.statusColumn) : undefined,
      willDrawCell: (data) => {
        // garis pemisah tipis antar-baris body
        if (data.section === 'body' && data.row.index > 0 && data.column.index === 0) {
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.15);
          doc.line(14, data.cell.y, doc.internal.pageSize.getWidth() - 14, data.cell.y);
        }
      },
    });

    y = doc.lastAutoTable.finalY + 11;
  });

  drawFooter(doc);
  doc.save(fileName);
}
