import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowDownRight, Clapperboard, Disc3, MonitorPlay, X } from "lucide-react";
import "./LibraryShelf.css";

export type LibraryEdition = {
  experience: "Physical" | "Digital";
  mode: "Buy" | "Rent";
  option: string;
  quantity: number;
  rental: string;
};

export type LibraryShelfFilm = {
  movie: {
    id: string;
    title: string;
    year: number;
    genre: string;
    director: string;
    synopsis: string;
    palette: [string, string];
    posterPath?: string;
    posterExt?: string;
  };
  editions: LibraryEdition[];
};

type Filter = "All" | "Physical" | "Digital";
type SortOrder = "title" | "year" | "color";

type LibraryShelfProps = {
  films: LibraryShelfFilm[];
  onBrowse: () => void;
};

function titleOrder(a: LibraryShelfFilm, b: LibraryShelfFilm) {
  return a.movie.title.localeCompare(b.movie.title, undefined, { sensitivity: "base", numeric: true });
}

function colorKey(color: string) {
  const match = /^#([a-f\d]{3}|[a-f\d]{6})$/i.exec(color.trim());
  if (!match) return { valid: false, hue: 0, saturation: 0, lightness: 0 };

  const shortHex = match[1].length === 3;
  const hex = shortHex ? match[1].split("").map((digit) => digit + digit).join("") : match[1];
  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;

  if (delta > 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  return {
    valid: true,
    hue,
    saturation: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
    lightness,
  };
}

function colorOrder(a: LibraryShelfFilm, b: LibraryShelfFilm) {
  const colorA = colorKey(a.movie.palette[0]);
  const colorB = colorKey(b.movie.palette[0]);
  return Number(colorB.valid) - Number(colorA.valid)
    || colorA.hue - colorB.hue
    || colorA.saturation - colorB.saturation
    || colorA.lightness - colorB.lightness
    || titleOrder(a, b);
}

export function LibraryShelf({ films, onBrowse }: LibraryShelfProps) {
  const [filter, setFilter] = useState<Filter>("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("title");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shelfCapacity, setShelfCapacity] = useState(14);
  const caseRefs = useRef(new Map<string, HTMLButtonElement>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const filmsWithFormats = useMemo(() => films.map((film) => ({
    ...film,
    hasPhysical: film.editions.some((edition) => edition.experience === "Physical"),
    hasDigital: film.editions.some((edition) => edition.experience === "Digital"),
  })), [films]);

  const counts: Record<Filter, number> = {
    All: filmsWithFormats.length,
    Physical: filmsWithFormats.filter((film) => film.hasPhysical).length,
    Digital: filmsWithFormats.filter((film) => film.hasDigital).length,
  };

  const sortedFilms = useMemo(() => {
    const orderedFilms = [...filmsWithFormats];
    if (sortOrder === "year") {
      return orderedFilms.sort((a, b) => a.movie.year - b.movie.year || titleOrder(a, b));
    }
    if (sortOrder === "color") return orderedFilms.sort(colorOrder);
    return orderedFilms.sort(titleOrder);
  }, [filmsWithFormats, sortOrder]);

  const visibleFilms = sortedFilms.filter((film) => (
    filter === "All" ||
    (filter === "Physical" ? film.hasPhysical : film.hasDigital)
  ));
  const selected = filmsWithFormats.find((film) => film.movie.id === selectedId);
  const shelves = Array.from({ length: Math.ceil(visibleFilms.length / shelfCapacity) }, (_, index) => (
    visibleFilms.slice(index * shelfCapacity, (index + 1) * shelfCapacity)
  ));

  useEffect(() => {
    if (!selectedId) return;

    const previousOverflow = document.body.style.overflow;
    const siteShell = document.querySelector<HTMLElement>(".rr-site-shell");
    const previousInert = siteShell?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (siteShell) siteShell.inert = true;

    const focusFrame = window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const focusableItems = Array.from(focusable ?? []);
      if (focusableItems.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (siteShell) siteShell.inert = previousInert;
      window.requestAnimationFrame(() => caseRefs.current.get(selectedId)?.focus());
    };
  }, [selectedId]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || visibleFilms.length === 0) return;

    const updateCapacity = () => {
      const cases = stage.querySelector<HTMLElement>(".rr-dvd-cases");
      const firstCase = cases?.querySelector<HTMLElement>(".rr-dvd-case");
      if (!cases || !firstCase) return;

      const caseStyles = window.getComputedStyle(firstCase);
      const rowStyles = window.getComputedStyle(cases);
      const caseWidth = Number.parseFloat(caseStyles.flexBasis);
      const gap = Number.parseFloat(rowStyles.columnGap) || 0;
      const padding = (Number.parseFloat(rowStyles.paddingLeft) || 0)
        + (Number.parseFloat(rowStyles.paddingRight) || 0);
      const availableWidth = cases.clientWidth - padding;
      if (!Number.isFinite(caseWidth) || caseWidth <= 0) return;

      const nextCapacity = Math.max(1, Math.floor((availableWidth + gap) / (caseWidth + gap)));
      setShelfCapacity((current) => current === nextCapacity ? current : nextCapacity);
    };

    updateCapacity();
    const observer = new ResizeObserver(updateCapacity);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [filter, visibleFilms.length]);

  const chooseFilter = (value: Filter) => {
    setFilter(value);
    setSelectedId(null);
  };

  return (
    <div className="rr-dvd">
      <main className="rr-wrap rr-library-page rr-dvd-page">
        <header className="rr-page-head rr-dvd-head">
          <div>
            <span className="rr-eyebrow">REELROOM · Personal archive</span>
            <h1>Films worth keeping.</h1>
            <p>A record of what you own, where you keep it, and the stories you return to.</p>
          </div>
          <div className="rr-dvd-head-mark" aria-hidden="true"><span>RR</span><i /></div>
        </header>

        <section className="rr-dvd-collection" aria-label="Your film collection">
          <div className="rr-dvd-summary">
            <div className="rr-dvd-summary-title">
              <span className="rr-eyebrow">The home collection</span>
              <h2><strong>{String(counts.All).padStart(2, "0")}</strong><span>unique films in the archive</span></h2>
              <p>One spine for every film. Every edition kept together.</p>
            </div>
            <div className="rr-dvd-counts" aria-label="Unique films by media type">
              <div><span>{String(counts.Physical).padStart(2, "0")}</span><small>On the shelf</small></div>
              <i />
              <div><span>{String(counts.Digital).padStart(2, "0")}</span><small>On screen</small></div>
            </div>
          </div>

          <div className="rr-dvd-toolbar">
            <div><span className="rr-eyebrow">Browse the shelf</span><h2>Collected &amp; kept.</h2></div>
            <div className="rr-dvd-controls">
              <div className="rr-library-filters rr-dvd-filters" role="group" aria-label="Filter unique films by media type">
                {(["All", "Physical", "Digital"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-testid={`button-library-filter-${value.toLowerCase()}`}
                    className={filter === value ? "active" : ""}
                    aria-pressed={filter === value}
                    onClick={() => chooseFilter(value)}
                  >
                    {value}<span>{String(counts[value]).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
              <label className="rr-dvd-sort">
                <span>Sort by</span>
                <select
                  data-testid="select-library-sort"
                  aria-label="Sort films"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)}
                >
                  <option value="title">Title A–Z</option>
                  <option value="year">Year: oldest first</option>
                  <option value="color">Color spectrum</option>
                </select>
              </label>
            </div>
          </div>

          {films.length === 0 ? (
            <div className="rr-dvd-empty">
              <Clapperboard size={24} />
              <span className="rr-eyebrow">A shelf of your own</span>
              <h3>Your collection is waiting for its first film.</h3>
              <p>Add a movie to see its case and editions here.</p>
              <button className="rr-button" type="button" onClick={onBrowse}>Browse movies</button>
            </div>
          ) : (
            <>
              <div className="rr-dvd-stage" ref={stageRef}>
                {visibleFilms.length > 0 ? (
                  <div className="rr-dvd-shelves" aria-label={`${visibleFilms.length} unique films`}>
                    {shelves.map((shelf, shelfIndex) => (
                      <div className="rr-dvd-shelf" key={`shelf-${shelfIndex}`}>
                        <div className="rr-dvd-cases" role="group" aria-label={`Films on shelf ${shelfIndex + 1}`}>
                          {shelf.map(({ movie, editions, hasPhysical, hasDigital }, index) => {
                            const active = selectedId === movie.id;
                            return (
                              <button
                                className={`rr-dvd-case${active ? " is-selected" : ""}`}
                                type="button"
                                data-testid={`button-library-film-${movie.id}`}
                                key={movie.id}
                                ref={(element) => {
                                  if (element) caseRefs.current.set(movie.id, element);
                                  else caseRefs.current.delete(movie.id);
                                }}
                                aria-label={`${active ? "Close" : "Open"} ${movie.title} case; ${editions.length} media type${editions.length === 1 ? "" : "s"}`}
                                aria-haspopup="dialog"
                                aria-expanded={active}
                                aria-controls={active ? "rr-dvd-film-dialog" : undefined}
                                onClick={() => setSelectedId(active ? null : movie.id)}
                                style={{ "--case-a": movie.palette[0], "--case-b": movie.palette[1], "--case-index": index } as CSSProperties}
                              >
                                <span className="rr-dvd-spine-cap" />
                                <span className="rr-dvd-spine-title">{movie.title}</span>
                                <span className="rr-dvd-spine-year">{movie.year}</span>
                                <span className="rr-dvd-spine-status" aria-hidden="true">
                                  {editions.some((edition) => edition.mode === "Buy") && <i className="owned-dot" />}
                                  {editions.some((edition) => edition.mode === "Rent") && <i className="rental-dot" />}
                                </span>
                                <span className="rr-dvd-spine-format" aria-hidden="true">{hasPhysical && hasDigital ? "MULTI" : hasPhysical ? "DISC" : "DIGITAL"}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="rr-dvd-ledge">
                          <span>REELROOM ARCHIVE</span>
                          <span>{String(shelf.length).padStart(2, "0")} TITLES</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rr-dvd-empty rr-dvd-filter-empty">
                    <Clapperboard size={22} />
                    <h3>No films on this shelf yet.</h3>
                    <p>Switch to another format to browse the collection.</p>
                    <button type="button" onClick={() => chooseFilter("All")}>Show the full archive</button>
                  </div>
                )}
                <p className="rr-dvd-hint"><ArrowDownRight size={14} /> Select a case to see its poster and editions</p>
              </div>
            </>
          )}

          <footer className="rr-dvd-foot">
            <span>EVERY EDITION HAS A PLACE.</span>
            <button className="rr-text-link" type="button" onClick={onBrowse}>Find another film</button>
          </footer>
        </section>
      </main>
      {selected && createPortal(
        <div
          className="rr-dvd-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <div
            id="rr-dvd-film-dialog"
            className="rr-dvd-modal"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rr-dvd-dialog-title"
            aria-describedby="rr-dvd-dialog-description"
            data-testid="dialog-library-film"
            tabIndex={-1}
          >
            <button
              className="rr-dvd-close"
              type="button"
              ref={dialogCloseRef}
              onClick={() => setSelectedId(null)}
              aria-label="Close film details"
              data-testid="button-close-library-film"
            >
              <X size={17} />
            </button>
            <section className="rr-dvd-reveal is-open">
              <div className="rr-dvd-reveal-poster">
                <img
                  src={selected.movie.posterPath ?? `/__mockup/images/reelroom-${selected.movie.id}.${selected.movie.posterExt ?? "jpg"}`}
                  alt={`${selected.movie.title} poster`}
                />
                <span>REELROOM ARCHIVE</span>
              </div>
              <div className="rr-dvd-reveal-copy">
                <span className="rr-eyebrow">Selected from your shelf</span>
                <h2 id="rr-dvd-dialog-title">{selected.movie.title}</h2>
                <div className="rr-dvd-meta">
                  <span>{selected.movie.year}</span><i /><span>{selected.movie.genre}</span><i /><span>Dir. {selected.movie.director}</span>
                </div>
                <p className="rr-dvd-synopsis" id="rr-dvd-dialog-description">{selected.movie.synopsis}</p>
                <div className="rr-dvd-editions">
                  <div className="rr-dvd-editions-head">
                    <span>Media in your collection</span>
                    <small>{selected.editions.length} unique edition{selected.editions.length === 1 ? "" : "s"}</small>
                  </div>
                  {selected.editions.map((edition, index) => (
                    <article className={`rr-dvd-edition ${edition.mode === "Rent" ? "rental" : "owned"}`} key={`${edition.experience}-${edition.mode}-${edition.option}-${index}`}>
                      <span className="rr-dvd-edition-icon">{edition.experience === "Physical" ? <Disc3 size={16} /> : <MonitorPlay size={16} />}</span>
                      <span className="rr-dvd-edition-main">
                        <strong>{edition.option}</strong>
                        <small>{edition.experience === "Physical" ? "Physical format" : "Digital platform"}</small>
                      </span>
                      <span className={`rr-dvd-ownership ${edition.mode === "Rent" ? "rental" : "owned"}`}>{edition.mode === "Rent" ? "Rented" : "Owned"}</span>
                      {edition.mode === "Rent" && edition.rental && <span className="rr-dvd-edition-date">{edition.rental}</span>}
                      {edition.quantity > 1 && <span className="rr-dvd-copy-count">{edition.quantity} copies</span>}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
