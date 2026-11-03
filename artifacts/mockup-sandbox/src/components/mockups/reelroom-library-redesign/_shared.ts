export type LibraryMovie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  director: string;
  synopsis: string;
  poster: string;
  palette: [string, string];
};

export type LibraryEntry = {
  order: { id: string; date: string; fulfillment: string };
  item: {
    key: string;
    movieId: string;
    experience: "Physical" | "Digital";
    mode: "Buy" | "Rent";
    option: string;
    quantity: number;
    rental: string;
  };
  movie: LibraryMovie;
};

export const LIBRARY_MOVIES: LibraryMovie[] = [
  {
    id: "dune-part-two",
    title: "Dune: Part Two",
    year: 2024,
    genre: "Sci-Fi",
    director: "Denis Villeneuve",
    synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge and trying to prevent a future only he can foresee.",
    poster: "/__mockup/images/reelroom-dune-part-two.jpg",
    palette: ["#3b281b", "#e1aa65"],
  },
  {
    id: "interstellar",
    title: "Interstellar",
    year: 2014,
    genre: "Sci-Fi",
    director: "Christopher Nolan",
    synopsis: "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",
    poster: "/__mockup/images/reelroom-interstellar.jpg",
    palette: ["#101f27", "#9ba97f"],
  },
  {
    id: "blade-runner-2049",
    title: "Blade Runner 2049",
    year: 2017,
    genre: "Sci-Fi",
    director: "Denis Villeneuve",
    synopsis: "A new blade runner uncovers a long-buried secret that could unsettle what remains of society.",
    poster: "/__mockup/images/reelroom-blade-runner-2049.jpg",
    palette: ["#311d25", "#d7804e"],
  },
  {
    id: "godfather",
    title: "The Godfather",
    year: 1972,
    genre: "Crime",
    director: "Francis Ford Coppola",
    synopsis: "The aging patriarch of a crime dynasty passes control to his reluctant son.",
    poster: "/__mockup/images/reelroom-godfather.jpg",
    palette: ["#241a18", "#b18654"],
  },
];

export const LIBRARY_ENTRIES: LibraryEntry[] = [
  {
    order: { id: "RR-2026-014", date: "04 Nov 2026", fulfillment: "Delivery" },
    item: { key: "dune-4k", movieId: "dune-part-two", experience: "Physical", mode: "Buy", option: "4K Ultra HD", quantity: 1, rental: "" },
    movie: LIBRARY_MOVIES[0],
  },
  {
    order: { id: "RR-2026-019", date: "08 Nov 2026", fulfillment: "Digital" },
    item: { key: "dune-digital", movieId: "dune-part-two", experience: "Digital", mode: "Buy", option: "Apple TV", quantity: 1, rental: "" },
    movie: LIBRARY_MOVIES[0],
  },
  {
    order: { id: "RR-2026-022", date: "12 Nov 2026", fulfillment: "Delivery" },
    item: { key: "interstellar-bluray", movieId: "interstellar", experience: "Physical", mode: "Buy", option: "Blu-ray", quantity: 1, rental: "" },
    movie: LIBRARY_MOVIES[1],
  },
  {
    order: { id: "RR-2026-026", date: "15 Nov 2026", fulfillment: "Digital" },
    item: { key: "blade-rental", movieId: "blade-runner-2049", experience: "Digital", mode: "Rent", option: "Apple TV", quantity: 1, rental: "7-day rental · return by 22 Nov 2026" },
    movie: LIBRARY_MOVIES[2],
  },
  {
    order: { id: "RR-2026-031", date: "18 Nov 2026", fulfillment: "Pickup" },
    item: { key: "godfather-dvd", movieId: "godfather", experience: "Physical", mode: "Buy", option: "DVD", quantity: 1, rental: "" },
    movie: LIBRARY_MOVIES[3],
  },
];
