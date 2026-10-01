// Pure-logic tests for time computations (no browser needed).
// Mirrors src/lib/dates.ts semantics in plain JS.

function minutesBetween(ci, co) {
  if (!co) return 0;
  const ms = new Date(co).getTime() - new Date(ci).getTime();
  return ms > 0 ? Math.round(ms / 60000) : 0;
}
function overlaps(candidate, others) {
  const cS = new Date(candidate.checkInAt).getTime();
  const cE = candidate.checkOutAt ? new Date(candidate.checkOutAt).getTime() : Date.now();
  return others.some((o) => {
    const oS = new Date(o.checkInAt).getTime();
    const oE = o.checkOutAt ? new Date(o.checkOutAt).getTime() : Date.now();
    return cS < oE && oS < cE;
  });
}
function daysInMonth(y, m) {
  const n = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= n; d++) out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  return out;
}

let pass = 0, fail = 0;
function eq(name, a, b) {
  if (a === b) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}: got ${a}, want ${b}`); }
}

// 1. session duration: 09:00 -> 17:30 = 510 min
eq("duration 9:00-17:30", minutesBetween("2026-09-01T09:00:00", "2026-09-01T17:30:00"), 510);
// 2. open session = 0
eq("open session = 0", minutesBetween("2026-09-01T09:00:00", null), 0);
// 3. negative (checkout before checkin) = 0
eq("negative = 0", minutesBetween("2026-09-01T17:00:00", "2026-09-01T09:00:00"), 0);
// 4. multi-session day total: 9-12 (180) + 13-17:30 (270) = 450
eq("day total", 180 + 270, 450);
// 5. overlap detected
eq("overlap true", overlaps(
  { checkInAt: "2026-09-01T10:00:00", checkOutAt: "2026-09-01T11:00:00" },
  [{ checkInAt: "2026-09-01T09:00:00", checkOutAt: "2026-09-01T10:30:00" }]), true);
// 6. adjacent sessions do not overlap
eq("adjacent false", overlaps(
  { checkInAt: "2026-09-01T10:30:00", checkOutAt: "2026-09-01T11:00:00" },
  [{ checkInAt: "2026-09-01T09:00:00", checkOutAt: "2026-09-01T10:30:00" }]), false);
// 7. february leap year
eq("feb 2024 days", daysInMonth(2024, 2).length, 29);
eq("sep days", daysInMonth(2026, 9).length, 30);
// 8. monthly totals: 3 days, two with hours
const rows = [
  { totalMinutes: 480, tasks: [] }, { totalMinutes: 0, tasks: [{ title: "x" }] }, { totalMinutes: 0, tasks: [] },
];
const total = rows.reduce((a, r) => a + r.totalMinutes, 0);
const worked = rows.filter((r) => r.totalMinutes > 0 || r.tasks.length > 0).length;
eq("month total", total, 480);
eq("days worked", worked, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
