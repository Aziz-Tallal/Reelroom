import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookmarkPlus, Clock3, Film, GripVertical, RotateCw, Sparkles } from "lucide-react";
import { useCreateMovieNightPlan } from "@workspace/api-client-react";
import type { MovieNightCandidate, MovieNightPlanResponse, MovieNightRequest, MovieNightRequestMoodsItem, MovieNightRequestViewingExperience } from "@workspace/api-client-react";
import { fetchCinemetaMovie } from "../../lib/cinemeta";
import "./MovieNightPlanner.css";

type PlannerMovie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  genres?: string[];
  runtime: number;
  director: string;
  synopsis: string;
  posterExt?: string;
  posterPath?: string;
};

type FilmPlanItem = { movieId: string; reason: string };
type TimelineItem =
  | { kind: "film"; movie: PlannerMovie; runtime: number; reason: string; start: number; end: number; index: number }
  | { kind: "break"; minutes: number; start: number; end: number; index: number };
type PreferenceValues = {
  moods: MovieNightRequestMoodsItem[];
  duration: string;
  customDuration: number;
  genres: string[];
  directors: string;
  decades: number[];
  avoidIds: string[];
  maxMovies: number;
  experience: MovieNightRequestViewingExperience;
  notes: string;
  startTime: string;
};

export type MovieNightPlannerProps = {
  movies: PlannerMovie[];
  watchlistIds: string[];
  onAddToWatchlist: (movieId: string) => void;
};

const MOODS: MovieNightRequestMoodsItem[] = [
  "Relaxing and cozy", "Dark and mysterious", "Mind-bending", "Romantic",
  "Funny and lighthearted", "Emotional", "Exciting and intense",
  "Surreal and experimental", "Surprise me",
];
const EXPERIENCES: { value: MovieNightRequestViewingExperience; label: string; note: string }[] = [
  { value: "alone", label: "Solo", note: "A night for yourself" },
  { value: "date", label: "Date", note: "Two seats, one story" },
  { value: "friends", label: "Friends", note: "A shared screening" },
  { value: "family", label: "Family", note: "Room for everyone" },
];
const DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const DURATIONS = [
  { value: "120", label: "1–2 hours" },
  { value: "180", label: "2–3 hours" },
  { value: "300", label: "3–5 hours" },
  { value: "480", label: "All night" },
  { value: "custom", label: "Custom" },
];
const DEFAULT_PREFERENCES: PreferenceValues = {
  moods: ["Relaxing and cozy"],
  duration: "180",
  customDuration: 180,
  genres: [],
  directors: "",
  decades: [],
  avoidIds: [],
  maxMovies: 3,
  experience: "alone",
  notes: "",
  startTime: "19:30",
};

function formatClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

function readRuntime(value?: string): number | null {
  if (!value) return null;
  const clock = value.match(/^\s*(\d{1,2}):([0-5]\d)\s*$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const hoursAndMinutes = value.match(/(\d+)\s*(?:h|hr|hours?)\s*(?:(\d+)\s*(?:m|min|minutes?))?/i);
  if (hoursAndMinutes) return Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2] ?? 0);
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getPoster(movie: PlannerMovie): string {
  return movie.posterPath ?? `/__mockup/images/reelroom-${movie.id}.${movie.posterExt ?? "jpg"}`;
}

