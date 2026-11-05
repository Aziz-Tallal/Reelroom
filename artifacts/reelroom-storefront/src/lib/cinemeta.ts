const CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io";
const TOP_MOVIES_URL = `${CINEMETA_BASE_URL}/catalog/movie/top.json`;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

type CinemetaCatalogItem = {
  id?: string;
  imdb_id?: string;
  name: string;
  year?: string;
  releaseInfo?: string;
};

type CatalogPayload = { metas?: unknown };
type MetadataPayload = { meta?: unknown };

export type CinemetaMovie = {
  id: string;
  name: string;
  year?: string;
  runtime?: string;
  description?: string;
  cast: string[];
  director: string[];
  writer: string[];
  genres: string[];
  country?: string;
  imdbRating?: string;
  released?: string;
  dvdRelease?: string;
  awards?: string;
};

let topCatalogCache: { fetchedAt: number; items: CinemetaCatalogItem[] } | null = null;
let topCatalogRequest: Promise<CinemetaCatalogItem[]> | null = null;
const searchCache = new Map<string, CinemetaCatalogItem[]>();
const metadataCache = new Map<string, CinemetaMovie>();

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Cinemeta request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function catalogItems(payload: CatalogPayload): CinemetaCatalogItem[] {
  if (!Array.isArray(payload.metas)) return [];
  return payload.metas.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = asString(record.name);
    if (!name) return [];
    return [{
      id: asString(record.id),
      imdb_id: asString(record.imdb_id),
      name,
      year: asString(record.year),
      releaseInfo: asString(record.releaseInfo),
    }];
  });
}

async function getTopCatalog(): Promise<CinemetaCatalogItem[]> {
  if (topCatalogCache && Date.now() - topCatalogCache.fetchedAt < CACHE_TTL_MS) {
    return topCatalogCache.items;
  }
  if (!topCatalogRequest) {
    topCatalogRequest = requestJson<CatalogPayload>(TOP_MOVIES_URL)
      .then(catalogItems)
      .then((items) => {
        topCatalogCache = { fetchedAt: Date.now(), items };
        topCatalogRequest = null;
        return items;
      })
      .catch((error: unknown) => {
        topCatalogRequest = null;
        throw error;
      });
  }
  return topCatalogRequest;
}

function normalizeTitle(value: string): string {
  return value
    .replace(/\s*\((?:19|20)\d{2}\)\s*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function releaseYear(item: CinemetaCatalogItem): number | null {
  const value = item.year ?? item.releaseInfo;
  const year = value?.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return year ? Number(year) : null;
}

function findTitleMatch(
  items: CinemetaCatalogItem[],
  title: string,
  year: number,
): CinemetaCatalogItem | null {
  const normalizedTitle = normalizeTitle(title);
  const matches = items.filter((item) => normalizeTitle(item.name) === normalizedTitle);
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const yearA = releaseYear(a);
    const yearB = releaseYear(b);
    return Math.abs((yearA ?? year) - year) - Math.abs((yearB ?? year) - year);
  })[0] ?? null;
}

async function searchCatalog(title: string): Promise<CinemetaCatalogItem[]> {
  const query = title.replace(/\s*\((?:19|20)\d{2}\)\s*$/, "").trim();
  const key = normalizeTitle(query);
  const cached = searchCache.get(key);
  if (cached) return cached;
  const url = `${CINEMETA_BASE_URL}/catalog/movie/top/search=${encodeURIComponent(query)}.json`;
  const items = catalogItems(await requestJson<CatalogPayload>(url));
  searchCache.set(key, items);
  return items;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(asString)
    .filter((item): item is string => Boolean(item));
}

function toCinemetaMovie(value: unknown, fallbackId: string): CinemetaMovie {
  if (!value || typeof value !== "object") {
    throw new Error("Cinemeta returned an invalid movie record");
  }
  const record = value as Record<string, unknown>;
  const genres = stringArray(record.genres);
  return {
    id: asString(record.imdb_id) ?? asString(record.id) ?? fallbackId,
    name: asString(record.name) ?? "Untitled film",
    year: asString(record.year) ?? asString(record.releaseInfo)?.match(/\b(?:19|20)\d{2}\b/)?.[0],
    runtime: asString(record.runtime),
    description: asString(record.description),
    cast: stringArray(record.cast),
    director: stringArray(record.director),
    writer: stringArray(record.writer),
    genres: genres.length ? genres : stringArray(record.genre),
    country: asString(record.country),
    imdbRating: asString(record.imdbRating),
    released: asString(record.released),
    dvdRelease: asString(record.dvdRelease),
    awards: asString(record.awards),
  };
}

export async function fetchCinemetaMovie(
  title: string,
  year: number,
): Promise<CinemetaMovie | null> {
  let match: CinemetaCatalogItem | null = null;
  try {
    match = findTitleMatch(await getTopCatalog(), title, year);
  } catch {
    // Search can still resolve the title if the top catalog is unavailable.
  }
  if (!match) match = findTitleMatch(await searchCatalog(title), title, year);
  if (!match) return null;

  const id = match.imdb_id ?? match.id;
  if (!id) return null;
  const cached = metadataCache.get(id);
  if (cached) return cached;

  const url = `${CINEMETA_BASE_URL}/meta/movie/${encodeURIComponent(id)}.json`;
  const payload = await requestJson<MetadataPayload>(url);
  const movie = toCinemetaMovie(payload.meta, id);
  metadataCache.set(id, movie);
  return movie;
}
