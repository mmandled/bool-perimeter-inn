function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function isPastOrToday(ymd: string) {
  const t = parseYmd(todayYmd());
  const d = parseYmd(ymd);
  if (!t || !d) return false;
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= t.getTime();
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const as = parseYmd(aStart);
  const ae = parseYmd(aEnd);
  const bs = parseYmd(bStart);
  const be = parseYmd(bEnd);
  if (!as || !ae || !bs || !be) return false;
  // Half-open intervals [start, end): checkout day is available for next check-in.
  return as < be && ae > bs;
}

