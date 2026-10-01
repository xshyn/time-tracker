// Jalali (Shamsi) calendar math — integer algorithm, no dependencies.
// Core algorithm matches the well-known jalaali-js implementation.

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456,
  3178,
];

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0]!;
  let jm = 0;
  let jump = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]!) throw new Error(`invalid Jalali year ${jy}`);
  for (let i = 1; i < bl; i++) {
    jm = BREAKS[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function daysFromCivil(gy: number, gm: number, gd: number): number {
  let y = gy - (gm <= 2 ? 1 : 0);
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400; // [0, 399]
  const mp = (gm + 9) % 12; // [0, 11], March-based
  const doy = Math.floor((153 * mp + 2) / 5) + gd - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468; // days since 1970-01-01
}

const JDN_1970 = 2440588; // Julian day number of 1970-01-01

function g2d(gy: number, gm: number, gd: number): number {
  return daysFromCivil(gy, gm, gd) + JDN_1970;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  const z = jdn - JDN_1970 + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  let gy = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const gd = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const gm = mp + (mp < 10 ? 3 : -9);
  gy += gm <= 2 ? 1 : 0;
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export interface JalaliDate {
  jy: number;
  jm: number; // 1-12
  jd: number; // 1-31
}

export interface GregorianDate {
  gy: number;
  gm: number; // 1-12
  gd: number; // 1-31
}

export function toJalaali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  const diff = jdn - jdn1f;
  if (diff >= 0) {
    if (diff <= 185) {
      return { jy, jm: 1 + div(diff, 31), jd: mod(diff, 31) + 1 };
    }
    // Days since Mehr 1 (Farvardin..Shahrivar span 186 days).
    const k = diff - 186;
    return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }
  // Date falls in Mehr..Esfand of the previous Jalali year.
  // Those six months span 179 days (180 in a leap year) before Farvardin 1.
  jy -= 1;
  let back = diff + 179;
  if (r.leap === 1) back += 1;
  return { jy, jm: 7 + div(back, 30), jd: mod(back, 30) + 1 };
}

export function isLeapJalaaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

export function toJalaaliKey(dateKey: string): JalaliDate {
  const [y, m, d] = dateKey.split("-").map(Number);
  return toJalaali(y ?? 1970, m ?? 1, d ?? 1);
}

export function toGregorianKey(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${gy}-${p(gm)}-${p(gd)}`;
}

export function jalaliToday(): JalaliDate {
  const now = new Date();
  return toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export const JALALI_MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Saturday-first short weekday labels for the Jalali grid. */
export const JALALI_WEEKDAYS_FA_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function faNum(n: number): string {
  return n.toLocaleString("fa-IR", { useGrouping: false });
}

/** e.g. "۱ مهر ۱۴۰۵" */
export function formatJalaliLong(dateKey: string): string {
  const { jy, jm, jd } = toJalaaliKey(dateKey);
  return `${faNum(jd)} ${JALALI_MONTHS_FA[jm - 1]} ${faNum(jy)}`;
}

/** e.g. "مهر ۱۴۰۵" */
export function formatJalaliMonth(jy: number, jm: number): string {
  return `${JALALI_MONTHS_FA[jm - 1]} ${faNum(jy)}`;
}
