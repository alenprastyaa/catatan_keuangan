const C = {
  navy: [28, 30, 51],
  navy2: [35, 38, 74],
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

function withOpacity(doc, opacity, fn) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity }));
  fn();
  doc.restoreGraphicsState();
}

function drawHeader(doc, { title, subtitle, meta }) {
  const pageW = doc.internal.pageSize.getWidth();
  const H = 34;

  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, H, 'F');

  // dekorasi blob di kanan
  withOpacity(doc, 0.1, () => {
    doc.setFillColor(...C.accent);
    doc.circle(pageW - 24, 4, 26, 'F');
  });
  withOpacity(doc, 0.14, () => {
    doc.setFillColor(...C.primary);
    doc.circle(pageW - 62, H + 6, 20, 'F');
  });
  withOpacity(doc, 0.08, () => {
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW - 100, -6, 14, 'F');
  });

  // aksen garis bawah header
  doc.setFillColor(...C.primary);
  doc.rect(0, H, pageW * 0.38, 1.3, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(pageW * 0.38, H, pageW * 0.62, 1.3, 'F');

  // logo mark
  doc.setFillColor(...C.primary);
  doc.roundedRect(14, 7, 10.5, 10.5, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Rp', 19.25, 13.1, { align: 'center' });

  // brand
  doc.setFontSize(11.5);
  doc.text('Catatan Keuangan', 28.5, 11.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...C.faint);
  doc.text('F I N A N C E   R E P O R T', 28.5, 15.6);

  // judul laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 26.5);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(199, 203, 224);
    doc.text(subtitle, 14, 31);
  }

  // meta chips di kanan
  if (meta && meta.length) {
    doc.setFontSize(7.6);
    let chipY = 8;
    meta.forEach((line) => {
      const w = doc.getTextWidth(line) + 8;
      const x = pageW - 14 - w;
      withOpacity(doc, 0.12, () => {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, chipY, w, 7.4, 3.7, 3.7, 'F');
      });
      doc.setTextColor(224, 227, 245);
      doc.text(line, x + 4, chipY + 4.9);
      chipY += 9.6;
    });
  }

  return H + 10;
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
  doc.setFillColor(...C.primary);
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

    doc.setFillColor(...C.primary);
    doc.rect(14, pageH - 13.6, 26, 0.8, 'F');
    doc.setFillColor(...C.border);
    doc.rect(40, pageH - 13.6, pageW - 54, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...C.text);
    doc.text('Catatan Keuangan', 14, pageH - 8.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`Dicetak ${printedAt}`, 14 + doc.getTextWidth('Catatan Keuangan') + 4, pageH - 8.2);

    // pill nomor halaman
    const label = `${i} / ${pageCount}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    const w = doc.getTextWidth(label) + 8;
    doc.setFillColor(...C.navy);
    doc.roundedRect(pageW - 14 - w, pageH - 12.4, w, 6.6, 3.3, 3.3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, pageW - 14 - w / 2, pageH - 8, { align: 'center' });
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

export function downloadReportPdf({ fileName, title, subtitle, meta = [], stats, sections, orientation = 'landscape' }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, { title, subtitle, meta });

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
