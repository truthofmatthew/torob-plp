import type { Airport } from "./types";

// Domestic airports the picker offers, with the Persian names users type.
// THR is Mehrabad (domestic flights from Tehran). `aliases` feed the picker's
// search and the natural-language parser.
export const AIRPORTS: (Airport & { name: string; aliases: string[]; popular?: boolean })[] = [
  { code: "THR", city: "تهران", name: "مهرآباد", aliases: ["تهران", "مهراباد", "مهرآباد"], popular: true },
  { code: "MHD", city: "مشهد", name: "شهید هاشمی‌نژاد", aliases: ["مشهد"], popular: true },
  { code: "KIH", city: "کیش", name: "کیش", aliases: ["کیش"], popular: true },
  { code: "SYZ", city: "شیراز", name: "شهید دستغیب", aliases: ["شیراز"], popular: true },
  { code: "IFN", city: "اصفهان", name: "شهید بهشتی", aliases: ["اصفهان"], popular: true },
  { code: "TBZ", city: "تبریز", name: "شهید مدنی", aliases: ["تبریز"], popular: true },
  { code: "AWZ", city: "اهواز", name: "اهواز", aliases: ["اهواز"], popular: true },
  { code: "BND", city: "بندرعباس", name: "بندرعباس", aliases: ["بندرعباس", "بندر عباس"], popular: true },
  { code: "KER", city: "کرمان", name: "آیت‌الله هاشمی رفسنجانی", aliases: ["کرمان"] },
  { code: "KSH", city: "کرمانشاه", name: "شهید اشرفی اصفهانی", aliases: ["کرمانشاه"] },
  { code: "RAS", city: "رشت", name: "سردار جنگل", aliases: ["رشت"] },
  { code: "GSM", city: "قشم", name: "قشم", aliases: ["قشم"] },
  { code: "ZBR", city: "چابهار", name: "کنارک", aliases: ["چابهار"] },
  { code: "AZD", city: "یزد", name: "شهید صدوقی", aliases: ["یزد"] },
  { code: "OMH", city: "ارومیه", name: "ارومیه", aliases: ["ارومیه"] },
  { code: "SRY", city: "ساری", name: "دشت ناز", aliases: ["ساری"] },
  { code: "ZAH", city: "زاهدان", name: "زاهدان", aliases: ["زاهدان"] },
  { code: "BUZ", city: "بوشهر", name: "بوشهر", aliases: ["بوشهر"] },
  { code: "ABD", city: "آبادان", name: "آبادان", aliases: ["آبادان", "ابادان"] },
  { code: "ADU", city: "اردبیل", name: "اردبیل", aliases: ["اردبیل"] },
  { code: "GBT", city: "گرگان", name: "گرگان", aliases: ["گرگان"] },
  { code: "HDM", city: "همدان", name: "همدان", aliases: ["همدان"] },
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export const isAirport = (code: string) => BY_CODE.has(code);
export const cityOf = (code: string) => BY_CODE.get(code)?.city ?? code;
export const airportOf = (code: string) => BY_CODE.get(code) ?? null;

/** Picker search: matches city, airport name, alias or IATA code. */
export function searchAirports(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return AIRPORTS;
  return AIRPORTS.filter(
    (a) => a.code.toLowerCase().includes(t) || a.city.includes(t) || a.name.includes(t) || a.aliases.some((x) => x.includes(t)),
  );
}
