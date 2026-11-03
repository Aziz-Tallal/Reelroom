import { useState } from "react";
import { ArrowRight, Clapperboard, Play } from "lucide-react";
import { LIBRARY_ENTRIES } from "./_shared";
import "../reelroom/_group.css";
import "../reelroom/Reelroom.css";

export function Current() {
  const [filter, setFilter] = useState<"All" | "Physical" | "Digital">("All");
  const physicalCount = LIBRARY_ENTRIES.filter(({ item }) => item.experience === "Physical").length;
  const digitalCount = LIBRARY_ENTRIES.filter(({ item }) => item.experience === "Digital").length;
  const visibleEntries = LIBRARY_ENTRIES.filter(({ item }) => filter === "All" || item.experience === filter);

  return (
    <div className="reelroom">
      <main className="rr-wrap rr-library-page">
        <div className="rr-page-head">
          <span className="rr-eyebrow">Your REELROOM shelf</span>
          <h1>My library.</h1>
          <p>A personal record of the films you’ve brought home, on disc or on your screen.</p>
        </div>
        <section className="rr-section compact">
          <div className="rr-library-overview">
            <div className="rr-library-overview-copy">
              <span className="rr-eyebrow">The home collection</span>
              <h2>05 <span>films on your shelf</span></h2>
              <p>Saved from your REELROOM orders · always ready for another look.</p>
            </div>
            <div className="rr-library-counts">
              <div><span>{physicalCount.toString().padStart(2, "0")}</span><small>Physical</small></div>
              <i />
              <div><span>{digitalCount.toString().padStart(2, "0")}</span><small>Digital</small></div>
            </div>
          </div>
          <div className="rr-library-toolbar">
            <div><span className="rr-eyebrow">Your films</span><h2>Collected &amp; kept.</h2></div>
            <div className="rr-library-filters" role="group" aria-label="Filter library by media type">
              {(["All", "Physical", "Digital"] as const).map((value) => (
                <button key={value} type="button" className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {value}<span>{value === "All" ? LIBRARY_ENTRIES.length : value === "Physical" ? physicalCount : digitalCount}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rr-library-grid">
            {visibleEntries.map(({ order, item, movie }) => (
              <button className="rr-library-card" type="button" key={item.key} aria-label={`View ${movie.title}, ${item.experience} ${item.option}`}>
                <span className="rr-library-poster">
                  <img src={movie.poster} alt={`${movie.title} poster`} loading="lazy" />
                  <span className={`rr-library-media ${item.experience.toLowerCase()}`}>
                    {item.experience === "Physical" ? <Clapperboard size={12} /> : <Play size={11} />}
                    {item.experience}
                  </span>
                  <span className="rr-library-poster-title">{movie.title}</span>
                </span>
                <span className="rr-library-card-copy">
                  <span className={`rr-library-state ${item.mode === "Rent" ? "rental" : "owned"}`}>{item.mode === "Rent" ? "On loan" : "In collection"}</span>
                  <strong>{movie.title}</strong>
                  <span className="rr-library-film-meta">{movie.year} <i /> {movie.genre}</span>
                  <span className="rr-library-format">
                    <span>{item.experience === "Physical" ? item.option : "Digital"}</span>
                    <span>{item.experience === "Digital" ? item.option : item.mode === "Rent" ? "Rental" : order.fulfillment}</span>
                  </span>
                  <span className="rr-library-order-meta"><span>{item.mode === "Rent" ? item.rental : `Added ${order.date}`}</span></span>
                </span>
              </button>
            ))}
          </div>
          <div className="rr-library-foot"><span>YOUR REELROOM COLLECTION</span><button className="rr-text-link">Find another film <ArrowRight size={13} /></button></div>
        </section>
      </main>
    </div>
  );
}
