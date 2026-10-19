import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

// Server-side client for every upstream (Torob's public catalog, the flight
// source). Endpoints come from env only.
// Good-client rules: descriptive UA, 5-min cache (memory + disk), ≤1 req/s.

const TTL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 1000;
const TIMEOUT_MS = 10000;
const USER_AGENT =
  "TorobPLP-Prototype/0.1 (hiring-challenge demo; read-only; +https://github.com/truthofmatthew/torob-plp)";

// Vercel functions can only write to /tmp.
const CACHE_DIR = process.env.VERCEL ? "/tmp/.cache" : path.join(process.cwd(), ".cache");

export class UpstreamUnavailable extends Error {}

/** Thrown by a `cached()` loader to hand back a result that must not be cached. */
export class NotCacheable extends Error {
  constructor(public body: unknown) {
    super("not cacheable");
  }
}

export type EndpointName =
  | "TOROB_SEARCH_URL"
  | "TOROB_DETAILS_URL"
  | "TOROB_SIMILAR_URL"
  | "TOROB_PRICE_CHART_URL"
  | "TOROB_CATEGORY_URL"
  | "TOROB_OFFERS_URL"
  | "TOROB_TRENDS_URL"
  | "FLIGHTS_SEARCH_URL"
  | "FLIGHTS_CALENDAR_URL";

export function endpoint(name: EndpointName): URL {
  const v = process.env[name];
  if (!v) throw new UpstreamUnavailable(`${name} is not set`);
  return new URL(v);
}

type HeadersEnv = "TOROB_SEARCH_HEADERS" | "FLIGHTS_SEARCH_HEADERS";

function extraHeaders(name: HeadersEnv): Record<string, string> {
  const raw = process.env[name];
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

/** A JSON POST body, plus which env var holds extra headers for this upstream. */
export type RequestOptions = { body?: unknown; headersEnv?: HeadersEnv };

/**
 * One GET (or POST with a JSON body), retried once on a timeout, network error
 * or 5xx. Each attempt takes its own rate-limit slot. 4xx is final (bad id, gone).
 */
async function fetchWithRetry(href: string, opts: RequestOptions = {}): Promise<unknown> {
  const isPost = opts.body !== undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    await takeSlot();
    try {
      const res = await fetch(href, {
        method: isPost ? "POST" : "GET",
        body: isPost ? JSON.stringify(opts.body) : undefined,
        headers: {
          Accept: "application/json",
          ...(isPost ? { "Content-Type": "application/json" } : {}),
          ...extraHeaders(opts.headersEnv ?? "TOROB_SEARCH_HEADERS"),
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (res.status >= 400 && res.status < 500) throw new UpstreamUnavailable(`upstream ${res.status}`);
      if (!res.ok) {
        lastError = new UpstreamUnavailable(`upstream ${res.status}`);
        continue;
      }
      return (await res.json()) as unknown;
    } catch (e) {
      if (e instanceof UpstreamUnavailable) throw e;
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new UpstreamUnavailable("upstream failed");
}

/** GET JSON from Torob with cache + rate limit. Returns where it came from. */
export async function getJson(url: URL): Promise<{ body: unknown; source: "live" | "cache" }> {
  const href = url.toString();
  return cached(href, () => fetchWithRetry(href));
}

/** One uncached request through the same queue, timeout and retry (e.g. a POST that starts a search). */
export function requestJson(url: URL, opts: RequestOptions = {}): Promise<unknown> {
  return fetchWithRetry(url.toString(), opts);
}

/**
 * Cache + in-flight dedupe around any loader, keyed by `cacheKey`. A loader
 * can throw `NotCacheable` to return a value without storing it (partial results).
 */
export async function cached(
  cacheKey: string,
  load: () => Promise<unknown>,
): Promise<{ body: unknown; source: "live" | "cache" }> {
  const key = keyOf(cacheKey);

  const hit = memory.get(key) ?? (await readDisk(key));
  if (hit && Date.now() - hit.at < TTL_MS) {
    memory.set(key, hit);
    return { body: hit.body, source: "cache" };
  }

  // Collapse identical concurrent requests into one upstream call.
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      let body: unknown;
      try {
        body = await load();
      } catch (e) {
        if (e instanceof NotCacheable) return e.body;
        throw e;
      }
      const entry = { at: Date.now(), body };
      memory.set(key, entry);
      void writeDisk(key, entry);
      return body;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return { body: await p, source: "live" };
}
