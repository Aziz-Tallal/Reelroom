import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = "artifacts/reelroom-storefront/src/components/reelroom/Reelroom.tsx";
const outputPath = "supabase/migrations/20261107170100_reelroom_catalog_seed.sql";
const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("type Movie = {");
const end = source.indexOf("const movieFor =", start);
if (start < 0 || end < 0) throw new Error("Could not find the existing catalog seed data.");

const extraction = source.slice(start, end)
  + "\nglobalThis.__reelroomSeed = { movies: MOVIES, academy: [...ACADEMY_AWARD_IDS], fourK: [...FOUR_K_DEMO_TITLES], recent: RECENT_MOVIES.map((movie) => movie.id), animated: ANIMATED_MOVIES.map((movie) => movie.id), criterion: CRITERION_SELECTION_MOVIES.map((movie) => movie.id), posterSources: POSTER_SOURCES, physicalPrices: PHYSICAL_PRICE, digitalRentPrices: PLATFORM_RENT_PRICE };";
const javascript = ts.transpile(extraction, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
const context = { createContext: () => ({}) };
vm.runInNewContext(javascript, context);
const data = context.__reelroomSeed;

const quote = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const textArray = (values) => values.length ? `ARRAY[${values.map(quote).join(", ")}]::text[]` : "'{}'::text[]";
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const validYear = (value) => Number.isInteger(value) && value >= 1888 && value <= 2100 ? value : null;
const validRuntime = (value) => Number.isInteger(value) && value > 0 && value <= 1000 ? value : null;
const sqlNumber = (value) => Number(value).toFixed(3);
const recent = new Set([...data.recent, "dune-part-two"]);
const academy = new Set(data.academy);
const fourK = new Set(data.fourK);
const animated = new Set(data.animated);
const criterion = new Set(data.criterion);
const products = [];
const variants = [];

for (const [index, movie] of data.movies.entries()) {
  const platforms = [...new Set(movie.platforms ?? [])];
  const genres = [...new Set(movie.genres?.length ? movie.genres : String(movie.genre ?? "Uncategorized").split(/[·,/]/).map((part) => part.trim()).filter(Boolean))];
  const collections = [];
  if (recent.has(movie.id)) collections.push("recent");
  if (criterion.has(movie.id)) collections.push("criterion_selection");
  if (platforms.length) collections.push("digital_only");
  else collections.push("physical_only");
  if (index < 100) collections.push("top_100");
  if (academy.has(movie.id)) collections.push("academy_award");
  if (animated.has(movie.id)) collections.push("animated");

  const posterPath = movie.posterPath ?? `/__mockup/images/reelroom-${movie.id}.${movie.posterExt ?? "jpg"}`;
  const posterSource = movie.sourcePage ?? data.posterSources[movie.id] ?? null;
  const palette = Array.isArray(movie.palette) && movie.palette.length >= 2 ? movie.palette.slice(0, 2) : ["#202629", "#8b9c91"];
  const runtime = validRuntime(movie.runtime);
  products.push(`(${[
    quote(movie.id),
    quote(movie.title),
    quote(movie.synopsis ?? ""),
    validYear(movie.year) ?? "NULL",
    quote(movie.genre ?? "Uncategorized"),
    textArray(genres),
    quote(movie.director ?? ""),
    runtime ?? "NULL",
    quote(posterPath),
    "NULL",
    posterSource ? quote(posterSource) : "NULL",
    textArray(palette),
    "true",
    platforms.length ? "true" : "false",
    recent.has(movie.id) ? "true" : "false",
    criterion.has(movie.id) ? "true" : "false",
    animated.has(movie.id) ? "true" : "false",
    textArray(collections),
    index,
  ].join(", ")})`);

  const formats = ["DVD", "Blu-ray", ...(fourK.has(movie.id) ? ["4K Ultra HD"] : [])];
  for (const format of formats) {
    for (const transactionType of ["buy", "rent"]) {
      const price = data.physicalPrices[transactionType === "buy" ? "Buy" : "Rent"][format];
      const id = `${movie.id}-physical-${transactionType}-${slug(format)}`;
      variants.push(`(${[
        quote(id), quote(movie.id), quote("physical"), quote(transactionType), quote(format), "NULL",
        sqlNumber(price), "true", "true", "NULL", transactionType === "rent" ? 7 : "NULL",
      ].join(", ")})`);
    }
  }

  for (const platform of platforms) {
    const rentPrice = data.digitalRentPrices[platform] ?? 2.5;
    for (const transactionType of ["buy", "rent"]) {
      const price = transactionType === "buy" ? rentPrice * 3.2 : rentPrice;
      const id = `${movie.id}-digital-${transactionType}-${slug(platform)}`;
      variants.push(`(${[
        quote(id), quote(movie.id), quote("digital"), quote(transactionType), "NULL", quote(platform),
        sqlNumber(price), "true", "true", "NULL", transactionType === "rent" ? 30 : "NULL",
      ].join(", ")})`);
    }
  }
}

const chunks = (items, size = 120) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
const statements = ["-- Seed the original REELROOM catalog. Prices and availability remain illustrative."];
for (const chunk of chunks(products)) {
  statements.push(
    "insert into public.products (id, title, description, release_year, genre, genres, director, runtime, poster_url, backdrop_url, source_page, palette, physical_available, digital_available, featured, is_criterion, is_animated, collections, display_order) values",
    `${chunk.join(",\n")}\non conflict (id) do update set title = excluded.title, description = excluded.description, release_year = excluded.release_year, genre = excluded.genre, genres = excluded.genres, director = excluded.director, runtime = excluded.runtime, poster_url = excluded.poster_url, backdrop_url = excluded.backdrop_url, source_page = excluded.source_page, palette = excluded.palette, physical_available = excluded.physical_available, digital_available = excluded.digital_available, featured = excluded.featured, is_criterion = excluded.is_criterion, is_animated = excluded.is_animated, collections = excluded.collections, display_order = excluded.display_order;`,
  );
}

for (const chunk of chunks(variants, 300)) {
  statements.push(
    "insert into public.product_variants (id, product_id, media_type, transaction_type, format, platform, price_kwd, price_is_demo, available, stock_quantity, rental_duration_days) values",
    `${chunk.join(",\n")}\non conflict (id) do update set product_id = excluded.product_id, media_type = excluded.media_type, transaction_type = excluded.transaction_type, format = excluded.format, platform = excluded.platform, price_kwd = excluded.price_kwd, price_is_demo = excluded.price_is_demo, available = excluded.available, stock_quantity = excluded.stock_quantity, rental_duration_days = excluded.rental_duration_days;`,
  );
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${statements.join("\n\n")}\n`);
console.log(JSON.stringify({ products: products.length, variants: variants.length, output: outputPath }));
