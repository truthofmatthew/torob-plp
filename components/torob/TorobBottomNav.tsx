import s from "./TorobBottomNav.module.css";

// Torob's current mobile bottom navigation, copied 1:1 from torob.com
// (BottomNavigation_mobile_navBar). Must not change; links go to the real site.

const ITEMS = [
  {
    href: "https://torob.com/",
    label: "جستجو",
    d: "M19.7 18.3l-4.5-4.5c1.1-1.4 1.8-3.3 1.8-5.3C17 3.8 13.2 0 8.5 0S0 3.8 0 8.5 3.8 17 8.5 17c2 0 3.8-.7 5.3-1.8l4.5 4.5c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4zM2 8.5C2 4.9 4.9 2 8.5 2S15 4.9 15 8.5c0 1.8-.7 3.4-1.9 4.6A6.42 6.42 0 0 1 8.5 15C4.9 15 2 12.1 2 8.5z",
  },
  {
    href: "https://torob.com/category-root/0/",
    label: "دسته‌بندی‌",
    d: "M8 0H1C.4 0 0 .4 0 1v7c0 .6.4 1 1 1h7c.6 0 1-.4 1-1V1c0-.6-.4-1-1-1zM7 7H2V2h5v5zm12-7h-7c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h7c.6 0 1-.4 1-1V1c0-.6-.4-1-1-1zm-1 7h-5V2h5v5zm1 4h-7c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h7c.6 0 1-.4 1-1v-7c0-.6-.4-1-1-1zm-1 7h-5v-5h5v5zM8 11H1c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h7c.6 0 1-.4 1-1v-7c0-.6-.4-1-1-1zm-1 7H2v-5h5v5z",
  },
  {
    href: "https://torob.com/special-offers",
    label: "پیشنهاد ویژه",
    d: "M20.108 8.816L11.59.297C11.392.1 11.193 0 10.896 0H.991C.396 0 0 .396 0 .99v9.906c0 .297.1.496.297.694l8.519 8.518c.594.595 1.288.892 2.08.892.793 0 1.585-.297 2.08-.892l7.132-7.132c1.19-1.188 1.19-2.971 0-4.16zm-1.386 2.774l-7.132 7.132a.958.958 0 0 1-1.387 0L1.98 10.5V1.981H10.5l8.222 8.222a.958.958 0 0 1 0 1.387zM6.637 5.25c.198.198.297.396.297.693 0 .298-.1.496-.297.694-.198.198-.396.297-.694.297-.297 0-.495-.1-.693-.297-.1-.1-.198-.198-.198-.297-.1-.1-.1-.298-.1-.397 0-.297.1-.495.298-.693.297-.297.693-.396 1.09-.198.099 0 .198.099.297.198z",
  },
  {
    href: "https://torob.com/user/",
    label: "ترب من",
    d: "M18 17v2c0 .6-.4 1-1 1s-1-.4-1-1v-2c0-1.7-1.3-3-3-3H5c-1.7 0-3 1.3-3 3v2c0 .6-.4 1-1 1s-1-.4-1-1v-2c0-2.8 2.2-5 5-5h8c2.8 0 5 2.2 5 5zM4 5c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5zm2 0c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3-3 1.3-3 3z",
  },
];

export default function TorobBottomNav() {
  return (
    <nav className={s.nav} aria-label="منوی اصلی ترب">
      <ul className={s.list}>
        {ITEMS.map((it) => (
          <li key={it.label} className={s.item}>
            <a href={it.href} className={s.link}>
              <span className={s.icon}>
                <svg fill="#1e293b" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <g transform="translate(2 2)">
                    <path d={it.d} />
                  </g>
                </svg>
              </span>
              <p className={s.label}>{it.label}</p>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