export function MovieNightPlanner({ movies, watchlistIds, onAddToWatchlist }: MovieNightPlannerProps) {
  const planMutation = useCreateMovieNightPlan();
  const [preferences, setPreferences] = useState<PreferenceValues>(DEFAULT_PREFERENCES);
  const [plan, setPlan] = useState<MovieNightPlanResponse | null>(null);
  const [films, setFilms] = useState<FilmPlanItem[]>([]);
  const [breaks, setBreaks] = useState<number[]>([]);
  const [runtimeById, setRuntimeById] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [showPreferences, setShowPreferences] = useState(true);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const movieById = useMemo(() => new Map(movies.map((movie) => [movie.id, movie])), [movies]);
  const genres = useMemo(() => Array.from(new Set(movies.flatMap((movie) => movie.genres?.length ? movie.genres : [movie.genre]).filter(Boolean))).sort(), [movies]);
  const selectedDuration = preferences.duration === "custom" ? preferences.customDuration : Number(preferences.duration);
  const availableDuration = Math.max(60, Math.min(1440, Number.isFinite(selectedDuration) ? selectedDuration : 60));
  const startMinutes = (() => {
    const [hour, minute] = preferences.startTime.split(":").map(Number);
    return hour * 60 + minute;
  })();
  let runningMinutes = startMinutes;
  const scheduledFilms: TimelineItem[] = films.flatMap((film, index) => {
    const movie = movieById.get(film.movieId);
    const runtime = movie ? runtimeById[movie.id] ?? movie.runtime : 0;
    if (!movie || !Number.isFinite(runtime) || runtime <= 0) return [];
    const start = runningMinutes;
    const end = start + runtime;
    runningMinutes = end;
    const scheduled: TimelineItem[] = [{ kind: "film", movie, runtime, reason: film.reason, start, end, index }];
    if (index < films.length - 1) {
      const breakLength = breaks[index] ?? 0;
      scheduled.push({ kind: "break", minutes: breakLength, start: runningMinutes, end: runningMinutes + breakLength, index });
      runningMinutes += breakLength;
    }
    return scheduled;
  });
  const totalFilmRuntime = scheduledFilms.reduce((sum, item) => item.kind === "film" ? sum + item.runtime : sum, 0);
  const totalMinutes = totalFilmRuntime + breaks.reduce((sum, minutes) => sum + minutes, 0);

  useEffect(() => {
    setBreaks((current) => {
      let remaining = Math.max(0, availableDuration - totalFilmRuntime);
      let changed = false;
      const next = current.map((minutes) => {
        const fitted = Math.min(Math.max(0, minutes), remaining);
        if (fitted !== minutes) changed = true;
        remaining -= fitted;
        return fitted;
      });
      return changed ? next : current;
    });
  }, [availableDuration, totalFilmRuntime]);

  function toggleItem<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
  }

  function maximumBreakMinutes(index: number, currentBreaks = breaks): number {
    const otherBreaks = currentBreaks.reduce((sum, minutes, currentIndex) => currentIndex === index ? sum : sum + minutes, 0);
    return Math.max(0, availableDuration - totalFilmRuntime - otherBreaks);
  }

  function updateBreak(index: number, requestedMinutes: number) {
    setBreaks((current) => {
      const maximum = maximumBreakMinutes(index, current);
      const minutes = Math.max(0, Math.min(maximum, Math.floor(requestedMinutes)));
      return current.map((value, currentIndex) => currentIndex === index ? minutes : value);
    });
  }

  function rememberRuntimes(request: MovieNightRequest) {
    setRuntimeById(Object.fromEntries(request.candidates.flatMap((candidate) => {
      const runtime = candidate.cinemetaRuntimeMinutes ?? candidate.runtimeMinutes;
      return typeof runtime === "number" && runtime > 0 ? [[candidate.id, runtime]] : [];
    })));
  }

  async function buildRequest(): Promise<MovieNightRequest> {
    const eligible = movies
      .filter((movie) => !preferences.avoidIds.includes(movie.id) && movie.year >= 1888)
      .slice(0, 60);
    const candidateResults: Array<MovieNightCandidate | null> = Array(eligible.length).fill(null);
    let nextIndex = 0;
    const enrichCandidates = async () => {
      while (nextIndex < eligible.length) {
        const index = nextIndex++;
        const movie = eligible[index];
        let metadata = null;
        try {
          metadata = await fetchCinemetaMovie(movie.title, movie.year);
        } catch {
          metadata = null;
        }
        candidateResults[index] = {
          id: movie.id,
          title: movie.title,
          year: movie.year,
          genres: movie.genres?.length ? movie.genres : [movie.genre].filter(Boolean),
          director: movie.director ?? "",
          synopsis: (movie.synopsis ?? "").slice(0, 700),
          runtimeMinutes: movie.runtime > 0 ? movie.runtime : readRuntime(metadata?.runtime),
          cinemetaDescription: metadata?.description?.slice(0, 500) ?? null,
          cinemetaGenres: metadata?.genres ?? [],
          cinemetaRuntimeMinutes: readRuntime(metadata?.runtime),
        };
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, eligible.length) }, () => enrichCandidates()));
    const candidates = candidateResults.filter((candidate): candidate is MovieNightCandidate => candidate !== null);
    return {
      moods: preferences.moods,
      availableMinutes: Math.max(60, Math.min(1440, availableDuration)),
      startTime: preferences.startTime,
      viewingExperience: preferences.experience,
      preferredGenres: preferences.genres,
      favoriteDirectors: preferences.directors.split(",").map((name) => name.trim()).filter(Boolean).slice(0, 12),
      preferredDecades: preferences.decades,
      avoidMovieIds: preferences.avoidIds,
      maxMovies: preferences.maxMovies,
      breakMinutes: 0,
      customBreakMinutes: 0,
      notes: preferences.notes.slice(0, 500),
      candidates,
    };
  }

  async function createPlan(event?: FormEvent, excludeCurrentFilms = false) {
    event?.preventDefault();
    if (!preferences.moods.length) {
      setError("Choose at least one mood to begin.");
      return;
    }
    const excludedForPlan = new Set([
      ...preferences.avoidIds,
      ...(excludeCurrentFilms ? films.map((film) => film.movieId) : []),
    ]);
    if (movies.every((movie) => excludedForPlan.has(movie.id))) {
      setError(excludeCurrentFilms
        ? "There are no different films left in the collection for another plan."
        : "There are no films left in the collection with those exclusions.");
      return;
    }
    setError("");
    try {
      const request = await buildRequest();
      if (!request.candidates.length) {
        setError("No films with a verified release year are available for this plan. Try a different collection.");
        return;
      }
      if (excludeCurrentFilms) request.avoidMovieIds = Array.from(new Set([...request.avoidMovieIds, ...films.map((film) => film.movieId)]));
      request.breakMinutes = breaks.length ? Math.max(...breaks) : 0;
      request.customBreakMinutes = request.breakMinutes;
      rememberRuntimes(request);
      const response = await planMutation.mutateAsync({ data: request });
      const validRecommendations = response.recommendations.filter((item) => movieById.has(item.movieId));
      setPlan({ ...response, recommendations: validRecommendations });
      setFilms(validRecommendations.map((item) => ({ movieId: item.movieId, reason: item.reason })));
      setBreaks((current) => Array(Math.max(0, validRecommendations.length - 1)).fill(0).map((_, index) => current[index] ?? 0));
      setShowPreferences(false);
      setReplaceTarget(null);
    } catch {
      setError("We couldn't build that plan just now. Your preferences are saved; try again.");
    }
  }

  async function replaceFilm(movieId: string) {
    setReplaceTarget(movieId);
    setIsReplacing(true);
    setError("");
    try {
      const data = await buildRequest();
      if (!data.candidates.length) {
        setError("No films with verified release dates are available for a replacement.");
        return;
      }
      const remainingFilms = films.filter((item) => item.movieId !== movieId);
      const remainingRuntime = remainingFilms.reduce((sum, item) => {
        const movie = movieById.get(item.movieId);
        return sum + (movie ? runtimeById[movie.id] ?? movie.runtime : 0);
      }, 0);
      const reservedBreaks = breaks.reduce((sum, minutes) => sum + minutes, 0);
      const replacementBudget = Math.floor(availableDuration - remainingRuntime - reservedBreaks);
      if (replacementBudget < 60) {
        setError("There is not enough time left in this screening for a replacement film.");
        return;
      }
      data.availableMinutes = replacementBudget;
      data.maxMovies = 1;
      data.avoidMovieIds = Array.from(new Set([
        ...data.avoidMovieIds,
        movieId,
        ...remainingFilms.map((item) => item.movieId),
      ]));
      rememberRuntimes(data);
      const response = await planMutation.mutateAsync({ data });
      const replacement = response.recommendations.find((item) => movieById.has(item.movieId) && !data.avoidMovieIds.includes(item.movieId));
      if (!replacement) {
        setError("No different film matched those preferences. The rest of your plan is unchanged.");
        return;
      }
      setFilms((current) => current.map((item) => item.movieId === movieId ? { movieId: replacement.movieId, reason: replacement.reason } : item));
      setReplaceTarget(null);
    } catch {
      setError("That film couldn't be replaced right now. Your current plan is unchanged.");
    } finally {
      setIsReplacing(false);
    }
  }

  function moveFilm(index: number, destination: number) {
    if (destination < 0 || destination >= films.length) return;
    setFilms((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(destination, 0, moved);
      return next;
    });
    setBreaks((current) => {
      const next = Array(Math.max(0, films.length - 1)).fill(0).map((_, i) => current[i] ?? 0);
      if (index < destination) {
        const [removed] = next.splice(index, 1);
        next.splice(destination - 1, 0, removed ?? 0);
      } else {
        const [removed] = next.splice(index - 1, 1);
        next.splice(destination, 0, removed ?? 0);
      }
      return next;
    });
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault();
    if (!draggedId) return;
    const sourceIndex = films.findIndex((film) => film.movieId === draggedId);
    if (sourceIndex >= 0 && sourceIndex !== targetIndex) moveFilm(sourceIndex, targetIndex);
    setDraggedId(null);
  }

  const loading = planMutation.isPending;
  const movieCountText = movies.length === 1 ? "1 film" : `${movies.length} films`;

  return (
    <section className="rr-night" data-testid="section-movie-night-planner">
      <div className="rr-night-grain" aria-hidden="true" />
      <div className="rr-night-wrap">
        <header className="rr-night-heading">
          <div className="rr-night-kicker"><span /> REELROOM / PRIVATE SCREENING</div>
          <div className="rr-night-title-row">
            <div>
              <h1>Make a night<br /><em>of it.</em></h1>
              <p>A considered double feature, or an evening that takes its time. Tell us what sounds right.</p>
            </div>
            <div className="rr-night-reel-mark" aria-hidden="true"><Film size={27} strokeWidth={1.2} /><span>NO. 01<br />TONIGHT</span></div>
          </div>
        </header>

        {showPreferences && (
          <form className="rr-night-form" onSubmit={createPlan} data-testid="form-movie-night-preferences">
            <section className="rr-night-section">
              <div className="rr-night-section-heading"><span className="rr-night-index">01</span><div><h2>Set the feeling</h2><p>Choose one or more moods for the room.</p></div></div>
              <div className="rr-night-chips" role="group" aria-label="Choose moods">
                {MOODS.map((mood) => <button key={mood} type="button" className={`rr-night-chip ${preferences.moods.includes(mood) ? "is-selected" : ""}`} aria-pressed={preferences.moods.includes(mood)} data-testid={`button-mood-${mood.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onClick={() => setPreferences((current) => ({ ...current, moods: toggleItem(current.moods, mood) }))}>{mood}</button>)}
              </div>
            </section>

            <section className="rr-night-section">
              <div className="rr-night-section-heading"><span className="rr-night-index">02</span><div><h2>Make room for it</h2><p>How long do you have, and when does the screening begin?</p></div></div>
              <div className="rr-night-time-grid">
                <div>
                  <label className="rr-night-label" htmlFor="night-duration">Available time</label>
                  <select id="night-duration" className="rr-night-input" value={preferences.duration} data-testid="select-available-time" onChange={(event) => setPreferences((current) => ({ ...current, duration: event.target.value }))}>
                    {DURATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {preferences.duration === "custom" && <label className="rr-night-custom"><span>Minutes</span><input type="number" min={60} max={1440} value={preferences.customDuration} data-testid="input-custom-duration" onChange={(event) => setPreferences((current) => ({ ...current, customDuration: Math.max(60, Math.min(1440, Number(event.target.value) || 60)) }))} /></label>}
                </div>
                <div><label className="rr-night-label" htmlFor="night-start">Start time</label><input id="night-start" type="time" className="rr-night-input" value={preferences.startTime} required data-testid="input-start-time" onChange={(event) => setPreferences((current) => ({ ...current, startTime: event.target.value }))} /></div>
                <div><label className="rr-night-label" htmlFor="night-count">Maximum films</label><select id="night-count" className="rr-night-input" value={preferences.maxMovies} data-testid="select-maximum-movies" onChange={(event) => setPreferences((current) => ({ ...current, maxMovies: Number(event.target.value) }))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option value={count} key={count}>{count} {count === 1 ? "film" : "films"}</option>)}</select></div>
              </div>
            </section>

            <section className="rr-night-section">
              <div className="rr-night-section-heading"><span className="rr-night-index">03</span><div><h2>Choose your company</h2><p>The same film lands differently with different people.</p></div></div>
              <div className="rr-night-experiences" role="group" aria-label="Viewing experience">
                {EXPERIENCES.map((experience) => <button key={experience.value} type="button" className={`rr-night-experience ${preferences.experience === experience.value ? "is-selected" : ""}`} aria-pressed={preferences.experience === experience.value} data-testid={`button-experience-${experience.value}`} onClick={() => setPreferences((current) => ({ ...current, experience: experience.value }))}><strong>{experience.label}</strong><span>{experience.note}</span></button>)}
              </div>
            </section>

            <section className="rr-night-section">
              <div className="rr-night-section-heading"><span className="rr-night-index">04</span><div><h2>Fine-tune the reel</h2><p>Optional details help the collection feel a little more yours.</p></div></div>
              <label className="rr-night-label">Genres</label>
              {genres.length ? <div className="rr-night-chips rr-night-genre-list" role="group" aria-label="Preferred genres">{genres.map((genre) => <button type="button" key={genre} className={`rr-night-chip ${preferences.genres.includes(genre) ? "is-selected" : ""}`} aria-pressed={preferences.genres.includes(genre)} data-testid={`button-genre-${genre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onClick={() => setPreferences((current) => ({ ...current, genres: toggleItem(current.genres, genre) }))}>{genre}</button>)}</div> : <p className="rr-night-helper">No genre details are available in this collection.</p>}
              <div className="rr-night-detail-grid">
                <label className="rr-night-field"><span>Favorite directors <small>Separate names with commas</small></span><input className="rr-night-input" value={preferences.directors} maxLength={500} placeholder="e.g. Agnès Varda, Wong Kar-wai" data-testid="input-favorite-directors" onChange={(event) => setPreferences((current) => ({ ...current, directors: event.target.value }))} /></label>
                <div><span className="rr-night-label">Preferred decades</span><div className="rr-night-chips rr-night-decade-list">{DECADES.map((decade) => <button type="button" key={decade} className={`rr-night-chip ${preferences.decades.includes(decade) ? "is-selected" : ""}`} aria-pressed={preferences.decades.includes(decade)} data-testid={`button-decade-${decade}`} onClick={() => setPreferences((current) => ({ ...current, decades: toggleItem(current.decades, decade) }))}>{decade}s</button>)}</div></div>
              </div>
              <label className="rr-night-field rr-night-avoid"><span>Films to leave out <small>Choose any titles you would rather skip tonight.</small></span><select className="rr-night-input rr-night-multi" multiple value={preferences.avoidIds} data-testid="select-movies-to-avoid" onChange={(event) => setPreferences((current) => ({ ...current, avoidIds: Array.from(event.target.selectedOptions, (option) => option.value) }))}>{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title} ({movie.year})</option>)}</select></label>
              <label className="rr-night-field rr-night-notes"><span>A note for the curator <small>Anything else the night should know?</small></span><textarea className="rr-night-input" maxLength={500} rows={3} value={preferences.notes} placeholder="Keep it under two hours, nothing too bleak..." data-testid="textarea-movie-night-note" onChange={(event) => setPreferences((current) => ({ ...current, notes: event.target.value }))} /></label>
            </section>
            <div className="rr-night-submit-row">
              <span className="rr-night-collection-note">{movieCountText} in this collection</span>
              <button className="rr-night-primary" type="submit" disabled={loading || movies.length === 0} data-testid="button-create-movie-night"><span>{loading ? "Curating your movie night..." : "Curate my night"}</span><ArrowRight size={17} /></button>
            </div>
            {loading && <div className="rr-night-loading" role="status" aria-live="polite" data-testid="status-movie-night-loading"><span className="rr-night-loading-track"><i /></span>Curating your movie night...</div>}
            {error && <p className="rr-night-error" role="alert" data-testid="status-movie-night-error">{error}</p>}
          </form>
        )}

        {!showPreferences && plan && (
          <div className="rr-night-results" data-testid="section-movie-night-results">
            <div className="rr-night-result-head">
              <div><span className="rr-night-result-kicker"><Sparkles size={13} /> YOUR SCREENING, ARRANGED</span><h2 data-testid="text-plan-title">{plan.title}</h2><p data-testid="text-plan-summary">{plan.summary}</p></div>
              <div className="rr-night-total" data-testid="text-plan-total"><span>TOTAL EVENING</span><strong>{formatDuration(totalMinutes)}</strong><small>{films.length} {films.length === 1 ? "film" : "films"} · {formatClock(startMinutes)}–{formatClock(startMinutes + totalMinutes)}</small></div>
            </div>
            {films.length === 0 ? <div className="rr-night-empty" data-testid="status-no-recommendations"><Film size={23} /><h3>No films matched this combination.</h3><p>Try a broader mood or remove a few exclusions. Your collection has not been changed.</p><button type="button" className="rr-night-secondary" data-testid="button-edit-preferences-empty" onClick={() => setShowPreferences(true)}>Adjust preferences</button></div> : (
              <div className="rr-night-timeline" aria-label="Movie night timeline" data-testid="list-movie-night-timeline">
                {scheduledFilms.map((item) => item.kind === "film" ? (
                  <article key={`film-${item.movie.id}`} className={`rr-night-film ${draggedId === item.movie.id ? "is-dragging" : ""}`} draggable onDragStart={() => setDraggedId(item.movie.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item.index)} data-testid={`card-plan-film-${item.movie.id}`}>
                    <div className="rr-night-time"><strong>{formatClock(item.start)}</strong><span>{formatClock(item.end)}</span><i /></div>
                    <div className="rr-night-film-card">
                      <div className="rr-night-poster"><img src={getPoster(item.movie)} alt={`${item.movie.title} poster`} loading="lazy" data-testid={`img-plan-poster-${item.movie.id}`} /></div>
                      <div className="rr-night-film-copy"><div className="rr-night-film-meta"><span>FILM {String(item.index + 1).padStart(2, "0")}</span><span>{item.movie.year}</span><span>{formatDuration(item.runtime)}</span></div><h3 data-testid={`text-plan-movie-${item.movie.id}`}>{item.movie.title}</h3><p className="rr-night-director">{item.movie.director}</p><p className="rr-night-reason" data-testid={`text-plan-reason-${item.movie.id}`}>{item.reason}</p>
                        <div className="rr-night-film-actions">
                          <button type="button" className="rr-night-text-action" disabled={isReplacing} data-testid={`button-replace-film-${item.movie.id}`} onClick={() => replaceFilm(item.movie.id)}>{isReplacing && replaceTarget === item.movie.id ? "Finding another..." : "Replace film"}</button>
                          <button type="button" className={`rr-night-text-action ${watchlistIds.includes(item.movie.id) ? "is-saved" : ""}`} disabled={watchlistIds.includes(item.movie.id)} data-testid={`button-add-watchlist-${item.movie.id}`} onClick={() => onAddToWatchlist(item.movie.id)}><BookmarkPlus size={14} />{watchlistIds.includes(item.movie.id) ? "In watchlist" : "Add to watchlist"}</button>
                          <span className="rr-night-order-actions">
                            <button type="button" aria-label={`Move ${item.movie.title} up`} title="Move up" disabled={item.index === 0} data-testid={`button-move-up-${item.movie.id}`} onClick={() => moveFilm(item.index, item.index - 1)}><ArrowUp size={14} /></button>
                            <button type="button" aria-label={`Move ${item.movie.title} down`} title="Move down" disabled={item.index === films.length - 1} data-testid={`button-move-down-${item.movie.id}`} onClick={() => moveFilm(item.index, item.index + 1)}><ArrowDown size={14} /></button>
                          </span>
                        </div>
                      </div>
                      <span className="rr-night-drag" aria-hidden="true" title="Drag to reorder"><GripVertical size={17} /></span>
                    </div>
                  </article>
                ) : <div className="rr-night-break" key={`break-${item.index}`} data-testid={`row-break-${item.index}`}><div className="rr-night-break-line" /><Clock3 size={13} /><label htmlFor={`break-length-${item.index}`}>Intermission</label><select id={`break-length-${item.index}`} value={item.minutes > 15 ? "custom" : item.minutes} data-testid={`select-break-${item.index}`} onChange={(event) => updateBreak(item.index, event.target.value === "custom" ? Math.min(20, maximumBreakMinutes(item.index)) : Number(event.target.value))}><option value={0}>No break</option><option value={5} disabled={maximumBreakMinutes(item.index) < 5}>5 min</option><option value={10} disabled={maximumBreakMinutes(item.index) < 10}>10 min</option><option value={15} disabled={maximumBreakMinutes(item.index) < 15}>15 min</option><option value="custom" disabled={maximumBreakMinutes(item.index) <= 15}>Custom</option></select>{item.minutes > 15 && <input aria-label="Custom break minutes" type="number" min={16} max={maximumBreakMinutes(item.index)} value={item.minutes} data-testid={`input-custom-break-${item.index}`} onChange={(event) => updateBreak(item.index, Number(event.target.value))} />}<span>{formatClock(item.start)}–{formatClock(item.end)}</span></div>)}
              </div>
            )}
            <div className="rr-night-result-footer">
              <button type="button" className="rr-night-secondary" data-testid="button-edit-preferences" onClick={() => { setShowPreferences(true); setError(""); }}><ArrowLeft size={15} /> Edit preferences</button>
              <button type="button" className="rr-night-primary rr-night-regenerate" disabled={loading} data-testid="button-regenerate-plan" onClick={() => createPlan(undefined, true)}><RotateCw size={15} />{loading ? "Curating your movie night..." : "Regenerate plan"}</button>
            </div>
            {loading && <p className="rr-night-loading-inline" role="status" data-testid="status-movie-night-loading-inline">Curating your movie night...</p>}
            {error && <p className="rr-night-error" role="alert" data-testid="status-movie-night-error-results">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
