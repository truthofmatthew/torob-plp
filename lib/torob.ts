import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

// Server-side client for Torob's public catalog. Endpoints come from env only.
// Good-client rules: descriptive UA, 5-min cache (memory + disk), ≤1 req/s.

const TTL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 1000;
const TIMEOUT_MS = 6000;
const USER_AGENT =
  "TorobPLP-Prototype/0.1 (hiring-challenge demo; read-only; +https://github.com/truthofmatthew/torob-plp)";

// Vercel functions can only write to /tmp.
const CACHE_DIR = process.env.VERCEL ? "/tmp/.cache" : path.join(process.cwd(), ".cache");

export class UpstreamUnavailable extends Error {}

export type EndpointName =
  | "TOROB_SEARCH_URL"
  | "TOROB_DETAILS_URL"
  | "TOROB_SIMILAR_URL"
  | "TOROB_PRICE_CHART_URL"
  | "TOROB_CATEGORY_URL"
  | "TOROB_OFFERS_URL"
  | "TOROB_TRENDS_URL";

export function endpoint(name: EndpointName): URL {
  const v = process.env[name];
  if (!v) throw new UpstreamUnavailable(`${name} is not set`);
  return new URL(v);
}

function extraHeaders(): Record<string, string> {
  const raw = process.env.TOROB_SEARCH_HEADERS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

// ---- cache -------------------------------------------------------------
type Entry = { at: number; body: unknown };
const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

const keyOf = (url: string) => createHash("sha1").update(url).digest("hex");

async function readDisk(key: string): Promise<Entry | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(CACHE_DIR, key + ".json"), "utf8")) as Entry;
  } catch {
    return null;
  }
}

async function writeDisk(key: string, entry: Entry) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, key + ".json"), JSON.stringify(entry));
  } catch {
    // Disk cache is best-effort.
  }
}

// ---- rate limit: one global queue, ≥1s between outbound calls ----------
let nextSlot = 0;
async function takeSlot() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

/** GET JSON from Torob with cache + rate limit. Returns where it came from. */
export async function getJson(url: URL): Promise<{ body: unknown; source: "live" | "cache" }> {
  const href = url.toString();
  const key = keyOf(href);

  const hit = memory.get(key) ?? (await readDisk(key));
  if (hit && Date.now() - hit.at < TTL_MS) {
    memory.set(key, hit);
    return { body: hit.body, source: "cache" };
  }

  // Collapse identical concurrent requests into one upstream call.
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      await takeSlot();
      const res = await fetch(href, {
        headers: { Accept: "application/json", ...extraHeaders(), "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new UpstreamUnavailable(`upstream ${res.status}`);
      const body: unknown = await res.json();
      const entry = { at: Date.now(), body };
      memory.set(key, entry);
      void writeDisk(key, entry);
      return body;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return { body: await p, source: "live" };
}
