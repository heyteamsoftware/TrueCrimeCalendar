// Genera un CSV (Google Calendar) y un ICS a partir de los datos del HTML.
// Uso: node tools/exportar_calendario.js app/src/main/assets/index.html google-calendar [años] [nombre.csv]
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const [htmlPath, outDir, yearsArg, csvName] = process.argv.slice(2);
const YEARS = Number(yearsArg) || 5;
const html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf("const D = [];");
const end = html.indexOf("const GROUPS");
if (start < 0 || end < 0) throw new Error("No se encontraron los datos en el HTML");
const ctx = {};
vm.runInNewContext(html.slice(start, end) + "\nthis.D = D;", ctx);
const D = ctx.D;

const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dayIn = (e, y) => (e.m === 2 && e.d === 29 && !isLeap(y)) ? 28 : e.d;
const pad = n => String(n).padStart(2, "0");
const title = e => `${e.n} · Víctimas: ${e.v}`;

// ---------- CSV: próximos YEARS años desde hoy ----------
const today = new Date(); today.setHours(0, 0, 0, 0);
const until = new Date(today); until.setFullYear(until.getFullYear() + YEARS);
const csvCell = s => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
const rows = [];
for (let y = today.getFullYear(); y <= until.getFullYear(); y++) {
  for (const e of D) {
    const date = new Date(y, e.m - 1, dayIn(e, y));
    if (date < today || date >= until) continue;
    rows.push({ date, line: [title(e), `${pad(e.m)}/${pad(dayIn(e, y))}/${y}`, "True"].map(csvCell).join(",") });
  }
}
rows.sort((a, b) => a.date - b.date);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, csvName || "true_crime_calendar.csv"),
  ["Subject,Start Date,All Day Event", ...rows.map(r => r.line)].join("\r\n") + "\r\n", "utf8");

// ---------- ICS: un evento anual por persona (se repite siempre) ----------
const icsText = s => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fold = line => { // líneas de máx. 75 octetos (RFC 5545)
  const out = []; let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
};
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//heyteamsoftware//True Crime Calendar//ES",
  "CALSCALE:GREGORIAN", "X-WR-CALNAME:TRUE CRIME CALENDAR"];
for (const e of D) {
  const ymd = `${e.y}${pad(e.m)}${pad(e.d)}`;
  const next = new Date(e.y, e.m - 1, e.d + 1);
  const ymdEnd = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  ics.push("BEGIN:VEVENT", `UID:${e.id}@truecrimecalendar.heyteamsoftware.com`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${ymdEnd}`,
    // 29 de febrero: el último día de febrero de cada año (igual que en la app)
    e.m === 2 && e.d === 29 ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1" : "RRULE:FREQ=YEARLY",
    fold(`SUMMARY:${icsText(title(e))}`), "TRANSP:TRANSPARENT", "END:VEVENT");
}
ics.push("END:VCALENDAR");
fs.writeFileSync(path.join(outDir, "true_crime_calendar.ics"), ics.join("\r\n") + "\r\n", "utf8");

console.log(`personas: ${D.length}, filas CSV: ${rows.length} (${rows[0].line.split(",")[1]} → ${rows.at(-1).line.split(",").at(-2)})`);
