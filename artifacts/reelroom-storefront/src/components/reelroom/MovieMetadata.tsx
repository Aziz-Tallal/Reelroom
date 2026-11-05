import { RotateCcw } from "lucide-react";
import {
  CINEMETA_ERROR_MESSAGES,
  CINEMETA_FIELD_MESSAGES,
  type CinemetaMovie,
} from "../../lib/cinemeta";

export type CinemetaStatus = "idle" | "loading" | "ready" | "not-found" | "error";

type MovieMetadataProps = {
  status: CinemetaStatus;
  metadata: CinemetaMovie | null;
  errorMessage?: string;
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

export function MovieMetadata({ status, metadata, errorMessage, onRetry }: MovieMetadataProps) {
  const hasIncompleteData = metadata && (
    !metadata.description
    || metadata.cast.length === 0
    || metadata.director.length === 0
    || !metadata.imdbRating
    || !metadata.runtime
    || !metadata.released
  );

  return <section className="rr-cinemeta-panel" aria-label="Cinemeta movie information" aria-live="polite">
    <div className="rr-cinemeta-heading">
      <div>
        <span className="rr-eyebrow">CINEMETA FILM DATA</span>
        <h2>Cast, crew &amp; releases</h2>
      </div>
      {status === "ready" && <span className="rr-cinemeta-rating">
        {metadata?.imdbRating ? `IMDb ${metadata.imdbRating}` : CINEMETA_FIELD_MESSAGES.rating}
      </span>}
    </div>

    {(status === "idle" || status === "loading") && (
      <p className="rr-cinemeta-message">Loading film brief and credits…</p>
    )}
    {status === "not-found" && (
      <p className="rr-cinemeta-message">{CINEMETA_ERROR_MESSAGES["not-found"]}</p>
    )}
    {status === "error" && (
      <div className="rr-cinemeta-message">
        <p>{errorMessage ?? CINEMETA_ERROR_MESSAGES.unexpected}</p>
        <button className="rr-text-link" type="button" onClick={onRetry}>Try again <RotateCcw size={12}/></button>
      </div>
    )}
    {status === "ready" && metadata && <>
      {hasIncompleteData && (
        <p className="rr-cinemeta-incomplete">{CINEMETA_ERROR_MESSAGES.incomplete}</p>
      )}
      <div className="rr-cinemeta-fields">
        <MetadataField
          label="Theatrical release"
          value={metadata.released
            ? formatReleaseDate(metadata.released) ?? metadata.released
            : CINEMETA_FIELD_MESSAGES.releaseDate}
        />
        {metadata.dvdRelease && <MetadataField label="DVD release" value={formatReleaseDate(metadata.dvdRelease) ?? metadata.dvdRelease}/>}
        {metadata.country && <MetadataField label="Country" value={metadata.country}/>}
        <MetadataField label="Runtime" value={metadata.runtime ?? CINEMETA_FIELD_MESSAGES.runtime}/>
      </div>
      <div className="rr-cinemeta-credits">
        <div>
          <span>Cast</span>
          <p>{metadata.cast.length > 0 ? metadata.cast.join(" · ") : CINEMETA_FIELD_MESSAGES.cast}</p>
        </div>
        {metadata.writer.length > 0 && <div><span>Writers</span><p>{metadata.writer.join(" · ")}</p></div>}
      </div>
      {metadata.awards && <p className="rr-cinemeta-awards"><span>Awards</span>{metadata.awards}</p>}
      <p className="rr-cinemeta-source">Metadata provided by Cinemeta.</p>
    </>}
  </section>;
}
