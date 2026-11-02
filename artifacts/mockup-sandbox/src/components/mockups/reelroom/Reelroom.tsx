import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Check, CheckCircle2,
  Clapperboard, Film, Heart, Menu, Minus, Play, Plus, RotateCcw, Search,
  ShoppingBag, ShoppingCart, Trash2, X,
} from "lucide-react";
import "./_group.css";

type Movie = {
  id: string; title: string; year: number; genre: string; runtime: number;
  director: string; synopsis: string; palette: [string, string]; platforms: string[];
};
type View = "home" | "browse" | "physical" | "digital" | "details" | "watchlist" | "cart" | "checkout" | "library" | "about" | "contact" | "ad";
type CartLine = {
  key: string; movieId: string; experience: "Physical" | "Digital"; mode: "Buy" | "Rent";
  option: string; price: number; quantity: number; rental: string;
};
type DemoOrder = { id: string; date: string; customer: string; total: number; items: CartLine[]; fulfillment: string };
type CheckoutData = { name: string; email: string; phone: string; fulfillment: string; address: string; note: string };

const MOVIES: Movie[] = [
  { id: "interstellar", title: "Interstellar", year: 2014, genre: "Sci-Fi", runtime: 169, director: "Christopher Nolan", synopsis: "With Earth nearing the edge of habitability, a team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.", palette: ["#101f27", "#9ba97f"], platforms: ["Apple TV", "Amazon Prime Video", "Google TV"] },
  { id: "blade-runner-2049", title: "Blade Runner 2049", year: 2017, genre: "Sci-Fi", runtime: 164, director: "Denis Villeneuve", synopsis: "A new blade runner uncovers a long-buried secret that could unsettle what remains of society and the meaning of being human.", palette: ["#311d25", "#d7804e"], platforms: ["Apple TV", "Amazon Prime Video", "YouTube Movies"] },
  { id: "dark-knight", title: "The Dark Knight", year: 2008, genre: "Crime", runtime: 152, director: "Christopher Nolan", synopsis: "Batman faces a criminal mastermind whose theatrical chaos pushes Gotham and its people toward impossible choices.", palette: ["#18242d", "#82949b"], platforms: ["Apple TV", "Google TV"] },
  { id: "grand-budapest", title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy", runtime: 99, director: "Wes Anderson", synopsis: "A legendary concierge and his young protégé become entangled in a priceless painting, a family fortune, and a changing Europe.", palette: ["#4b2334", "#e6a46c"], platforms: ["Apple TV", "Amazon Prime Video", "Google TV", "YouTube Movies"] },
  { id: "dune-part-two", title: "Dune: Part Two", year: 2024, genre: "Sci-Fi", runtime: 166, director: "Denis Villeneuve", synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge and trying to prevent a future only he can foresee.", palette: ["#3b281b", "#e1aa65"], platforms: ["Apple TV", "Amazon Prime Video", "Google TV"] },
  { id: "the-shining", title: "The Shining", year: 1980, genre: "Horror", runtime: 146, director: "Stanley Kubrick", synopsis: "An off-season caretaker takes his family to an isolated hotel, where the quiet winter and the building's history begin to close in.", palette: ["#29191d", "#bf5c43"], platforms: ["Apple TV", "YouTube Movies"] },
  { id: "whiplash", title: "Whiplash", year: 2014, genre: "Drama", runtime: 107, director: "Damien Chazelle", synopsis: "An ambitious young drummer enters a punishing conservatory, where a celebrated instructor tests the limits of discipline and obsession.", palette: ["#242020", "#cf8545"], platforms: ["Amazon Prime Video", "Google TV", "YouTube Movies"] },
  { id: "parasite", title: "Parasite", year: 2019, genre: "Thriller", runtime: 132, director: "Bong Joon-ho", synopsis: "A resourceful family finds its way into a wealthy household, until an unexpected discovery cracks open the careful arrangement.", palette: ["#183b32", "#a7b28a"], platforms: ["Apple TV", "Google TV", "YouTube Movies"] },
  { id: "inception", title: "Inception", year: 2010, genre: "Sci-Fi", runtime: 148, director: "Christopher Nolan", synopsis: "A specialist in corporate espionage enters dreams to plant an idea, taking on a job that bends memory, time, and architecture.", palette: ["#182b34", "#788d8c"], platforms: ["Apple TV", "Amazon Prime Video", "Google TV"] },
  { id: "2001", title: "2001: A Space Odyssey", year: 1968, genre: "Sci-Fi", runtime: 149, director: "Stanley Kubrick", synopsis: "A mysterious monolith appears at turning points in human evolution, carrying a crew toward a journey beyond familiar time and space.", palette: ["#1b2830", "#97bbbc"], platforms: ["Apple TV", "Google TV"] },
  { id: "godfather", title: "The Godfather", year: 1972, genre: "Crime", runtime: 175, director: "Francis Ford Coppola", synopsis: "The aging patriarch of a crime dynasty passes control to his reluctant son in a defining portrait of family, loyalty, and power.", palette: ["#241a18", "#b18654"], platforms: ["Apple TV", "Amazon Prime Video", "YouTube Movies"] },
  { id: "pulp-fiction", title: "Pulp Fiction", year: 1994, genre: "Crime", runtime: 154, director: "Quentin Tarantino", synopsis: "Two hitmen, a boxer, and a pair of small-time criminals cross paths in a darkly funny mosaic of Los Angeles life.", palette: ["#311e1a", "#df9b53"], platforms: ["Amazon Prime Video", "Google TV", "YouTube Movies"] },
  { id: "spirited-away", title: "Spirited Away", year: 2001, genre: "Animation", runtime: 125, director: "Hayao Miyazaki", synopsis: "A young girl wanders into a spirit world and must find courage, kindness, and a way home after her parents are transformed.", palette: ["#193337", "#b1c983"], platforms: ["Apple TV", "Google TV"] },
  { id: "the-batman", title: "The Batman", year: 2022, genre: "Crime", runtime: 176, director: "Matt Reeves", synopsis: "In his second year protecting Gotham, Batman follows a trail of riddles through the city's corruption and his own family history.", palette: ["#281b20", "#be473a"], platforms: ["Apple TV", "Amazon Prime Video", "Google TV"] },
  { id: "oppenheimer", title: "Oppenheimer", year: 2023, genre: "Drama", runtime: 180, director: "Christopher Nolan", synopsis: "A theoretical physicist and his collaborators race to create a new weapon, then reckon with the world it has changed.", palette: ["#38231a", "#e99c53"], platforms: ["Apple TV", "Amazon Prime Video", "YouTube Movies"] },
  { id: "everything-everywhere", title: "Everything Everywhere All at Once", year: 2022, genre: "Adventure", runtime: 139, director: "Daniel Kwan & Daniel Scheinert", synopsis: "An overworked laundromat owner is pulled into a multiverse-spanning adventure where the fate of every reality rests on an unlikely hero.", palette: ["#241b38", "#c58ae0"], platforms: ["Apple TV", "Google TV", "YouTube Movies"] },
  { id: "portrait-lady", title: "Portrait of a Lady on Fire", year: 2019, genre: "Romance", runtime: 122, director: "Céline Sciamma", synopsis: "On a remote island in eighteenth-century France, a painter is commissioned to capture the likeness of a woman who will not sit for her portrait.", palette: ["#492722", "#de9b75"], platforms: ["Apple TV", "Google TV"] },
  { id: "before-sunrise", title: "Before Sunrise", year: 1995, genre: "Romance", runtime: 101, director: "Richard Linklater", synopsis: "Two young travelers meet on a train and spend one unhurried night walking through Vienna, talking about life and possibility.", palette: ["#1f3439", "#d39e60"], platforms: ["Amazon Prime Video", "Google TV", "YouTube Movies"] },
];

const HERO_POSTERS = [
  { movieId: "interstellar", image: "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg", source: "https://en.wikipedia.org/wiki/Interstellar_(film)" },
  { movieId: "dune-part-two", image: "https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Dune_Part_Two_poster.jpeg/500px-Dune_Part_Two_poster.jpeg", source: "https://en.wikipedia.org/wiki/Dune:_Part_Two" },
  { movieId: "blade-runner-2049", image: "https://upload.wikimedia.org/wikipedia/en/9/9b/Blade_Runner_2049_poster.png", source: "https://en.wikipedia.org/wiki/Blade_Runner_2049" },
  { movieId: "oppenheimer", image: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/500px-Oppenheimer_%28film%29.jpg", source: "https://en.wikipedia.org/wiki/Oppenheimer_(film)" },
  { movieId: "parasite", image: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Parasite_%282019_film%29.png/500px-Parasite_%282019_film%29.png", source: "https://en.wikipedia.org/wiki/Parasite_(2019_film)" },
] as const;

const FOUR_K_DEMO_TITLES = new Set(["interstellar", "blade-runner-2049", "dune-part-two", "dark-knight", "the-shining", "inception", "2001", "godfather", "the-batman", "oppenheimer"]);
const PLATFORM_RENT_PRICE: Record<string, number> = { "Apple TV": 2.5, "Amazon Prime Video": 2.9, "Google TV": 2.3, "YouTube Movies": 2.2 };
const PHYSICAL_PRICE: Record<string, Record<string, number>> = {
  Buy: { DVD: 3.5, "Blu-ray": 6.5, "4K Ultra HD": 9.5 },
  Rent: { DVD: 1, "Blu-ray": 2, "4K Ultra HD": 3 },
};
const STORE_KEY = "reelroom-prototype-v1";
const money = (n: number) => `${n.toFixed(3)} KWD`;
const movieFor = (id: string) => MOVIES.find((movie) => movie.id === id) ?? MOVIES[0];
const readStored = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const saveStored = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be unavailable in private browsing */ }
};

function Logo({ onClick }: { onClick: () => void }) {
  return <button className="rr-brand" onClick={onClick} aria-label="REELROOM home" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}>
    <svg className="rr-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M5 4.5h26v27H5z" fill="none" stroke="#00E054" strokeWidth="1.5"/>
      <path d="M10 27V9h8.1c4 0 6.2 1.9 6.2 5 0 2.5-1.4 4.1-3.9 4.7L26 27h-5.4l-4.9-7.8h-1.1V27zm4.6-11.6h3.2c1.3 0 2-.5 2-1.5s-.7-1.5-2-1.5h-3.2z" fill="#F2F4F6"/>
      <path d="M2 10V2h8M26 2h8v8M34 26v8h-8M10 34H2v-8" fill="none" stroke="#00E054" strokeWidth="1"/>
    </svg>
    <span><span className="rr-wordmark">REELROOM</span><span className="rr-tagline">Every Film. Your Way.</span></span>
  </button>;
}

function Poster({ movie, onClick, saved, onFavorite }: { movie: Movie; onClick: () => void; saved: boolean; onFavorite: () => void }) {
  return <div className="rr-poster" role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }} style={{ "--poster-bg": `linear-gradient(148deg, ${movie.palette[0]}, #11181c 78%)`, "--poster-glow": movie.palette[1] } as CSSProperties} aria-label={`View ${movie.title} details`}>
    <div className="rr-poster-art" />
    <span className="rr-poster-mark">REELROOM ARCHIVE</span>
    <button className={`rr-fav ${saved ? "saved" : ""}`} aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`} onClick={(event) => { event.stopPropagation(); onFavorite(); }}>
      <Heart size={15} fill={saved ? "currentColor" : "none"} />
    </button>
    <span className="rr-poster-title">{movie.title}</span>
    <span className="rr-poster-year">{movie.year} · {movie.genre.toUpperCase()}</span>
    <div className="rr-card-actions">
      <button className="rr-card-action" onClick={(event) => { event.stopPropagation(); onClick(); }}>Details <ArrowRight size={12}/></button>
      <button className="rr-card-action" aria-label={`Favorite ${movie.title}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }}><Heart size={13} fill={saved ? "currentColor" : "none"}/></button>
    </div>
  </div>;
}

