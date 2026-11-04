import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListTrailerReviewsQueryKey, reviewTrailerBatch, useListTrailerReviews,
  type TrailerReviewCatalog, type TrailerReviewItem,
} from "@workspace/api-client-react";
import { Play, X } from "lucide-react";
import "./TrailerScreening.css";

const CatalogContext = createContext<{
  catalog?: TrailerReviewCatalog; loading: boolean; error: string; refresh: () => void;
}>({ loading: true, error: "", refresh: () => undefined });

export function TrailerScreeningProvider({ children }: { children: ReactNode }) {
  const result = useListTrailerReviews({
    query: { queryKey: getListTrailerReviewsQueryKey(), staleTime: 60_000, refetchInterval: 120_000, retry: 1 },
  });
  return <CatalogContext.Provider value={{
    catalog: result.data, loading: result.isLoading,
    error: result.isError ? "Trailer reviews are unavailable. Unreviewed trailers remain hidden." : "",
    refresh: () => { void result.refetch(); },
  }}>{children}</CatalogContext.Provider>;
}

const titleKey = (title: string) => title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function useScreenedTrailer(title: string, year: number) {
  const { catalog, error } = useContext(CatalogContext);
  if (error) return undefined;
  return catalog?.items.find((item) => item.status === "no_flags" && item.year === year && titleKey(item.title) === titleKey(title));
}

