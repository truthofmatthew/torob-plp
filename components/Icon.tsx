import s from "./Icon.module.css";

// Figma icon components (Icon/*), exported as-is to /public/icons.
export type IconName = "shield-check" | "pin" | "filter" | "store" | "image" | "bell";

const NATURAL: Record<IconName, number> = {
  "shield-check": 16,
  pin: 16,
  filter: 16,
  store: 16,
  image: 24,
  bell: 16,
};

// Neutral-gray icons on card surfaces get a light tint in dark mode; brand and
// success icons keep their color. "image" sits on the media bg, which stays
// light in dark mode, so it is not tinted.
const NEUTRAL = new Set<IconName>(["filter", "store"]);

export default function Icon({ name, size }: { name: IconName; size?: number }) {
  const px = size ?? NATURAL[name];
  return (
    <img
      src={`/icons/${name}.svg`}
      width={px}
      height={px}
      alt=""
      aria-hidden
      className={NEUTRAL.has(name) ? `${s.icon} ${s.neutral}` : s.icon}
    />
  );
}
