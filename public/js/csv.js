// Export CSV kompatibel Excel Indonesia (separator ; dan BOM UTF-8)
export function downloadCsv(fileName, rows) {
  const csv = rows
    .map((row) => row.map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(';'))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