export function ScreenedTrailerPlayer({ item, youtubeId, autoPlay = false }: {
  item: TrailerReviewItem; youtubeId?: string; autoPlay?: boolean;
}) {
  const id = youtubeId ?? item.youtubeIds[0];
  if (item.status !== "no_flags" || !id || !item.youtubeIds.includes(id) || !/^[\w-]{11}$/.test(id)) return null;
  return <iframe className="rr-screened-player"
    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoPlay ? 1 : 0}&mute=1&rel=0&playsinline=1`}
    title={`${item.title} trailer — synopsis screened, video not verified`}
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />;
}

const labels: Record<TrailerReviewItem["status"], string> = {
  no_flags: "No textual flags found", flagged: "Flagged · hidden",
  unknown: "Uncertain · hidden", pending: "Pending · hidden",
};

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data as { error?: unknown } | undefined;
    if (typeof data?.error === "string") return data.error;
  }
  return "The text review could not finish. Saved results are retained; try resuming later.";
}

export function TrailerScreeningPanel() {
  const { catalog, loading, error, refresh } = useContext(CatalogContext);
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState("");
  const [selected, setSelected] = useState<TrailerReviewItem | null>(null);
  const [videoId, setVideoId] = useState("");
  const stopRef = useRef(false);
  const mountedRef = useRef(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; stopRef.current = true; }; }, []);
  useEffect(() => {
    if (!selected) return;
    const current = catalog?.items.find((item) => item.id === selected.id);
    if (error || current?.status !== "no_flags") { setSelected(null); return; }
    if (current !== selected) setSelected(current);
    setVideoId((id) => current.youtubeIds.includes(id) ? id : current.youtubeIds[0]);
  }, [catalog, error, selected?.id]);
  useEffect(() => {
    if (!selected) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "Tab") {
        const elements = closeRef.current?.closest("[role=dialog]")?.querySelectorAll<HTMLElement>("button, select, iframe");
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      triggerRef.current?.focus();
    };
  }, [selected]);

  async function runReviews() {
    if (running || !catalog) return;
    setFailure(""); setRunning(true); stopRef.current = false;
    let current = catalog;
    try {
      while (current.pendingCount > 0 && !stopRef.current) {
        current = await reviewTrailerBatch();
        queryClient.setQueryData(getListTrailerReviewsQueryKey(), current);
        if (current.pendingCount && !stopRef.current) await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (cause) { if (mountedRef.current) setFailure(errorMessage(cause)); }
    finally { if (mountedRef.current) setRunning(false); }
  }
  const items = catalog?.items ?? [];
  const reviewed = items.filter((item) => item.reviewedAt !== null).length;
  const available = items.filter((item) => item.status === "no_flags").length;
  const hidden = items.filter((item) => item.status === "flagged" || item.status === "unknown").length;

  return <section className="rr-section rr-text-screening" aria-labelledby="trailer-review-heading">
    <span className="rr-eyebrow">Trailer text screening</span>
    <h2 id="trailer-review-heading">Check the context before playing.</h2>
    <p>Cinemeta supplies movie synopses, not trailer descriptions. We check that text for references to nudity and sexual activity using the free NVIDIA Nemotron 3.5 Lightning model.</p>
    <p className="rr-screening-warning"><strong>Text-only screening—not a video safety check.</strong> A result of “No textual flags found” does not guarantee the trailer has no nudity or sexual scenes. Every trailer linked to a movie shares its synopsis result. Missing, uncertain, flagged, and unreviewed entries stay hidden.</p>
    {loading && <p role="status">Loading Cinemeta and saved reviews…</p>}
    {(error || failure) && <p role="alert" className="rr-screening-error">{failure || error}</p>}
    {error && <button className="rr-button secondary" onClick={refresh}>Reload reviews</button>}
    {catalog && <>
      <div className="rr-screening-stats" aria-live="polite">
        <span><strong>{items.length}</strong> movies · {catalog.trailerCount} linked trailers</span>
        <span><strong>{available}</strong> no textual flags</span>
        <span><strong>{hidden}</strong> hidden after screening</span>
        <span><strong>{catalog.pendingCount}</strong> pending</span>
      </div>
      <progress max={Math.max(items.length, 1)} value={items.length - catalog.pendingCount} aria-label="Synopsis review progress" />
      <div className="rr-screening-actions">
        <button className="rr-button" disabled={running || catalog.pendingCount === 0 || Boolean(error)}
          onClick={() => { void runReviews(); }} data-testid="screen-trailer-text">
          {running ? "Screening synopsis text…" : catalog.pendingCount === 0 ? "Text screening complete" : reviewed ? "Resume text screening" : "Screen all synopsis text"}
        </button>
        {running && <button className="rr-button secondary" onClick={() => { stopRef.current = true; }}>Pause after this batch</button>}
        <small>Ten movie synopses per request. Reviews are saved across visits. Free-model availability and rate limits apply.</small>
      </div>
      <details className="rr-screening-results">
        <summary>View movies, decisions, and available trailers</summary>
        {items.map((item) => <article key={item.id}>
          <div><h3>{item.title} <small>{item.year || ""}</small></h3>
            <span className={`rr-screening-verdict is-${item.status}`}>{labels[item.status]}</span>
            <p>{item.reason}</p>
            <details><summary>Synopsis used for this decision</summary><p>{item.description || "No synopsis available."}</p></details>
          </div>
          {item.status === "no_flags" && !error && <button className="rr-button secondary" onClick={(event) => {
            triggerRef.current = event.currentTarget;
            setVideoId(item.youtubeIds[0]); setSelected(item);
          }}><Play size={13}/> Watch trailer{item.youtubeIds.length > 1 ? `s (${item.youtubeIds.length})` : ""}</button>}
        </article>)}
      </details>
    </>}
    {selected && <div className="rr-screening-backdrop" onClick={() => setSelected(null)}>
      <section className="rr-screening-dialog" role="dialog" aria-modal="true" aria-label={`${selected.title} trailer`} onClick={(event) => event.stopPropagation()}>
        <button className="rr-screening-close" ref={closeRef} onClick={() => setSelected(null)} aria-label="Close trailer"><X size={20}/></button>
        <h2>{selected.title}</h2>
        <p>No textual flags found in the movie synopsis. Video content has not been verified.</p>
        {selected.youtubeIds.length > 1 && <label>Trailer <select className="rr-select" value={videoId} onChange={(event) => setVideoId(event.target.value)}>
          {selected.youtubeIds.map((id, index) => <option value={id} key={id}>Trailer {index + 1}</option>)}
        </select></label>}
        <ScreenedTrailerPlayer item={selected} youtubeId={videoId} />
        <small>Plays through YouTube. Playback availability and external player content are controlled by YouTube.</small>
      </section>
    </div>}
  </section>;
}
