// Torob's image CDN serves resized variants by suffix: <url>_/0x<height>.webp.
// Cards show 132px images, so a 280px thumb covers 2× screens at a fraction of
// the bytes of the 1000px+ originals, which also made the CDN drop requests
// when a grid asked for 24 originals at once.

const TOROB_BASE = /^https:\/\/image\.torob\.com\/base\/images\/[^?#]+$/;

export function thumb(url: string | null | undefined, height: number): string | null {
  if (!url) return null;
  if (!TOROB_BASE.test(url) || url.includes("_/")) return url;
  return `${url}_/0x${height}.webp`;
}
