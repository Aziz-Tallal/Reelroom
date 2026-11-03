import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowLeft, Clapperboard, Disc3, MonitorPlay, X } from "lucide-react";
import { LIBRARY_ENTRIES, LibraryEntry } from "./_shared";
import "../reelroom/_group.css";
import "../reelroom/Reelroom.css";

type Filter = "All" | "Physical" | "Digital";

export function DvdShelf() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const films = useMemo(() => {
    const grouped = new Map<string, { movie: LibraryEntry["movie"]; editions: LibraryEntry[] }>();
    LIBRARY_ENTRIES.forEach((entry) => {
      const current = grouped.get(entry.movie.id);
      if (current) current.editions.push(entry);
      else grouped.set(entry.movie.id, { movie: entry.movie, editions: [entry] });
    });
    return Array.from(grouped.values()).map((film) => ({
      ...film,
      hasPhysical: film.editions.some(({ item }) => item.experience === "Physical"),
      hasDigital: film.editions.some(({ item }) => item.experience === "Digital"),
    }));
  }, []);

  const counts: Record<Filter, number> = {
    All: films.length,
    Physical: films.filter((film) => film.hasPhysical).length,
    Digital: films.filter((film) => film.hasDigital).length,
  };
  const visibleFilms = films.filter((film) => filter === "All" || (filter === "Physical" ? film.hasPhysical : film.hasDigital));
  const selected = films.find((film) => film.movie.id === selectedId);

  const chooseFilter = (value: Filter) => {
    setFilter(value);
    setSelectedId(null);
  };

  return (
    <div className="reelroom rr-dvd">
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
              <h2><strong>{String(films.length).padStart(2, "0")}</strong><span>films in the archive</span></h2>
              <p>One spine for every film. Every edition kept together.</p>
            </div>
            <div className="rr-dvd-counts" aria-label="Unique films by format">
              <div><span>{String(counts.Physical).padStart(2, "0")}</span><small>On the shelf</small></div>
              <i />
              <div><span>{String(counts.Digital).padStart(2, "0")}</span><small>On screen</small></div>
            </div>
          </div>

          <div className="rr-dvd-toolbar">
            <div><span className="rr-eyebrow">Browse the shelf</span><h2>Collected &amp; kept.</h2></div>
            <div className="rr-library-filters rr-dvd-filters" role="group" aria-label="Filter unique films by media type">
              {(["All", "Physical", "Digital"] as const).map((value) => (
                <button key={value} type="button" className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => chooseFilter(value)}>
                  {value}<span>{String(counts[value]).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rr-dvd-stage">
            {visibleFilms.length ? (
              <div className="rr-dvd-shelf" aria-label={`${visibleFilms.length} unique films`}>
                <div className="rr-dvd-cases">
                  {visibleFilms.map(({ movie, editions }, index) => {
                    const active = selectedId === movie.id;
                    const owned = editions.some(({ item }) => item.mode === "Buy");
                    const rented = editions.some(({ item }) => item.mode === "Rent");
                    return (
                      <button
                        className={`rr-dvd-case${active ? " is-selected" : ""}`}
                        type="button"
                        key={movie.id}
                        aria-label={`${active ? "Close" : "Open"} ${movie.title} case; ${editions.length} edition${editions.length === 1 ? "" : "s"}`}
                        aria-expanded={active}
                        aria-controls="rr-dvd-reveal"
                        onClick={() => setSelectedId(active ? null : movie.id)}
                        style={{ "--case-a": movie.palette[0], "--case-b": movie.palette[1], "--case-index": index } as CSSProperties}
                      >
                        <span className="rr-dvd-spine-cap" />
                        <span className="rr-dvd-spine-title">{movie.title}</span>
                        <span className="rr-dvd-spine-year">{movie.year}</span>
                        <span className="rr-dvd-spine-status">
                          {owned && <i className="owned-dot" title="Owned edition" />}
                          {rented && <i className="rental-dot" title="Rental edition" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="rr-dvd-ledge">
                  <span>REELROOM ARCHIVE</span><span>{String(visibleFilms.length).padStart(2, "0")} TITLES</span>
                </div>
              </div>
            ) : (
              <div className="rr-dvd-empty"><Clapperboard size={22} /><h3>No films on this shelf yet.</h3><p>Switch to another format to browse the collection.</p><button type="button" onClick={() => chooseFilter("All")}>Show the full archive</button></div>
            )}
            <p className="rr-dvd-hint"><ArrowDownRight size={14} /> Select a case to see its poster and editions</p>
          </div>

          <section id="rr-dvd-reveal" className={`rr-dvd-reveal${selected ? " is-open" : ""}`} aria-live="polite" aria-label="Selected film details" aria-hidden={!selected}>
            {selected && (
              <>
                <button className="rr-dvd-close" type="button" onClick={() => setSelectedId(null)} aria-label="Close film details"><X size={17} /></button>
                <div className="rr-dvd-reveal-poster">
                  <img src={selected.movie.poster} alt={`${selected.movie.title} poster`} />
                  <span>REELROOM ARCHIVE</span>
                </div>
                <div className="rr-dvd-reveal-copy">
                  <span className="rr-eyebrow">Selected from your shelf</span>
                  <h2>{selected.movie.title}</h2>
                  <div className="rr-dvd-meta"><span>{selected.movie.year}</span><i /> <span>{selected.movie.genre}</span><i /> <span>Dir. {selected.movie.director}</span></div>
                  <p className="rr-dvd-synopsis">{selected.movie.synopsis}</p>
                  <div className="rr-dvd-editions">
                    <div className="rr-dvd-editions-head"><span>In your collection</span><small>{selected.editions.length} edition{selected.editions.length === 1 ? "" : "s"}</small></div>
                    {selected.editions.map(({ item, order }) => (
                      <article className={`rr-dvd-edition ${item.mode === "Rent" ? "rental" : "owned"}`} key={item.key}>
                        <span className="rr-dvd-edition-icon">{item.experience === "Physical" ? <Disc3 size={16} /> : <MonitorPlay size={16} />}</span>
                        <span className="rr-dvd-edition-main"><strong>{item.option}</strong><small>{item.experience} · {item.experience === "Physical" ? order.fulfillment : item.option}</small></span>
                        <span className={`rr-dvd-ownership ${item.mode === "Rent" ? "rental" : "owned"}`}>{item.mode === "Rent" ? "Rented" : "Owned"}</span>
                        <span className="rr-dvd-edition-date">{item.mode === "Rent" ? item.rental : `Added ${order.date}`}</span>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!selected && <span className="rr-dvd-reveal-placeholder"><ArrowLeft size={15} /> Your selected film will open here</span>}
          </section>

          <footer className="rr-dvd-foot"><span>EVERY EDITION HAS A PLACE.</span><span>YOUR REELROOM COLLECTION</span></footer>
        </section>
      </main>
      <style>{`
        .rr-dvd { --dvd-ink:#e9e6dc; --dvd-muted:#9aa39d; --dvd-rule:rgba(227,231,219,.12); --dvd-brass:#c9a975; --dvd-green:#9ac4a4; min-height:100dvh; background:radial-gradient(ellipse at 52% 40%,rgba(44,65,55,.24),transparent 54%),#14191a; color:var(--dvd-ink); }
        .rr-dvd .rr-dvd-page { padding-bottom:44px; }
        .rr-dvd .rr-dvd-head { display:flex; align-items:center; justify-content:space-between; padding:48px 0 30px; }
        .rr-dvd .rr-page-head h1 { font-size:clamp(38px,5vw,64px); letter-spacing:-.055em; }
        .rr-dvd .rr-page-head p { font-size:12px; }
        .rr-dvd-head-mark { display:grid; place-items:center; position:relative; width:64px; height:64px; border:1px solid rgba(201,169,117,.42); color:var(--dvd-brass); font:600 17px "Space Grotesk",sans-serif; letter-spacing:.14em; transform:rotate(-8deg); }
        .rr-dvd-head-mark i { position:absolute; width:84px; height:1px; background:rgba(201,169,117,.28); transform:rotate(48deg); }
        .rr-dvd .rr-dvd-collection { padding-top:26px; }
        .rr-dvd-summary { display:flex; align-items:end; justify-content:space-between; gap:22px; padding:0 0 28px; border-bottom:1px solid var(--dvd-rule); }
        .rr-dvd-summary h2 { display:flex; gap:13px; align-items:baseline; margin:8px 0 4px!important; font:500 clamp(23px,3vw,34px)/1 "Space Grotesk",sans-serif; letter-spacing:-.04em; }
        .rr-dvd-summary h2 strong { color:var(--dvd-brass); font-size:1.25em; font-weight:500; }
        .rr-dvd-summary h2 span { color:#e2e2d8; }
        .rr-dvd-summary p { color:var(--dvd-muted); font-size:10px; }
        .rr-dvd-counts { display:flex; align-items:center; gap:21px; padding:0 3px 2px; }
        .rr-dvd-counts div { display:grid; gap:2px; }
        .rr-dvd-counts div span { font:500 21px "Space Grotesk",sans-serif; color:var(--dvd-ink); }
        .rr-dvd-counts small { color:var(--dvd-muted); font-size:9px; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
        .rr-dvd-counts i { width:1px; height:30px; background:var(--dvd-rule); }
        .rr-dvd .rr-dvd-toolbar { display:flex; justify-content:space-between; align-items:end; gap:20px; padding:26px 0 19px; }
        .rr-dvd-toolbar h2 { margin-top:7px!important; font:500 23px/1.1 "Space Grotesk",sans-serif; letter-spacing:-.04em; }
        .rr-dvd .rr-dvd-filters button { min-width:92px; padding:8px 11px; border-color:var(--dvd-rule); border-radius:4px; background:rgba(255,255,255,.018); color:#a9b1aa; font-size:9px; letter-spacing:.06em; text-transform:uppercase; }
        .rr-dvd .rr-dvd-filters button span { color:var(--dvd-brass); font:500 10px "Space Grotesk",sans-serif; }
        .rr-dvd .rr-dvd-filters button.active { border-color:rgba(201,169,117,.6); background:rgba(201,169,117,.09); color:#ead9ba; }
        .rr-dvd .rr-dvd-stage { padding:22px 0 0; }
        .rr-dvd-shelf { padding:0 0 0; perspective:900px; }
        .rr-dvd-cases { display:flex; align-items:stretch; justify-content:center; gap:8px; min-height:230px; padding:20px 18px 0; overflow-x:auto; overflow-y:visible; scrollbar-color:#75664f transparent; scrollbar-width:thin; }
        .rr-dvd-case { --case-a:#28312d; --case-b:#a0a76d; position:relative; isolation:isolate; display:flex; flex:0 0 72px; flex-direction:column; align-items:center; justify-content:space-between; min-height:208px; padding:12px 9px 10px; overflow:hidden; border:1px solid rgba(237,230,207,.3); border-bottom:0; border-radius:3px 3px 0 0!important; background:linear-gradient(90deg,rgba(0,0,0,.48),transparent 15%,rgba(255,255,255,.06) 51%,rgba(0,0,0,.28)),linear-gradient(155deg,var(--case-b),var(--case-a) 63%); color:#f3eee0; box-shadow:4px 0 7px rgba(0,0,0,.25),inset 1px 0 rgba(255,255,255,.15); cursor:pointer; transform-origin:center bottom; transition:transform .28s cubic-bezier(.2,.7,.2,1),box-shadow .28s,border-color .28s; animation:rr-dvd-arrive .48s both; animation-delay:calc(var(--case-index)*55ms); }
        .rr-dvd-case::before { position:absolute; inset:0 auto 0 5px; width:1px; background:rgba(255,255,255,.22); content:""; }
        .rr-dvd-case:hover,.rr-dvd-case:focus-visible { z-index:3; transform:translateY(-8px) scale(1.045); box-shadow:0 12px 20px rgba(0,0,0,.34),inset 1px 0 rgba(255,255,255,.2); border-color:rgba(235,221,184,.8); }
        .rr-dvd-case.is-selected { z-index:5; transform:translateY(-15px) translateX(12px) scale(1.075) rotateY(-5deg); box-shadow:12px 15px 28px rgba(0,0,0,.43); }
        .rr-dvd-spine-cap { height:4px; width:calc(100% + 18px); margin:-12px -9px 0; background:rgba(7,11,10,.48); border-bottom:1px solid rgba(255,255,255,.14); }
        .rr-dvd-spine-title { writing-mode:vertical-rl; transform:rotate(180deg); max-height:145px; overflow:hidden; color:#f4f0e5; font:600 11px/1.1 "Space Grotesk",sans-serif; letter-spacing:.055em; text-align:center; text-shadow:0 1px 4px rgba(0,0,0,.5); }
        .rr-dvd-spine-year { align-self:flex-start; color:rgba(246,239,219,.8); font:9px "Space Grotesk",sans-serif; letter-spacing:.12em; }
        .rr-dvd-spine-status { position:absolute; right:7px; bottom:11px; display:grid; gap:4px; }
        .rr-dvd-spine-status i { width:5px; height:5px; border-radius:50%; }
        .rr-dvd-spine-status .owned-dot { background:#b7d7a5; }
        .rr-dvd-spine-status .rental-dot { background:#e0a36e; }
        .rr-dvd-ledge { display:flex; justify-content:space-between; padding:10px 15px 9px; border:1px solid rgba(221,205,163,.28); border-top:4px solid #615643; background:linear-gradient(180deg,#39352d,#242522); color:#b7ac92; box-shadow:0 12px 20px rgba(0,0,0,.23); font:8px "Space Mono",monospace; letter-spacing:.15em; }
        .rr-dvd-hint { display:flex; align-items:center; justify-content:center; gap:7px; padding-top:13px; color:#8e9891; font-size:9px; letter-spacing:.04em; }
        .rr-dvd-hint svg { color:var(--dvd-brass); }
        .rr-dvd-reveal { position:relative; display:grid; grid-template-columns:180px minmax(0,1fr); gap:25px; min-height:180px; margin-top:24px; padding:22px; border:1px solid rgba(201,169,117,.25); background:linear-gradient(110deg,rgba(201,169,117,.065),transparent 45%),#1a2020; opacity:.58; transform:translateY(7px); transition:opacity .3s,transform .36s cubic-bezier(.2,.7,.2,1); }
        .rr-dvd-reveal.is-open { opacity:1; transform:translateY(0); animation:rr-dvd-reveal-in .42s cubic-bezier(.2,.72,.18,1) both; }
        .rr-dvd-reveal[aria-hidden="true"] { display:flex; align-items:center; justify-content:center; min-height:76px; padding:14px; }
        .rr-dvd-reveal-placeholder { display:flex; gap:8px; align-items:center; color:#87928c; font-size:10px; letter-spacing:.04em; }
        .rr-dvd-reveal-poster { position:relative; align-self:start; aspect-ratio:2/2.92; overflow:hidden; border:1px solid rgba(255,255,255,.18); background:#202929; box-shadow:0 13px 28px rgba(0,0,0,.3); }
        .rr-dvd-reveal-poster img { width:100%; height:100%; display:block; object-fit:cover; }
        .rr-dvd-reveal-poster span { position:absolute; right:7px; bottom:7px; left:7px; padding-top:17px; background:linear-gradient(0deg,rgba(6,10,10,.9),transparent); color:#e2dccb; font:7px "Space Mono",monospace; letter-spacing:.12em; }
        .rr-dvd-reveal-copy { min-width:0; padding:3px 18px 0 0; }
        .rr-dvd-reveal-copy h2 { margin:8px 0 8px!important; font:500 clamp(25px,3.2vw,38px)/1.03 "Space Grotesk",sans-serif; letter-spacing:-.045em; }
        .rr-dvd-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#aeb7af; font-size:9px; }
        .rr-dvd-meta i { width:3px; height:3px; border-radius:50%; background:var(--dvd-brass); }
        .rr-dvd-synopsis { max-width:640px; margin:13px 0 19px!important; color:#b7c0b9; font-size:10px; line-height:1.7; }
        .rr-dvd-editions { border-top:1px solid var(--dvd-rule); }
        .rr-dvd-editions-head { display:flex; justify-content:space-between; gap:10px; padding:11px 0 7px; color:#d8d7cd; font-size:9px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
        .rr-dvd-editions-head small { color:#8e9991; font-size:8px; font-weight:500; }
        .rr-dvd-edition { display:grid; grid-template-columns:27px minmax(110px,1fr) auto; gap:9px; align-items:center; padding:9px 0; border-top:1px solid rgba(227,231,219,.075); }
        .rr-dvd-edition-icon { display:grid; width:26px; height:26px; place-items:center; border:1px solid rgba(201,169,117,.24); color:var(--dvd-brass); }
        .rr-dvd-edition-main { display:grid; gap:2px; }
        .rr-dvd-edition-main strong { color:#e7e6dc; font-size:10px; font-weight:650; }
        .rr-dvd-edition-main small,.rr-dvd-edition-date { color:#8f9a93; font-size:8px; }
        .rr-dvd-ownership { padding:4px 7px; border:1px solid rgba(154,196,164,.25); color:#a9d0b0; font-size:8px; letter-spacing:.08em; text-transform:uppercase; }
        .rr-dvd-ownership.rental { border-color:rgba(224,163,110,.35); color:#e6b181; }
        .rr-dvd-edition-date { grid-column:2 / -1; padding-left:0; }
        .rr-dvd-close { position:absolute; z-index:2; top:10px; right:10px; display:grid; width:30px; height:30px; place-items:center; border:1px solid var(--dvd-rule); background:rgba(12,17,17,.72); color:#c9d1c8; cursor:pointer; }
        .rr-dvd-empty { display:grid; min-height:190px; place-content:center; justify-items:center; gap:8px; border:1px dashed var(--dvd-rule); color:#9da79f; text-align:center; }
        .rr-dvd-empty svg { color:var(--dvd-brass); }
        .rr-dvd-empty h3 { color:#e3e2d8; font:500 18px "Space Grotesk",sans-serif; }
        .rr-dvd-empty p { font-size:10px; }
        .rr-dvd-empty button { margin-top:5px; border:0; background:none; color:var(--dvd-brass); cursor:pointer; font-size:10px; text-decoration:underline; text-underline-offset:3px; }
        .rr-dvd-foot { display:flex; justify-content:space-between; gap:14px; margin-top:22px; padding-top:12px; border-top:1px solid var(--dvd-rule); color:#77827b; font:8px "Space Mono",monospace; letter-spacing:.14em; }
        @keyframes rr-dvd-arrive { from { opacity:0; } to { opacity:1; } }
        @keyframes rr-dvd-reveal-in { from { opacity:.45; transform:translateX(18px) translateY(5px); } to { opacity:1; transform:translateX(0) translateY(0); } }
        @media (max-width:720px) {
          .rr-dvd .rr-wrap { width:calc(100% - 36px); }
          .rr-dvd .rr-dvd-head { padding:34px 0 24px; }
          .rr-dvd-head-mark { width:48px; height:48px; flex:0 0 auto; font-size:13px; }
          .rr-dvd-summary { align-items:start; flex-direction:column; }
          .rr-dvd-counts { align-self:stretch; justify-content:flex-start; }
          .rr-dvd .rr-dvd-toolbar { align-items:start; flex-direction:column; }
          .rr-dvd .rr-dvd-filters { width:100%; }
          .rr-dvd .rr-dvd-filters button { flex:1; min-width:0; }
          .rr-dvd-cases { min-height:190px; gap:6px; padding:15px 12px 0; }
          .rr-dvd-case { flex-basis:60px; min-height:170px; }
          .rr-dvd-spine-title { font-size:9px; }
          .rr-dvd-reveal { grid-template-columns:92px minmax(0,1fr); gap:15px; padding:15px; }
          .rr-dvd-reveal-copy { padding-right:13px; }
          .rr-dvd-reveal-copy h2 { font-size:25px; }
          .rr-dvd-meta { gap:5px; font-size:8px; }
          .rr-dvd-synopsis { margin:10px 0 13px!important; }
          .rr-dvd-edition { grid-template-columns:24px 1fr auto; gap:7px; }
          .rr-dvd-edition-date { font-size:7px; }
          .rr-dvd-foot { font-size:7px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .rr-dvd *, .rr-dvd *::before, .rr-dvd *::after { scroll-behavior:auto!important; animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; }
        }
      `}</style>
    </div>
  );
}
