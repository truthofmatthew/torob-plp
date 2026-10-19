import { enDigits } from "../format";
import { AIRPORTS } from "./airports";
import { addDaysG, toJalali, todayG } from "./jalali";
import type { Intent } from "./rank";
import type { Party } from "./types";

// «مشهد پنجشنبه صبح، ۳ نفر، بار زیاد» → structured filters. Rule-based and
// pure (runs in the browser, no key, no network). Every field it fills is
// shown back as a chip the user can fix, and whatever it can't read is left
// to the form, so a wrong guess is visible rather than silent.

export type ParsedQuery = {
  from?: string;
  to?: string;
  /** Jalali yyyy-mm-dd */
  date?: string;
  party?: Party;
  intent?: Intent;
  minBaggageKg?: number;
  /** What was recognised, in reading order, for the chips. */
  tokens: { kind: "from" | "to" | "date" | "party" | "intent" | "baggage"; text: string }[];
};

const WORD_NUM: Record<string, number> = { یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9 };
// JS getUTCDay(): 0 = Sunday. Persian week starts Saturday.
const WEEKDAYS: [RegExp, number][] = [
  [/(?:^|\s)شنبه/, 6],
  [/یک\s?شنبه|یکشنبه/, 0],
  [/دو\s?شنبه|دوشنبه/, 1],
  [/سه\s?شنبه|سه‌شنبه/, 2],
  [/چهار\s?شنبه|چهارشنبه/, 3],
  [/پنج\s?شنبه|پنجشنبه/, 4],
  [/جمعه/, 5],
];

const num = (s: string) => WORD_NUM[s] ?? Number(enDigits(s));
const NUM = "([0-9۰-۹]+|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه)";

function findCities(text: string) {
  const hits: { code: string; city: string; at: number }[] = [];
  for (const a of AIRPORTS) {
    for (const alias of a.aliases) {
      const at = text.indexOf(alias);
      if (at >= 0 && !hits.some((h) => h.code === a.code)) hits.push({ code: a.code, city: a.city, at });
    }
  }
  return hits.sort((a, b) => a.at - b.at);
}

export function parseFlightQuery(input: string, today = todayG()): ParsedQuery {
  // Normalise: Persian/Arabic digits and letters, ZWNJ → space for matching.
  const text = enDigits(input).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ");
  const out: ParsedQuery = { tokens: [] };

  // Route: «از X به Y», «X به Y», or a single city = destination (origin from the form).
  const cities = findCities(text);
  const fromMarked = cities.find((c) => new RegExp(`از\\s*${c.city}`).test(text));
  const toMarked = cities.find((c) => new RegExp(`(به|تا)\\s*${c.city}`).test(text));
  if (cities.length >= 2) {
    const from = fromMarked ?? cities.find((c) => c !== toMarked)!;
    const to = toMarked && toMarked !== from ? toMarked : cities.find((c) => c !== from)!;
    out.from = from.code;
    out.to = to.code;
  } else if (cities.length === 1) {
    if (fromMarked) out.from = cities[0].code;
    else out.to = cities[0].code;
  }
  if (out.from) out.tokens.push({ kind: "from", text: `از ${cities.find((c) => c.code === out.from)!.city}` });
  if (out.to) out.tokens.push({ kind: "to", text: `به ${cities.find((c) => c.code === out.to)!.city}` });

  // Date: امروز / فردا / پس‌فردا / next <weekday>.
  let g: string | undefined;
  if (/پس\s?فردا/.test(text)) g = addDaysG(today, 2);
  else if (/فردا/.test(text)) g = addDaysG(today, 1);
  else if (/امروز/.test(text)) g = today;
  else {
    const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
    // Check longer names first so «پنجشنبه» isn't read as «شنبه».
    for (const [re, dow] of [...WEEKDAYS].reverse()) {
      if (re.test(text)) {
        const ahead = (dow - todayDow + 7) % 7 || 7;
        g = addDaysG(today, ahead);
        break;
      }
    }
  }
  if (g) {
    out.date = toJalali(g);
    out.tokens.push({ kind: "date", text: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${g}T12:00:00Z`)) });
  }

  // Party: «۳ نفر», «۲ بزرگسال و ۱ کودک», «یک نوزاد».
  const pick = (re: RegExp) => {
    const m = new RegExp(`${NUM}\\s*${re.source}`).exec(text);
    return m ? num(m[1]) : undefined;
  };
  const people = pick(/(نفر|مسافر)/);
  const adults = pick(/(بزرگسال|بزرگ‌سال)/);
  const children = pick(/(کودک|بچه)/) ?? 0;
  const infants = pick(/(نوزاد)/) ?? 0;
  if (people || adults || children || infants) {
    const a = adults ?? Math.max((people ?? 1) - children - infants, 1);
    out.party = { adults: Math.min(a, 9), children: Math.min(children, 8), infants: Math.min(infants, a) };
    const n = out.party.adults + out.party.children + out.party.infants;
    out.tokens.push({ kind: "party", text: `${n.toLocaleString("fa-IR")} مسافر` });
  }

  // Intent words.
  const intents: [RegExp, Intent, string][] = [
    [/استرداد|کنسل|لغو/, "refundable", "قابل استرداد"],
    [/ارزان|ارزون/, "cheapest", "ارزان‌ترین"],
    [/سریع|کوتاه/, "fastest", "سریع‌ترین"],
    [/صبح/, "morning", "صبح زود"],
    [/عصر|شب|بعدازظهر|بعد از ظهر/, "evening", "عصر و شب"],
  ];
  for (const [re, intent, label] of intents) {
    if (re.test(text)) {
      out.intent = intent;
      out.tokens.push({ kind: "intent", text: label });
      break;
    }
  }

  // Baggage: «بار زیاد» / «۳۰ کیلو».
  const kg = /([0-9]+)\s*(کیلو|kg)/i.exec(text);
  if (kg) out.minBaggageKg = Number(kg[1]);
  // 20 kg is the usual allowance; «بار زیاد» drops the 15 kg fares.
  else if (/بار\s*(زیاد|بیشتر)|چمدان/.test(text)) out.minBaggageKg = 20;
  if (out.minBaggageKg) out.tokens.push({ kind: "baggage", text: `بار ≥ ${out.minBaggageKg.toLocaleString("fa-IR")} کیلو` });

  return out;
}
