import { RotateCcw } from "lucide-react";
import type { CinemetaMovie } from "../../lib/cinemeta";

export type CinemetaStatus = "idle" | "loading" | "ready" | "not-found" | "error";

type MovieMetadataProps = {
  status: CinemetaStatus;
  metadata: CinemetaMovie | null;
  onRetry: () => void;
};

function formatReleaseDate(value?: string): string | null {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return <div className="rr-cinemeta-field">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>;
}

export function MovieMetadata({ status, metadata, onRetry }: MovieMetadataProps) {
  return <section className="rr-cinemeta-panel" aria-label="Cinemeta movie information" aria-live="polite">
    <div className="rr-cinemeta-heading">
      <div>
        <span className="rr-eyebrow">CINEMETA FILM DATA</span>
        <h2>Cast, crew &amp; releases</h2>
      </div>
      {metadata?.imdbRating && <span className="rr-cinemeta-rating">IMDb {metadata.imdbRating}</span>}
    </div>

    {(status === "idle" || status === "loading") && (
      <p className="rr-cinemeta-message">Loading film brief and credits…</p>
    )}
    {status === "not-found" && (
      <p className="rr-cinemeta-message">No matching Cinemeta record was found for this title.</p>
    )}
    {status === "error" && (
      <div className="rr-cinemeta-message">
        <p>Cinemeta details could not be loaded right now.</p>
        <button className="rr-text-link" type="button" onClick={onRetry}>Try again <RotateCcw size={12}/></button>
      </div>
    )}
    {status === "ready" && metadata && <>
      <div className="rr-cinemeta-fields">
        <MetadataField
          label="Theatrical release"
          value={formatReleaseDate(metadata.released) ?? metadata.year ?? "Not listed"}
        />
        {metadata.dvdRelease && <MetadataField label="DVD release" value={formatReleaseDate(metadata.dvdRelease) ?? metadata.dvdRelease}/>}
        {metadata.country && <MetadataField label="Country" value={metadata.country}/>}
        {metadata.runtime && <MetadataField label="Runtime" value={metadata.runtime}/>}
      </div>
      <div className="rr-cinemeta-credits">
        {metadata.cast.length > 0 && <div><span>Cast</span><p>{metadata.cast.join(" · ")}</p></div>}
        {metadata.writer.length > 0 && <div><span>Writers</span><p>{metadata.writer.join(" · ")}</p></div>}
        {!metadata.cast.length && !metadata.writer.length && (
          <p className="rr-cinemeta-message">Cast and crew are not listed for this film.</p>
        )}
      </div>
      {metadata.awards && <p className="rr-cinemeta-awards"><span>Awards</span>{metadata.awards}</p>}
      <p className="rr-cinemeta-source">Metadata provided by Cinemeta.</p>
    </>}
  </section>;
}
