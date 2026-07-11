function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// Mengembalikan { start, end } (YYYY-MM-DD) berdasarkan query period=today|week|month|custom
function resolvePeriode({ period = 'month', start, end }) {
  const now = new Date();

  if (period === 'custom' && start && end) {
    return { start, end };
  }

  if (period === 'today') {
    const today = toDateStr(now);
    return { start: today, end: today };
  }

  if (period === 'week') {
    const day = now.getDay() === 0 ? 7 : now.getDay(); // Senin=1..Minggu=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    return { start: toDateStr(monday), end: toDateStr(now) };
  }

  // default: month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toDateStr(firstDay), end: toDateStr(now) };
}

module.exports = { resolvePeriode };
