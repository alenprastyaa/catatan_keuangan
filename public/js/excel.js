// Export Excel (.xlsx) berformat: judul, header berwarna, garis tabel, dan
// format Rupiah gaya akuntansi. ExcelJS dimuat sesuai permintaan (lazy) agar
// tidak membebani waktu buka aplikasi -- file-nya besar dan hanya dipakai
// saat tombol export ditekan.
const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

let excelJsPromise = null;

function loadExcelJs() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (excelJsPromise) return excelJsPromise;
  excelJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EXCELJS_URL;
    script.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS gagal dimuat.')));
    script.onerror = () => {
      excelJsPromise = null;
      reject(new Error('Gagal memuat pustaka Excel. Periksa koneksi internet.'));
    };
    document.head.appendChild(script);
  });
  return excelJsPromise;
}

const GOLD = 'FFFFC000';
const GOLD_SOFT = 'FFFFE699';
const GOLD_LINE = 'FFBF8F00';
const GRID_LINE = 'FFD9D9D9';

// Rupiah gaya akuntansi: simbol menempel di kiri sel, angka rata kanan,
// nilai nol tampil sebagai strip -- seperti contoh laporan manual.
export const RUPIAH_FMT = '_("Rp"* #,##0_);_("Rp"* \\(#,##0\\);_("Rp"* "-"_);_(@_)';

const border = (color) => ({
  top: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } },
});

/**
 * @param {object} opt
 * @param {string} opt.fileName   nama file hasil unduhan
 * @param {string} opt.title      judul yang dibentangkan di atas tabel
 * @param {string} [opt.subtitle] baris keterangan di bawah judul
 * @param {Array}  opt.columns    { header, key, width, align, numFmt }
 * @param {Array}  opt.rows       objek data sesuai key kolom
 * @param {object} [opt.totalRow] { label, labelSpan, values }
 */
export async function downloadStyledXlsx({ fileName, title, subtitle, columns, rows, totalRow, sheetName }) {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName || 'Laporan', {
    views: [{ state: 'frozen', ySplit: subtitle ? 3 : 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const lastCol = columns.length;
  const colLetter = (n) => ws.getColumn(n).letter;
  const span = (rowNumber) => `A${rowNumber}:${colLetter(lastCol)}${rowNumber}`;

  ws.columns = columns.map((c) => ({ key: c.key, width: c.width || 16 }));

  // Judul
  ws.mergeCells(span(1));
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: 'FF3F3000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(1).height = 26;
  for (let c = 1; c <= lastCol; c += 1) ws.getRow(1).getCell(c).border = border(GOLD_LINE);

  let cursor = 2;
  if (subtitle) {
    ws.mergeCells(span(2));
    const sub = ws.getCell('A2');
    sub.value = subtitle;
    sub.font = { size: 10, italic: true, color: { argb: 'FF5B4A00' } };
    sub.alignment = { horizontal: 'center', vertical: 'middle' };
    sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_SOFT } };
    for (let c = 1; c <= lastCol; c += 1) ws.getRow(2).getCell(c).border = border(GOLD_LINE);
    ws.getRow(2).height = 18;
    cursor = 3;
  }

  // Header kolom
  const headerRow = ws.getRow(cursor);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 11, color: { argb: 'FF3F3000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
    cell.border = border(GOLD_LINE);
  });
  headerRow.height = 24;
  ws.autoFilter = { from: { row: cursor, column: 1 }, to: { row: cursor, column: lastCol } };

  // Isi tabel
  rows.forEach((row) => {
    cursor += 1;
    const r = ws.getRow(cursor);
    columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      const value = row[c.key];
      cell.value = value === undefined || value === null || value === '' ? null : value;
      cell.alignment = { horizontal: c.align || 'left', vertical: 'middle' };
      if (c.numFmt) cell.numFmt = c.numFmt;
      cell.border = border(GRID_LINE);
      if (row._emphasis) cell.font = { bold: true };
    });
    r.height = 18;
  });

  // Baris total
  if (totalRow) {
    cursor += 1;
    const r = ws.getRow(cursor);
    const labelSpan = totalRow.labelSpan || 1;
    if (labelSpan > 1) ws.mergeCells(`A${cursor}:${colLetter(labelSpan)}${cursor}`);
    const labelCell = r.getCell(1);
    labelCell.value = totalRow.label;
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      if (i + 1 > labelSpan) {
        const value = totalRow.values[c.key];
        cell.value = value === undefined ? null : value;
        cell.alignment = { horizontal: c.align || 'left', vertical: 'middle' };
        if (c.numFmt) cell.numFmt = c.numFmt;
      }
      cell.font = { bold: true, size: 11, color: { argb: 'FF3F3000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
      cell.border = border(GOLD_LINE);
    });
    r.height = 22;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