function MovieCard({ movie, onDetails, saved, onFavorite }: { movie: Movie; onDetails: () => void; saved: boolean; onFavorite: () => void }) {
  const base = Math.min(...Object.values(PHYSICAL_PRICE.Buy));
  return <article className="rr-movie-card">
    <Poster movie={movie} onClick={onDetails} saved={saved} onFavorite={onFavorite}/>
    <div className="rr-movie-info">
      <h3 className="rr-movie-title">{movie.title}</h3>
      <div className="rr-movie-sub">{movie.year} <span aria-hidden="true">·</span> {movie.genre} <span aria-hidden="true">·</span> {movie.runtime} min</div>
      <div className="rr-movie-bottom"><span className="rr-price">From {money(base)} <small>demo</small></span><span className="rr-tags">Disc · Digital</span></div>
    </div>
  </article>;
}

export function Reelroom() {
  const [view, setView] = useState<View>("home");
  const [selectedMovieId, setSelectedMovieId] = useState(MOVIES[0].id);
  const [watchlist, setWatchlist] = useState<string[]>(() => readStored("reelroom-watchlist", []));
  const [cart, setCart] = useState<CartLine[]>(() => readStored("reelroom-cart", []));
  const [orders, setOrders] = useState<DemoOrder[]>(() => readStored("reelroom-orders", []));
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [decade, setDecade] = useState("All decades");
  const [format, setFormat] = useState("Any format");
  const [modeFilter, setModeFilter] = useState("Any mode");
  const [maxPrice, setMaxPrice] = useState("Any price");
  const [sort, setSort] = useState("Featured");
  const [experience, setExperience] = useState<"Physical" | "Digital">("Physical");
  const [buyMode, setBuyMode] = useState<"Buy" | "Rent">("Buy");
  const [selectedOption, setSelectedOption] = useState("Blu-ray");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({ name: "", email: "", phone: "", fulfillment: "Delivery", address: "", note: "" });
  const [confirmedOrder, setConfirmedOrder] = useState<DemoOrder | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [adSecond, setAdSecond] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adKey, setAdKey] = useState(0);

  const selectedMovie = movieFor(selectedMovieId);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const genres = useMemo(() => ["All genres", ...Array.from(new Set(MOVIES.map((movie) => movie.genre))).sort()], []);
  const catalogPrice = (movie: Movie) => {
    const digital = view === "digital" || modeFilter === "Digital";
    const renting = modeFilter === "Rent";
    if (digital) {
      const cheapestPlatform = Math.min(...movie.platforms.map((platform) => PLATFORM_RENT_PRICE[platform] ?? 2.5));
      return cheapestPlatform * (renting ? 1 : 3.2);
    }
    return renting ? 1 : 3.5;
  };

  useEffect(() => { saveStored("reelroom-watchlist", watchlist); }, [watchlist]);
  useEffect(() => { saveStored("reelroom-cart", cart); }, [cart]);
  useEffect(() => { saveStored("reelroom-orders", orders); }, [orders]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 2700); return () => window.clearTimeout(timeout); }, [toast]);
  useEffect(() => {
    if (!adPlaying) return;
    const timer = window.setInterval(() => setAdSecond((current) => {
      if (current >= 11) { setAdPlaying(false); return 12; }
      return current + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [adPlaying, adKey]);

  const navigate = (next: View) => {
    setView(next);
    setMobileOpen(false);
    setAdded(false);
    if (next === "checkout") { setCheckoutStep(1); setCheckoutErrors({}); setConfirmedOrder(null); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleFavorite = (id: string) => {
    const exists = watchlist.includes(id);
    setWatchlist((current) => exists ? current.filter((savedId) => savedId !== id) : [...current, id]);
    setToast(exists ? "Removed from your watchlist" : "Saved to your watchlist");
  };
  const openDetails = (movie: Movie) => {
    setSelectedMovieId(movie.id);
    setExperience("Physical"); setBuyMode("Buy"); setSelectedOption("Blu-ray"); setQuantity(1);
    navigate("details");
  };
  const filteredMovies = useMemo(() => {
    let result = [...MOVIES];
    if (view === "physical") result = result.filter((movie) => movie.id);
    if (view === "digital") result = result.filter((movie) => movie.platforms.length);
    if (genre !== "All genres") result = result.filter((movie) => movie.genre === genre);
    if (decade !== "All decades") {
      const from = Number(decade.slice(0, 4));
      result = result.filter((movie) => movie.year >= from && movie.year < from + 10);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((movie) => `${movie.title} ${movie.genre} ${movie.director} ${movie.year}`.toLowerCase().includes(term));
    }
    if (format !== "Any format") result = result.filter((movie) => {
      if (format === "Digital") return movie.platforms.length > 0;
      if (format === "4K Ultra HD") return FOUR_K_DEMO_TITLES.has(movie.id);
      return format === "DVD" || format === "Blu-ray";
    });
    if (modeFilter === "Digital") result = result.filter((movie) => movie.platforms.length > 0);
    if (modeFilter === "Physical") result = result.filter((movie) => Boolean(movie.id));
    if (modeFilter === "Rent" || modeFilter === "Buy") result = result.filter((movie) => Boolean(movie.id));
    if (maxPrice !== "Any price") {
      const cap = Number(maxPrice);
      result = result.filter((movie) => catalogPrice(movie) <= cap);
    }
    if (sort === "Title A–Z") result.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "Newest") result.sort((a, b) => b.year - a.year);
    if (sort === "Oldest") result.sort((a, b) => a.year - b.year);
    if (sort === "Price: low to high") result.sort((a, b) => catalogPrice(a) - catalogPrice(b) || a.title.localeCompare(b.title));
    return result;
  }, [view, genre, decade, search, format, modeFilter, maxPrice, sort]);

  const itemPrice = experience === "Physical"
    ? PHYSICAL_PRICE[buyMode][selectedOption]
    : Number((({ "Apple TV": 2.5, "Amazon Prime Video": 2.9, "Google TV": 2.3, "YouTube Movies": 2.2 } as Record<string, number>)[selectedOption] ?? 2.5) * (buyMode === "Buy" ? 3.2 : 1)).toFixed(3);
  const rental = experience === "Physical" ? "7-day rental · return by the date shown at checkout" : "30-day viewing window · 48 hours to finish once started";
  const setMode = (mode: "Buy" | "Rent") => { setBuyMode(mode); setAdded(false); };
  const setExperienceMode = (kind: "Physical" | "Digital") => {
    setExperience(kind); setSelectedOption(kind === "Physical" ? "Blu-ray" : (selectedMovie.platforms[0] ?? "Apple TV")); setAdded(false);
  };
  const addToCart = () => {
    const line: CartLine = {
      key: `${selectedMovie.id}-${experience}-${buyMode}-${selectedOption}-${Date.now()}`,
      movieId: selectedMovie.id, experience, mode: buyMode, option: selectedOption,
      price: Number(itemPrice), quantity: experience === "Physical" && buyMode === "Buy" ? quantity : 1,
      rental: buyMode === "Rent"
        ? experience === "Physical"
          ? `7-day rental · return by ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-KW", { day: "numeric", month: "short", year: "numeric" })}`
          : rental
        : "Permanent collection / demo ownership",
    };
    setCart((current) => [...current, line]);
    setAdded(true); setToast(`${selectedMovie.title} added to your cart`);
  };
  const updateQuantity = (key: string, value: number) => setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, value) } : item));
  const removeCartItem = (key: string) => { setCart((current) => current.filter((item) => item.key !== key)); setToast("Item removed from cart"); };
  const resetFilters = () => { setSearch(""); setGenre("All genres"); setDecade("All decades"); setFormat("Any format"); setModeFilter("Any mode"); setMaxPrice("Any price"); setSort("Featured"); };

  const validateCheckout = () => {
    const errors: Record<string, string> = {};
    if (!checkoutData.name.trim()) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.email)) errors.email = "Enter a valid email address.";
    if (!checkoutData.phone.trim()) errors.phone = "Please add a contact number.";
    if (cart.some((item) => item.experience === "Physical") && checkoutData.fulfillment === "Delivery" && checkoutData.address.trim().length < 8) errors.address = "Add a complete delivery address.";
    setCheckoutErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!validateCheckout()) return;
    const order: DemoOrder = {
      id: `RR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      date: new Date().toLocaleDateString("en-KW", { day: "numeric", month: "short", year: "numeric" }),
      customer: checkoutData.name, total: cartTotal, items: [...cart],
      fulfillment: cart.some((item) => item.experience === "Physical") ? checkoutData.fulfillment : "Digital platform preference",
    };
    setOrders((current) => [order, ...current]);
    setConfirmedOrder(order); setCart([]); setCheckoutStep(3); setCheckoutErrors({});
  };
  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Please add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email.";
    if (message.length < 12) errors.message = "Tell us a little more (12 characters minimum).";
    setContactErrors(errors);
    if (Object.keys(errors).length === 0) { setContactSent(true); setToast("Your note is ready for the REELROOM team"); event.currentTarget.reset(); }
  };

  const renderNav = () => {
    const links: { label: string; target: View }[] = [
      { label: "Movies", target: "browse" }, { label: "Physical", target: "physical" },
      { label: "Digital", target: "digital" }, { label: "About", target: "about" },
    ];
    return <>
      <div className="rr-topline"><strong>KUWAIT · KWD</strong> All prices and availability are demonstration data</div>
      <header className="rr-header">
        <div className="rr-wrap rr-nav">
          <Logo onClick={() => navigate("home")}/>
          <nav className={`rr-navlinks ${mobileOpen ? "open" : ""}`} aria-label="Main navigation">
            {links.map((link) => <button key={link.target} className={`rr-navlink ${view === link.target ? "active" : ""}`} onClick={() => navigate(link.target)}>{link.label}</button>)}
            <button className={`rr-navlink ${view === "watchlist" ? "active" : ""}`} onClick={() => navigate("watchlist")}>Watchlist{watchlist.length > 0 ? ` (${watchlist.length})` : ""}</button>
            <button className="rr-navlink" onClick={() => navigate("library")}>My Library</button>
          </nav>
          <div className="rr-actions">
            <button className="rr-icon-btn rr-search-short" aria-label="Search movies" onClick={() => { navigate("browse"); setTimeout(() => document.getElementById("catalog-search")?.focus(), 50); }}><Search size={18}/></button>
            <button className="rr-icon-btn" aria-label={`Shopping cart, ${cartCount} items`} onClick={() => navigate("cart")}><ShoppingCart size={18}/>{cartCount > 0 && <span className="rr-count">{cartCount}</span>}</button>
            <button className="rr-icon-btn rr-menu-toggle" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20}/> : <Menu size={20}/>}</button>
          </div>
        </div>
      </header>
    </>;
  };

  const movieGrid = (items: Movie[], columns = "six") => items.length ? <div className={`rr-grid ${columns === "four" ? "four" : ""}`}>
    {items.map((movie) => <MovieCard key={movie.id} movie={movie} saved={watchlist.includes(movie.id)} onDetails={() => openDetails(movie)} onFavorite={() => toggleFavorite(movie.id)}/>)}
  </div> : <div className="rr-empty"><Film size={27} color="#00E054"/><h2>No films in this frame.</h2><p>Try a different search or clear a few filters to find your next favorite.</p><button className="rr-button secondary small" onClick={resetFilters}>Clear filters</button></div>;

  const renderHome = () => <main>
    <section className="rr-hero">
      <div className="rr-hero-poster-stage" aria-label="Featured film posters">
        {HERO_POSTERS.map((poster, index) => {
          const movie = movieFor(poster.movieId);
          return <button type="button" key={poster.movieId} className={`rr-hero-poster rr-hero-poster-${index + 1}`} aria-label={`View ${movie.title} details`} onClick={() => openDetails(movie)}>
            <img src={poster.image} alt={`${movie.title} theatrical poster`} loading={index < 2 ? "eager" : "lazy"}/>
            <span className="rr-hero-poster-title">{movie.title}</span>
          </button>;
        })}
        <div className="rr-hero-poster-credit">
          <span>Poster art for identification · sources: </span>
          {HERO_POSTERS.map((poster, index) => <span key={poster.movieId}>{index > 0 && " · "}<a href={poster.source} target="_blank" rel="noopener noreferrer">{movieFor(poster.movieId).title}</a></span>)}
        </div>
      </div>
      <div className="rr-wrap rr-hero-inner">
        <div className="rr-hero-copy">
          <div className="rr-kicker"><span/> A curated cinema archive · Kuwait</div>
          <h1 className="rr-display">YOUR NEXT<br/>FAVORITE FILM<br/><em>AWAITS.</em></h1>
          <p>Discover, rent, or own the films you love. Digital or physical. Always your choice.</p>
          <div className="rr-hero-buttons">
            <button className="rr-button" onClick={() => navigate("browse")}>Explore movies <ArrowRight size={15}/></button>
            <button className="rr-button secondary" onClick={() => navigate("physical")}>Shop physical</button>
          </div>
          <div className="rr-hero-meta"><span className="rr-live-dot"/> One film. Every way to watch it.</div>
        </div>
        <span className="rr-scroll-mark">Scroll to explore <ArrowDownRight size={14}/></span>
      </div>
    </section>
    <section className="rr-section">
      <div className="rr-wrap">
        <div className="rr-section-head"><div><span className="rr-eyebrow">The room is open</span><h2 className="rr-section-title rr-display">A good place to start.</h2></div><button className="rr-text-link" onClick={() => navigate("browse")}>Browse all films <ArrowRight size={14}/></button></div>
        {movieGrid([MOVIES[0], MOVIES[4], MOVIES[7], MOVIES[14], MOVIES[3], MOVIES[12]], "six")}
      </div>
    </section>
    <section className="rr-section compact">
      <div className="rr-wrap">
        <div className="rr-section-head"><div><span className="rr-eyebrow">Choose your experience</span><h2 className="rr-section-title rr-display">Cinema, your way.</h2></div></div>
        <div className="rr-experience">
          <article className="rr-experience-card physical"><div className="rr-case-stack"><span/><span/><span/></div><div className="rr-experience-content"><span className="rr-eyebrow">For the shelf</span><h3>Cinema you can hold.</h3><p>Build your collection with DVD, Blu-ray, and 4K Ultra HD editions. Or take a disc home for movie night.</p><button className="rr-button secondary small" onClick={() => navigate("physical")}>Explore physical <ArrowRight size={13}/></button></div></article>
          <article className="rr-experience-card digital"><div className="rr-screen-art"/><div className="rr-experience-content"><span className="rr-eyebrow">For right now</span><h3>Cinema on your terms.</h3><p>Choose a digital platform and compare example rent or ownership options, all in one room.</p><button className="rr-button secondary small" onClick={() => navigate("digital")}>Explore digital <ArrowRight size={13}/></button></div></article>
        </div>
      </div>
    </section>
    <section className="rr-section">
      <div className="rr-wrap">
        <div className="rr-section-head"><div><span className="rr-eyebrow">Simple by design</span><h2 className="rr-section-title rr-display">From discovery to credits.</h2></div></div>
        <div className="rr-steps">
          <div className="rr-step"><span className="rr-step-num">01 / DISCOVER</span><h3>Find the film.</h3><p>Search the archive, explore a genre, or follow a recommendation.</p></div>
          <div className="rr-step"><span className="rr-step-num">02 / CHOOSE</span><h3>Make it yours.</h3><p>Pick a disc or digital platform, then choose to buy or rent.</p></div>
          <div className="rr-step"><span className="rr-step-num">03 / ENJOY</span><h3>Settle in.</h3><p>Review your demo order and keep your cinema shelf in one place.</p></div>
        </div>
      </div>
    </section>
    <section className="rr-section compact"><div className="rr-wrap"><div className="rr-promo"><div><span className="rr-eyebrow">The second look</span><h2>Great films deserve a second viewing.</h2></div><button className="rr-button" onClick={() => navigate("browse")}>Find your film <ArrowRight size={15}/></button></div></div></section>
    <section className="rr-section compact"><div className="rr-wrap"><div className="rr-section-head"><div><span className="rr-eyebrow">A short reel</span><h2 className="rr-section-title rr-display">Twelve seconds. Your next movie night.</h2></div><button className="rr-text-link" onClick={() => { navigate("ad"); setAdSecond(0); setAdPlaying(true); setAdKey((key) => key + 1); }}>Watch the REELROOM ad <Play size={13}/></button></div><button className="rr-button secondary small" onClick={() => { navigate("ad"); setAdSecond(0); setAdPlaying(true); setAdKey((key) => key + 1); }}>Play 12-second preview <Play size={13}/></button></div></section>
  </main>;

  const renderCatalog = () => {
    const pageTitle = view === "physical" ? "Physical cinema" : view === "digital" ? "Digital cinema" : view === "watchlist" ? "Your watchlist" : "The film archive";
    const list = view === "watchlist" ? filteredMovies.filter((movie) => watchlist.includes(movie.id)) : filteredMovies;
    return <main className="rr-wrap">
      <div className="rr-page-head"><span className="rr-eyebrow">{view === "watchlist" ? "Saved for later" : "Curated cinema archive"}</span><h1>{pageTitle}</h1><p>{view === "physical" ? "Find a film for the shelf, the cinema room, or a good old-fashioned movie night. Availability is demonstration data." : view === "digital" ? "Compare example digital options by platform. No viewing rights or third-party purchases are provided here." : view === "watchlist" ? "A personal shortlist of films worth coming back to." : "A considered collection across genres, decades, and the many ways to watch."}</p></div>
      {view === "watchlist" ? <section className="rr-section compact">{watchlist.length === 0 ? <div className="rr-empty"><Heart size={25}/><h2>Your next favorite belongs here.</h2><p>Save films while browsing and they will wait right here for you.</p><button className="rr-button" onClick={() => navigate("browse")}>Explore movies <ArrowRight size={14}/></button></div> : movieGrid(list, "four")}</section> : <>
        <div className="rr-catalog-toolbar">
          <label className="rr-search"><Search size={17}/><input id="catalog-search" className="rr-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, directors, genres…" aria-label="Search films"/></label>
          <label><span className="rr-filter-label">Sort by</span><select className="rr-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort movies"><option>Featured</option><option>Title A–Z</option><option>Newest</option><option>Oldest</option><option>Price: low to high</option></select></label>
        </div>
        <div className="rr-filters">
          <label className="rr-filter"><span className="rr-filter-label">Genre</span><select className="rr-select" value={genre} onChange={(event) => setGenre(event.target.value)}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="rr-filter"><span className="rr-filter-label">Decade</span><select className="rr-select" value={decade} onChange={(event) => setDecade(event.target.value)}><option>All decades</option>{[1960,1970,1980,1990,2000,2010,2020].map((year) => <option key={year}>{year}s</option>)}</select></label>
          <label className="rr-filter"><span className="rr-filter-label">Format</span><select className="rr-select" value={format} onChange={(event) => setFormat(event.target.value)}><option>Any format</option><option>DVD</option><option>Blu-ray</option><option>4K Ultra HD</option><option>Digital</option></select></label>
          <label className="rr-filter"><span className="rr-filter-label">Experience</span><select className="rr-select" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option>Any mode</option><option>Buy</option><option>Rent</option><option>Physical</option><option>Digital</option></select></label>
          <label className="rr-filter"><span className="rr-filter-label">Starting price</span><select className="rr-select" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}><option>Any price</option><option value="2">Under 2 KWD</option><option value="4">Under 4 KWD</option><option value="7">Under 7 KWD</option><option value="10">Under 10 KWD</option></select></label>
        </div>
        <div className="rr-results-line"><span>{list.length} films in this frame</span><button className="rr-text-link" onClick={resetFilters}>Clear filters <RotateCcw size={12}/></button></div>
        {movieGrid(list, "six")}
      </>}
      <div style={{ padding: "30px 0 55px" }}><p className="rr-demo-note">Catalog availability, format options, platform listings, and every KWD amount are illustrative demonstration data—not verified retailer inventory or streaming rights.</p></div>
    </main>;
  };

  const renderDetails = () => {
    const options = experience === "Physical" ? ["DVD", "Blu-ray", "4K Ultra HD"] : selectedMovie.platforms;
    const setOption = (option: string) => { setSelectedOption(option); setAdded(false); };
    const priceText = typeof itemPrice === "number" ? itemPrice : Number(itemPrice);
    return <main>
      <div className="rr-wrap" style={{ paddingTop: 22 }}><button className="rr-text-link" onClick={() => navigate("browse")}><ArrowLeft size={14}/> Back to movies</button></div>
      <section className="rr-detail-hero"><div className="rr-wrap rr-detail-grid">
        <div className="rr-detail-poster"><Poster movie={selectedMovie} onClick={() => {}} saved={watchlist.includes(selectedMovie.id)} onFavorite={() => toggleFavorite(selectedMovie.id)}/></div>
        <div className="rr-detail-copy">
          <span className="rr-eyebrow">The REELROOM archive</span><h1>{selectedMovie.title}</h1>
          <div className="rr-meta-line"><span>{selectedMovie.year}</span><span>{selectedMovie.genre}</span><span>{selectedMovie.runtime} min</span></div>
          <p className="rr-synopsis">{selectedMovie.synopsis}</p>
          <p className="rr-detail-director">DIRECTED BY <strong>{selectedMovie.director}</strong></p>
          <div className="rr-divider"/>
          <div className="rr-demo-note">All availability and prices below are demonstration examples. No real retailer inventory, licensed streaming access, or payments.</div>
        </div>
        <div className="rr-option-panel">
          <span className="rr-eyebrow">Choose your experience</span><h3>How do you want it?</h3>
          <div className="rr-choice-row">
            <button className={`rr-choice ${experience === "Physical" ? "active" : ""}`} onClick={() => setExperienceMode("Physical")}><strong>PHYSICAL</strong><span>Own or rent a disc</span></button>
            <button className={`rr-choice ${experience === "Digital" ? "active" : ""}`} onClick={() => setExperienceMode("Digital")}><strong>DIGITAL</strong><span>Choose a platform</span></button>
          </div>
          <span className="rr-field-label">Select buy or rent</span>
          <div className="rr-choice-row">
            <button className={`rr-choice ${buyMode === "Buy" ? "active" : ""}`} onClick={() => setMode("Buy")}><strong>BUY</strong><span>{experience === "Physical" ? "Keep on your shelf" : "Demo ownership"}</span></button>
            <button className={`rr-choice ${buyMode === "Rent" ? "active" : ""}`} onClick={() => setMode("Rent")}><strong>RENT</strong><span>{experience === "Physical" ? "7 days" : "30 days to start"}</span></button>
          </div>
          <span className="rr-field-label">{experience === "Physical" ? "Choose a disc format" : "Choose a demo platform"}</span>
          <div className="rr-choice-list">
            {options.map((option) => {
              const platformBase = ({ "Apple TV": 2.5, "Amazon Prime Video": 2.9, "Google TV": 2.3, "YouTube Movies": 2.2 } as Record<string, number>)[option] ?? 2.5;
              const optionPrice = experience === "Physical" ? PHYSICAL_PRICE[buyMode][option] : Number((platformBase * (buyMode === "Buy" ? 3.2 : 1)).toFixed(3));
              return <button key={option} className={`rr-choice ${selectedOption === option ? "active" : ""}`} onClick={() => setOption(option)}><span><strong>{option}</strong><span>{experience === "Physical" ? (option === "DVD" ? "Standard definition" : option === "Blu-ray" ? "High definition" : "Ultra high definition") : `${buyMode} · demo listing`}</span></span><span className="rr-selection-price">{money(optionPrice)}</span></button>;
            })}
          </div>
          {buyMode === "Rent" && <p className="rr-rental-note">{experience === "Physical" ? "7-day disc rental. Return date will be shown on your demo order." : "Example terms: 30 days to begin, 48 hours to finish after playback starts."}</p>}
          {experience === "Physical" && buyMode === "Buy" && <><span className="rr-field-label">Quantity</span><div className="rr-quantity"><button aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus size={13}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity((current) => Math.min(12, current + 1))}><Plus size={13}/></button></div></>}
          <div className="rr-summary"><span><small>{selectedMovie.title} · {buyMode.toLowerCase()} · {experience === "Physical" ? selectedOption : selectedOption}</small><strong>{money(priceText * (experience === "Physical" && buyMode === "Buy" ? quantity : 1))}</strong></span><span className="rr-tags">{buyMode === "Rent" ? "RENTAL" : "DEMO PRICE"}</span></div>
          <button className="rr-button" style={{ width: "100%", marginTop: 14 }} onClick={addToCart}><ShoppingBag size={15}/> Add to cart</button>
          {added && <p className="rr-added" role="status"><Check size={13}/> Added. Your cart is ready when you are.</p>}
        </div>
      </div></section>
      <section className="rr-section compact"><div className="rr-wrap"><div className="rr-section-head"><div><span className="rr-eyebrow">Keep the evening going</span><h2 className="rr-section-title rr-display">You might also like.</h2></div><button className="rr-text-link" onClick={() => navigate("browse")}>Full archive <ArrowRight size={13}/></button></div>{movieGrid(MOVIES.filter((movie) => movie.id !== selectedMovie.id).slice(0,4), "four")}</div></section>
    </main>;
  };

  const renderCart = () => <main className="rr-wrap">
    <div className="rr-page-head"><span className="rr-eyebrow">A good evening, in progress</span><h1>Your cart</h1><p>Review your selections. Every item and price is part of this demonstration storefront only.</p></div>
    <section className="rr-section compact">
      {cart.length === 0 ? <div className="rr-empty"><ShoppingCart size={28}/><h2>Your cart is taking a quiet moment.</h2><p>Find a film to own, rent, or save for the next movie night.</p><button className="rr-button" onClick={() => navigate("browse")}>Browse the archive <ArrowRight size={14}/></button></div> :
        <div className="rr-cart-layout">
          <div>{cart.map((item) => {
            const movie = movieFor(item.movieId);
            return <div className="rr-cart-item" key={item.key}>
              <div className="rr-poster" style={{ "--poster-bg": `linear-gradient(148deg,${movie.palette[0]},#11181c 78%)`, "--poster-glow": movie.palette[1] } as CSSProperties}><div className="rr-poster-art"/><span className="rr-poster-title">{movie.title}</span></div>
              <div><h3 className="rr-cart-name">{movie.title}</h3><p className="rr-cart-desc">{item.experience} · {item.mode} · {item.option}</p><p className="rr-cart-desc">{item.rental}</p>{item.experience === "Physical" && item.mode === "Buy" && <div className="rr-quantity" style={{ marginTop: 8 }}><button aria-label={`Decrease ${movie.title} quantity`} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={12}/></button><span>{item.quantity}</span><button aria-label={`Increase ${movie.title} quantity`} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={12}/></button></div>}</div>
              <strong className="rr-price rr-cart-price">{money(item.price * item.quantity)}</strong>
              <button className="rr-icon-btn" aria-label={`Remove ${movie.title}`} onClick={() => removeCartItem(item.key)}><Trash2 size={16}/></button>
            </div>;
          })}</div>
          <aside className="rr-cart-aside"><h3>Order summary</h3><div className="rr-total-line"><span>Items ({cartCount})</span><span>{money(cartTotal)}</span></div><div className="rr-total-line"><span>Delivery</span><span>{cart.some((item) => item.experience === "Physical") ? "At checkout" : "Digital · demo"}</span></div><div className="rr-total-line total"><span>Estimated total</span><span>{money(cartTotal)}</span></div><p className="rr-demo-note" style={{ margin: "14px 0" }}>Demo checkout only. No payment will be collected.</p><button className="rr-button" style={{ width: "100%" }} onClick={() => navigate("checkout")}>Continue to demo checkout <ArrowRight size={14}/></button><button className="rr-text-link" style={{ marginTop: 12 }} onClick={() => navigate("browse")}>Continue exploring</button></aside>
        </div>}
    </section>
  </main>;

  const renderCheckout = () => {
    if (confirmedOrder) return <main className="rr-wrap"><section className="rr-section"><div className="rr-confirm"><div className="rr-confirm-icon"><Check size={28}/></div><span className="rr-eyebrow" style={{ justifyContent: "center" }}>Demo order confirmed</span><h1>That’s a wrap.</h1><div className="rr-order-num">{confirmedOrder.id}</div><p>Thanks, {confirmedOrder.customer}. This order is saved in your REELROOM demo library. No payment was processed and no licensed movie access is included.</p><div className="rr-order-card"><h3>Order details</h3>{confirmedOrder.items.map((item) => <div key={item.key} className="rr-order-row"><span>{movieFor(item.movieId).title} · {item.experience} {item.mode} · {item.option}<br/><small>{item.mode === "Rent" ? item.rental : confirmedOrder.fulfillment}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="rr-order-row"><strong>Total · example</strong><strong>{money(confirmedOrder.total)}</strong></div></div><button className="rr-button" onClick={() => navigate("library")}>View my library <ArrowRight size={14}/></button></div></section></main>;
    return <main className="rr-wrap">
      <div className="rr-page-head"><span className="rr-eyebrow">No real money, just the movie-night feeling</span><h1>Demo checkout</h1><p>Review the order, add contact details, and create a saved demonstration order. Nothing will be charged.</p></div>
      <div className="rr-checkout-steps"><span className={`rr-checkout-step ${checkoutStep === 1 ? "active" : ""}`}>01 &nbsp; Review order</span><span className={`rr-checkout-step ${checkoutStep === 2 ? "active" : ""}`}>02 &nbsp; Your details</span><span className={`rr-checkout-step ${checkoutStep === 3 ? "active" : ""}`}>03 &nbsp; Confirmation</span></div>
      {cart.length === 0 ? <div className="rr-empty"><ShoppingBag size={25}/><h2>Nothing to check out yet.</h2><p>Your cart is empty. Pick a film first, then return here.</p><button className="rr-button" onClick={() => navigate("browse")}>Find a film</button></div> :
      checkoutStep === 1 ? <div className="rr-cart-layout"><div className="rr-cart-aside" style={{ background: "transparent" }}><h3>Review your selection</h3>{cart.map((item) => <div className="rr-order-row" key={item.key}><span>{movieFor(item.movieId).title}<br/><small>{item.experience} · {item.mode} · {item.option} · Qty {item.quantity}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="rr-order-row"><strong>Estimated total</strong><strong>{money(cartTotal)}</strong></div></div><aside className="rr-cart-aside"><h3>Before we continue</h3><p style={{ color: "#9aa4ad", fontSize: 11 }}>Physical selections use a delivery or pickup preference. Digital platform selections are recorded as your demo preference only.</p><div className="rr-divider"/><p className="rr-demo-note">Demonstration checkout · no payment processing · no streaming rights.</p><button className="rr-button" style={{ width: "100%", marginTop: 16 }} onClick={() => { setCheckoutStep(2); setCheckoutErrors({}); }}>Add your details <ArrowRight size={14}/></button></aside></div> :
        <form className="rr-form" onSubmit={submitOrder} noValidate>
          <div className="rr-cart-layout"><div className="rr-cart-aside" style={{ background: "transparent" }}><h3>Contact and fulfillment</h3><div className="rr-form-grid">
            <label>Full name<input className="rr-input" value={checkoutData.name} onChange={(event) => setCheckoutData({ ...checkoutData, name: event.target.value })} autoComplete="name"/>{checkoutErrors.name && <span className="rr-error">{checkoutErrors.name}</span>}</label>
            <label>Email address<input className="rr-input" type="email" value={checkoutData.email} onChange={(event) => setCheckoutData({ ...checkoutData, email: event.target.value })} autoComplete="email"/>{checkoutErrors.email && <span className="rr-error">{checkoutErrors.email}</span>}</label>
            <label>Contact number<input className="rr-input" type="tel" value={checkoutData.phone} onChange={(event) => setCheckoutData({ ...checkoutData, phone: event.target.value })} autoComplete="tel"/>{checkoutErrors.phone && <span className="rr-error">{checkoutErrors.phone}</span>}</label>
            {cart.some((item) => item.experience === "Physical") && <label>Physical order preference<select className="rr-select" value={checkoutData.fulfillment} onChange={(event) => setCheckoutData({ ...checkoutData, fulfillment: event.target.value })}><option>Delivery</option><option>Pickup</option></select></label>}
            {cart.some((item) => item.experience === "Physical") && checkoutData.fulfillment === "Delivery" && <label style={{ gridColumn: "1 / -1" }}>Delivery address in Kuwait<textarea className="rr-textarea" rows={3} value={checkoutData.address} onChange={(event) => setCheckoutData({ ...checkoutData, address: event.target.value })} placeholder="Area, block, street, building, apartment"/>{checkoutErrors.address && <span className="rr-error">{checkoutErrors.address}</span>}</label>}
          </div><label style={{ marginTop: 14 }}>Order note (optional)<textarea className="rr-textarea" rows={2} value={checkoutData.note} onChange={(event) => setCheckoutData({ ...checkoutData, note: event.target.value })} placeholder="Anything we should know?"/></label></div>
          <aside className="rr-cart-aside"><h3>Demo summary</h3><div className="rr-total-line"><span>Items</span><span>{cartCount}</span></div><div className="rr-total-line"><span>Payment</span><span>Not collected</span></div><div className="rr-total-line total"><span>Total · example</span><span>{money(cartTotal)}</span></div><p className="rr-demo-note" style={{ marginTop: 14 }}>Continue will create a local demo order, clear this cart, and add an order record to My Library.</p><button className="rr-button" style={{ width: "100%", marginTop: 14 }} type="submit">Confirm demo order <Check size={14}/></button><button className="rr-text-link" type="button" onClick={() => setCheckoutStep(1)}><ArrowLeft size={13}/> Back to review</button></aside></div>
        </form>}
    </main>;
  };

  const renderLibrary = () => <main className="rr-wrap">
    <div className="rr-page-head"><span className="rr-eyebrow">Your REELROOM shelf</span><h1>My library & orders</h1><p>Your saved demonstration orders, rentals, and preferences live here on this device.</p></div>
    <section className="rr-section compact">{orders.length === 0 ? <div className="rr-empty"><Clapperboard size={28}/><h2>Your library is waiting for its first reel.</h2><p>Place a demo order and your movie-night history will appear here.</p><button className="rr-button" onClick={() => navigate("browse")}>Browse movies <ArrowRight size={14}/></button></div> : <div className="rr-order-list">{orders.map((order) => <article className="rr-cart-aside" key={order.id} style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}><div><span className="rr-eyebrow">{order.id}</span><h3 style={{ marginTop: 8 }}>{order.date} · {order.customer}</h3></div><strong className="rr-price">{money(order.total)}</strong></div><div className="rr-divider"/>{order.items.map((item) => <div className="rr-order-row" key={item.key}><span>{movieFor(item.movieId).title} · {item.experience} {item.mode} · {item.option}<br/><small>{item.mode === "Rent" ? item.rental : item.experience === "Physical" ? `${order.fulfillment} · demo` : "Digital preference · no access granted"}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}</article>)}</div>}</section>
  </main>;

  const renderAbout = () => <main className="rr-wrap">
    <div className="rr-page-head"><span className="rr-eyebrow">A note from the projection booth</span><h1>One film. Every way to watch it.</h1><p>REELROOM is a curated cinema archive for people who care about what they watch—and how they keep it.</p></div>
    <section className="rr-section"><div className="rr-story"><div><span className="rr-eyebrow">The idea</span><h2>Less hunting.<br/>More settling in.</h2><p>Finding a favorite film should feel like browsing a thoughtfully kept collection, not opening another endless storefront. REELROOM brings disc formats and digital platform options into one simple, considered view.</p><p>Choose a physical edition for the shelf or a digital platform preference for the evening. The experience is designed around the film, then gets out of the way.</p><button className="rr-button" style={{ marginTop: 19 }} onClick={() => navigate("browse")}>Explore the archive <ArrowRight size={14}/></button></div><div className="rr-brand-spec"><span className="rr-eyebrow">Brand & design</span><div className="rr-spec-row"><strong>Personality</strong><span>Cinematic · Curated · Effortless</span></div><div className="rr-spec-row"><strong>Mark</strong><span>An original R held inside a restrained film frame.</span></div><div className="rr-spec-row"><strong>Palette</strong><span>Cinema Black anchors the room; Reel Green is the clear signal. Film Orange is saved for selected highlights.</span></div><div className="rr-spec-row"><strong>Type</strong><span>Space Grotesk for confident film titles; Inter for readable, quiet utility.</span></div><div className="rr-spec-row"><strong>Principle</strong><span>Poster-first discovery. No clutter between you and the next film.</span></div></div></div></section>
    <section className="rr-section compact"><div className="rr-promo"><div><span className="rr-eyebrow">How the demo works</span><h2>Availability and prices are examples—not offers.</h2></div><button className="rr-button secondary" onClick={() => navigate("contact")}>Ask us a question <ArrowRight size={14}/></button></div></section>
  </main>;

  const renderContact = () => <main className="rr-wrap">
    <div className="rr-page-head"><span className="rr-eyebrow">The line is open</span><h1>Contact REELROOM</h1><p>Questions about a film, a format, or the prototype? Send a note and we’ll make sure it lands in the right place.</p></div>
    <section className="rr-section"><div className="rr-contact-layout"><div className="rr-contact-info"><span className="rr-eyebrow">Say hello</span><h2>Good conversations deserve a proper ending.</h2><p>This prototype does not send messages to a live support team. Submit the form to see the validation and confirmation flow.</p><div className="rr-contact-detail">KUWAIT CITY<br/><span style={{ color: "#9aa4ad" }}>A cinema archive, made for movie lovers.</span></div><div className="rr-contact-detail">Typical reply<br/><span style={{ color: "#9aa4ad" }}>Within one movie night (demo copy).</span></div></div>
      <div>{contactSent && <div className="rr-demo-note" role="status" style={{ marginBottom: 16, borderColor: "#00E054" }}>Your message is ready. Thanks for reaching out to REELROOM.</div>}<form className="rr-form" onSubmit={submitContact} noValidate>
        <label>Your name<input className="rr-input" name="name" placeholder="Name" autoComplete="name"/>{contactErrors.name && <span className="rr-error">{contactErrors.name}</span>}</label>
        <label>Email address<input className="rr-input" name="email" type="email" placeholder="you@example.com" autoComplete="email"/>{contactErrors.email && <span className="rr-error">{contactErrors.email}</span>}</label>
        <label>What’s on your mind?<textarea className="rr-textarea" name="message" rows={5} placeholder="Tell us a little about it…"/>{contactErrors.message && <span className="rr-error">{contactErrors.message}</span>}</label>
        <button className="rr-button" type="submit">Send a note <ArrowRight size={14}/></button>
      </form></div></div></section>
  </main>;

  const adStage = adSecond < 2 ? { label: "01 / HOOK", headline: <>MOVIE NIGHT?<br/><em>MAKE IT YOURS.</em></>, body: "A familiar question. An entirely yours kind of answer." }
    : adSecond < 4 ? { label: "02 / PRODUCT", headline: <>BUY IT.<br/>RENT IT.<br/><em>LOVE IT.</em></>, body: "Physical cinema and digital options, together in one room." }
    : adSecond < 7 ? { label: "03 / BENEFIT", headline: <>YOUR FILMS.<br/><em>YOUR FORMAT.</em></>, body: adSecond === 4 ? "DVD." : adSecond === 5 ? "Blu-ray. 4K Ultra HD." : "Or choose a digital platform preference." }
    : adSecond < 9 ? { label: "04 / BRAND", headline: <>REELROOM<em>.</em></>, body: "Every Film. Your Way." }
    : { label: "05 / CTA", headline: <>FIND YOUR<br/><em>NEXT FAVORITE.</em></>, body: "Your next movie night is waiting." };
  const renderAd = () => <main className={`rr-ad ${adPlaying ? "rr-ad-playing" : ""}`} key={adKey}>
    <div className="rr-ad-bg"/><div className="rr-ad-shade"/>
    <div className="rr-ad-inner">
      <div className="rr-ad-copy"><span className="rr-ad-stage">{adStage.label} · 12 SECOND REEL</span><h1 key={adStage.label}>{adStage.headline}</h1><p>{adStage.body}</p>{adSecond >= 9 && <button className="rr-button" style={{ marginTop: 22 }} onClick={() => navigate("browse")}>Explore REELROOM <ArrowRight size={14}/></button>}{adSecond >= 7 && adSecond < 9 && <div style={{ marginTop: 17 }}><Logo onClick={() => navigate("home")}/></div>}</div>
      <div className="rr-ad-visual" aria-hidden="true">{[MOVIES[4], MOVIES[1], MOVIES[12]].map((movie) => <div className="rr-ad-poster" key={movie.id}><div className="rr-poster" style={{ "--poster-bg": `linear-gradient(148deg,${movie.palette[0]},#11181c 78%)`, "--poster-glow": movie.palette[1] } as CSSProperties}><div className="rr-poster-art"/><span className="rr-poster-title">{movie.title}</span><span className="rr-poster-year">{movie.year} · REELROOM ARCHIVE</span></div></div>)}</div>
    </div>
    <div className="rr-ad-controls"><span>{String(Math.min(adSecond, 12)).padStart(2, "0")} / 12</span><div className="rr-ad-track"><div className="rr-ad-progress" style={{ width: `${Math.min(adSecond / 12 * 100, 100)}%` }}/></div><button aria-label={adPlaying ? "Pause advertisement" : "Play advertisement"} onClick={() => { if (adSecond >= 12) { setAdSecond(0); setAdKey((key) => key + 1); setAdPlaying(true); } else setAdPlaying((playing) => !playing); }}>{adSecond >= 12 ? <RotateCcw size={15}/> : adPlaying ? <span style={{ fontSize: 11 }}>Ⅱ</span> : <Play size={14}/>}</button>{adSecond >= 12 && <button aria-label="Replay advertisement" onClick={() => { setAdSecond(0); setAdKey((key) => key + 1); setAdPlaying(true); }}><RotateCcw size={14}/></button>}</div>
  </main>;

  const renderFooter = () => <footer className="rr-footer"><div className="rr-wrap"><div className="rr-footer-top">
    <div className="rr-footer-brand"><Logo onClick={() => navigate("home")}/><p>A curated cinema archive. Every film, your way. Made for movie lovers in Kuwait and wherever the credits roll.</p></div>
    <div className="rr-footer-col"><h4>Explore</h4><button onClick={() => navigate("browse")}>All movies</button><button onClick={() => navigate("physical")}>Physical cinema</button><button onClick={() => navigate("digital")}>Digital cinema</button><button onClick={() => navigate("watchlist")}>Watchlist</button></div>
    <div className="rr-footer-col"><h4>REELROOM</h4><button onClick={() => navigate("about")}>About & how it works</button><button onClick={() => navigate("contact")}>Contact</button><button onClick={() => navigate("ad")}>12-second brand reel</button><button onClick={() => navigate("library")}>My library</button></div>
    <div className="rr-footer-col"><h4>A clear note</h4><p style={{ marginTop: 0 }}>This is a demonstration storefront. Prices and availability are examples. No payments or streaming rights are provided.</p><span style={{ color: "#00E054", fontSize: 10, display: "block", marginTop: 14 }}>Kuwait · KWD</span></div>
  </div><div className="rr-footer-bottom"><span>© 2025 REELROOM · Every Film. Your Way.</span><span>Original cinema, considered carefully.</span></div></div></footer>;

  const content = view === "home" ? renderHome()
    : view === "browse" || view === "physical" || view === "digital" || view === "watchlist" ? renderCatalog()
    : view === "details" ? renderDetails()
    : view === "cart" ? renderCart()
    : view === "checkout" ? renderCheckout()
    : view === "library" ? renderLibrary()
    : view === "about" ? renderAbout()
    : view === "contact" ? renderContact()
    : renderAd();

  return <div className="reelroom">
    {renderNav()}
    {content}
    {view !== "ad" && renderFooter()}
    <div className="rr-toast-stack" aria-live="polite" aria-atomic="true">{toast && <div className="rr-toast"><CheckCircle2 size={18}/>{toast}</div>}</div>
  </div>;
}
