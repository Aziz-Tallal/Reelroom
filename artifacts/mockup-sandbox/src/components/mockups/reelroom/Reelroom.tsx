import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Check, CheckCircle2,
  Clapperboard, Film, Heart, Menu, Minus, Play, Plus, RotateCcw, Search,
  ShoppingBag, ShoppingCart, Trash2, X,
} from "lucide-react";
import "./_group.css";
import "./Reelroom.css";

type Movie = {
  id: string; title: string; year: number; genre: string; runtime: number;
  director: string; synopsis: string; palette: [string, string]; platforms: string[];
  posterExt?: string; sourcePage?: string;
};
type View = "home" | "browse" | "physical" | "digital" | "details" | "watchlist" | "cart" | "checkout" | "library" | "about" | "contact" | "ad";
type Collection = "All films" | "Digital only" | "Physical only" | "Top 100" | "Academy Award films";
type ClassicSeed = [id: string, title: string, year: number, genre: string, runtime: number, director: string, synopsis: string, wikiSlug: string, posterExt: string];
const COLLECTIONS: Collection[] = ["All films", "Digital only", "Physical only", "Top 100", "Academy Award films"];
type CartLine = {
  key: string; movieId: string; experience: "Physical" | "Digital"; mode: "Buy" | "Rent";
  option: string; price: number; quantity: number; rental: string;
};
type DemoOrder = { id: string; date: string; customer: string; total: number; items: CartLine[]; fulfillment: string };
type CheckoutData = { name: string; email: string; phone: string; fulfillment: string; address: string; note: string };
type CriterionFilm = { title: string; poster: string; source: string };

const BASE_MOVIES: Movie[] = [
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

const CLASSIC_PALETTES: [string, string][] = [
  ["#272322", "#d6ad6f"], ["#202628", "#b7c0bb"], ["#30252b", "#d38f66"],
  ["#2c2821", "#c9aa70"], ["#1d2b2a", "#9cae97"], ["#332b25", "#d18c58"],
  ["#252932", "#a4aeb4"], ["#302c26", "#cbb18c"], ["#22262b", "#9dabb0"],
  ["#2f2424", "#c78d78"],
];

const CLASSIC_ROWS: ClassicSeed[] = [
  ["metropolis", "Metropolis", 1927, "Sci-Fi", 153, "Fritz Lang", "A worker and a ruling-class heir cross paths in a city built above and below ground.", "Metropolis_(1927_film)", "jpg"],
  ["nosferatu", "Nosferatu", 1922, "Horror", 94, "F. W. Murnau", "A real-estate agent travels to Transylvania and encounters Count Orlok, a figure of quiet dread.", "Nosferatu_(1922_film)", "jpg"],
  ["cabinet-of-dr-caligari", "The Cabinet of Dr. Caligari", 1920, "Horror", 76, "Robert Wiene", "A traveling hypnotist's show draws a young man into a tale of murder, sleepwalking, and madness.", "The_Cabinet_of_Dr._Caligari", "jpg"],
  ["the-kid", "The Kid", 1921, "Comedy", 68, "Charlie Chaplin", "A tramp and an abandoned child form a fragile family while trying to stay ahead of hardship.", "The_Kid_(1921_film)", "jpg"],
  ["the-general", "The General", 1926, "Comedy", 79, "Buster Keaton & Clyde Bruckman", "A locomotive engineer races to recover his stolen train and rescue his fiancée during the Civil War.", "The_General_(1926_film)", "png"],
  ["safety-last", "Safety Last!", 1923, "Comedy", 73, "Fred C. Newmeyer & Sam Taylor", "A young window cleaner risks a daring climb up a department store to impress the woman he loves.", "Safety_Last%21", "jpg"],
  ["sherlock-jr", "Sherlock Jr.", 1924, "Comedy", 45, "Buster Keaton", "A screen-struck projectionist finds himself inside a movie, where the rules of the frame keep changing.", "Sherlock_Jr.", "jpg"],
  ["the-gold-rush", "The Gold Rush", 1925, "Comedy", 95, "Charlie Chaplin", "A lone prospector braves the Yukon and finds companionship, appetite, and comic misfortune.", "The_Gold_Rush", "jpg"],
  ["battleship-potemkin", "Battleship Potemkin", 1925, "Drama", 75, "Sergei Eisenstein", "A mutiny aboard a battleship becomes a rallying cry for a city on the edge of revolt.", "Battleship_Potemkin", "jpg"],
  ["passion-of-joan-of-arc", "The Passion of Joan of Arc", 1928, "Drama", 82, "Carl Theodor Dreyer", "A young woman faces an inquisitorial trial while a cleric fights to save her from execution.", "The_Passion_of_Joan_of_Arc", "png"],
  ["deer-hunter", "The Deer Hunter", 1978, "Drama", 183, "Michael Cimino", "Three friends return from Vietnam; the war's long aftermath strains loyalty and everyday life.", "The_Deer_Hunter", "jpg"],
  ["city-lights", "City Lights", 1931, "Comedy", 87, "Charlie Chaplin", "The Little Tramp tries to help a blind flower seller and make a better future possible.", "City_Lights", "jpg"],
  ["maltese-falcon", "The Maltese Falcon", 1941, "Crime", 100, "John Huston", "A private detective is hired by a woman whose search for her sister opens a trail of murder.", "The_Maltese_Falcon_(1941_film)", "jpg"],
  ["sound-of-music", "The Sound of Music", 1965, "Musical", 174, "Robert Wise", "A postulant leaves the convent to care for a widower's seven children in Austria.", "The_Sound_of_Music", "jpg"],
  ["bridge-on-the-river-kwai", "The Bridge on the River Kwai", 1957, "War", 161, "David Lean", "A captured British colonel must resist his commandant without endangering the prisoners in his care.", "The_Bridge_on_the_River_Kwai", "jpg"],
  ["stagecoach", "Stagecoach", 1939, "Western", 96, "John Ford", "Passengers with very different pasts cross Apache territory together on a stagecoach bound for Lordsburg.", "Stagecoach_(1939_film)", "jpg"],
  ["best-years-of-our-lives", "The Best Years of Our Lives", 1946, "Drama", 170, "William Wyler", "Three veterans return home after the war and try to find their place in lives that have changed.", "The_Best_Years_of_Our_Lives", "jpg"],
  ["wizard-of-oz", "The Wizard of Oz", 1939, "Adventure", 102, "Victor Fleming", "A farmhand and a young woman follow a yellow-brick road through a land of strange companions.", "The_Wizard_of_Oz_(1939_film)", "jpg"],
  ["grapes-of-wrath", "The Grapes of Wrath", 1940, "Drama", 129, "John Ford", "A tenant farmer's family migrates west during the Dust Bowl, searching for work and dignity.", "The_Grapes_of_Wrath_(film)", "jpg"],
  ["citizen-kane", "Citizen Kane", 1941, "Drama", 119, "Orson Welles", "A reporter investigates the last word of a newspaper magnate whose history remains elusive.", "Citizen_Kane", "jpg"],
  ["casablanca", "Casablanca", 1942, "Romance", 102, "Michael Curtiz", "A nightclub owner in wartime Casablanca chooses between private love and a larger cause.", "Casablanca_(film)", "jpg"],
  ["double-indemnity", "Double Indemnity", 1944, "Crime", 107, "Billy Wilder", "An insurance salesman and a client's wife plot a murder designed to look like an accident.", "Double_Indemnity", "jpg"],
  ["lost-weekend", "The Lost Weekend", 1945, "Drama", 101, "Billy Wilder", "A writer's alcohol dependence turns a New York weekend into an increasingly desperate search.", "The_Lost_Weekend", "jpg"],
  ["its-a-wonderful-life", "It's a Wonderful Life", 1946, "Drama", 130, "Frank Capra", "A despairing banker learns how deeply his quiet acts have shaped the people in his town.", "It%27s_a_Wonderful_Life", "jpeg"],
  ["bicycle-thieves", "Bicycle Thieves", 1948, "Drama", 89, "Vittorio De Sica", "A laborer and his son search postwar Rome for the bicycle he needs to keep his job.", "Bicycle_Thieves", "jpg"],
  ["third-man", "The Third Man", 1949, "Thriller", 104, "Carol Reed", "A small-time writer hunts for the truth behind a friend's death in postwar Vienna.", "The_Third_Man", "jpg"],
  ["all-about-eve", "All About Eve", 1950, "Drama", 138, "Joseph L. Mankiewicz", "A Broadway starlet works her way into an actress's circle and begins to upset its balance.", "All_About_Eve", "jpg"],
  ["night-of-the-hunter", "The Night of the Hunter", 1955, "Thriller", 93, "Charles Laughton", "A traveling preacher brings a dark fairy tale to a mother and her children on the run.", "The_Night_of_the_Hunter", "jpg"],
  ["rashomon", "Rashomon", 1950, "Drama", 88, "Akira Kurosawa", "Four witnesses recount one incident from conflicting perspectives, leaving truth unsettled.", "Rashomon", "jpg"],
  ["singin-in-the-rain", "Singin' in the Rain", 1952, "Musical", 103, "Gene Kelly & Stanley Donen", "A movie star and a young actor turn the industry's transition to sound into a musical comedy.", "Singin%27_in_the_Rain", "jpg"],
  ["tokyo-story", "Tokyo Story", 1953, "Drama", 136, "Yasujirō Ozu", "An aging couple travels to Tokyo to see their adult children and discovers a generational distance.", "Tokyo_Story", "jpg"],
  ["roman-holiday", "Roman Holiday", 1953, "Romance", 118, "William Wyler", "A princess slips away from official duties for one day of anonymous freedom in Rome.", "Roman_Holiday", "jpg"],
  ["seven-samurai", "Seven Samurai", 1954, "Adventure", 207, "Akira Kurosawa", "A village under threat asks seven samurai to plan its defense against a band of raiders.", "Seven_Samurai", "png"],
  ["rear-window", "Rear Window", 1954, "Thriller", 112, "Alfred Hitchcock", "A photographer's convalescence turns his courtyard into a window onto the lives around him.", "Rear_Window", "jpg"],
  ["12-angry-men", "12 Angry Men", 1957, "Drama", 96, "Sidney Lumet", "A jury's private doubts deepen as twelve men debate a murder case in a single room.", "12_Angry_Men_(1957_film)", "jpg"],
  ["vertigo", "Vertigo", 1958, "Thriller", 128, "Alfred Hitchcock", "A retired detective's return to work becomes entangled with a woman who echoes his past.", "Vertigo_(film)", "jpg"],
  ["some-like-it-hot", "Some Like It Hot", 1959, "Comedy", 121, "Billy Wilder", "Two musicians flee a Chicago gang by taking new identities in an all-women's band.", "Some_Like_It_Hot", "png"],
  ["the-apartment", "The Apartment", 1960, "Romance", 125, "Billy Wilder", "An office clerk lends his apartment to executives until one evening changes the arrangement.", "The_Apartment", "jpg"],
  ["lawrence-of-arabia", "Lawrence of Arabia", 1962, "Adventure", 222, "David Lean", "A British officer joins an Arab revolt in a story of allegiance, ambition, and self-invention.", "Lawrence_of_Arabia_(film)", "jpg"],
  ["to-kill-a-mockingbird", "To Kill a Mockingbird", 1962, "Drama", 129, "Robert Mulligan", "A lawyer's daughter watches a small-town trial and the difficult adult choices surrounding it.", "To_Kill_a_Mockingbird_(film)", "jpg"],
  ["8-1-2", "8½", 1963, "Drama", 138, "Federico Fellini", "A film director struggles with his next work as memory, fantasy, and the present begin to mingle.", "8%C2%BD", "jpg"],
  ["dr-strangelove", "Dr. Strangelove", 1964, "Comedy", 95, "Stanley Kubrick", "A rare missile threatens the world while a room of officials tries to prevent catastrophe.", "Dr._Strangelove", "jpg"],
  ["good-bad-ugly", "The Good, the Bad and the Ugly", 1966, "Western", 178, "Sergio Leone", "Three gunslingers race across a war-torn frontier in search of buried gold.", "The_Good,_the_Bad_and_the_Ugly", "jpg"],
  ["graduate", "The Graduate", 1967, "Comedy", 106, "Mike Nichols", "A recent college graduate returns home unsure of the future and forms an unexpected connection.", "The_Graduate", "jpg"],
  ["french-connection", "The French Connection", 1971, "Crime", 104, "William Friedkin", "Two New York detectives follow a narcotics trail through an increasingly tense investigation.", "The_French_Connection_(film)", "jpg"],
  ["chinatown", "Chinatown", 1974, "Crime", 130, "Roman Polanski", "A private investigator enters a Los Angeles water scandal whose reach is greater than it first appears.", "Chinatown_(1974_film)", "jpg"],
  ["one-flew-over-cuckoos-nest", "One Flew Over the Cuckoo's Nest", 1975, "Drama", 133, "Miloš Forman", "A rebellious new patient tests the rigid routines of a psychiatric hospital and its residents.", "One_Flew_Over_the_Cuckoo%27s_Nest_(film)", "jpg"],
  ["all-presidents-men", "All the President's Men", 1976, "Thriller", 138, "Alan J. Pakula", "Two journalists trace a political burglary toward the White House and the story it concealed.", "All_the_President%27s_Men_(film)", "jpg"],
  ["raging-bull", "Raging Bull", 1980, "Drama", 129, "Martin Scorsese", "A middleweight boxer looks back on his career and the relationships shaped by his own temper.", "Raging_Bull", "jpg"],
  ["cinema-paradiso", "Cinema Paradiso", 1988, "Drama", 124, "Giuseppe Tornatore", "A filmmaker remembers the small Sicilian cinema where a projectionist first opened the world to him.", "Cinema_Paradiso", "jpg"],
  ["sunrise", "Sunrise: A Song of Two Humans", 1927, "Romance", 94, "F. W. Murnau", "A farmer is pulled between the quiet life he knows and a city woman's promise of escape.", "Sunrise:_A_Song_of_Two_Humans", "jpg"],
  ["last-laugh", "The Last Laugh", 1924, "Drama", 90, "F. W. Murnau", "A proud hotel doorman faces a sudden loss of status and the fragile kindness of a city.", "The_Last_Laugh_(1924_film)", "png"],
  ["jazz-singer", "The Jazz Singer", 1927, "Musical", 89, "Alan Crosland", "A young performer follows his musical ambition while balancing family expectation and tradition.", "The_Jazz_Singer_(1927_film)", "jpg"],
  ["the-39-steps", "The 39 Steps", 1935, "Thriller", 86, "Alfred Hitchcock", "An ordinary visitor becomes a fugitive after a chance encounter draws him into an espionage plot.", "The_39_Steps_(1935_film)", "jpg"],
  ["frankenstein", "Frankenstein", 1931, "Horror", 70, "James Whale", "A scientist's experiment gives life to a misunderstood creature and unleashes a chain of fear.", "Frankenstein_(1931_film)", "jpg"],
  ["dracula-1931", "Dracula", 1931, "Horror", 75, "Tod Browning", "A mysterious count arrives in England, bringing an old-world menace into a modern household.", "Dracula_(1931_English-language_film)", "jpg"],
  ["king-kong", "King Kong", 1933, "Adventure", 100, "Merian C. Cooper & Ernest B. Schoedsack", "A film crew travels to a remote island and brings its legendary giant back to New York.", "King_Kong_(1933_film)", "jpg"],
  ["it-happened-one-night", "It Happened One Night", 1934, "Romance", 105, "Frank Capra", "A runaway heiress and a reporter share an unexpected road trip across the country.", "It_Happened_One_Night", "jpg"],
  ["modern-times", "Modern Times", 1936, "Comedy", 87, "Charlie Chaplin", "A factory worker and an orphan try to find a little security in a city built for speed.", "Modern_Times_(film)", "jpg"],
  ["red-shoes", "The Red Shoes", 1948, "Drama", 133, "Michael Powell & Emeric Pressburger", "A young dancer is torn between a demanding company and the life she hopes to make beyond it.", "The_Red_Shoes_(1948_film)", "jpg"],
  ["rebecca", "Rebecca", 1940, "Drama", 130, "Alfred Hitchcock", "A new bride enters a grand estate where the memory of her husband's first wife still holds power.", "Rebecca_(1940_film)", "jpeg"],
  ["philadelphia-story", "The Philadelphia Story", 1940, "Comedy", 112, "George Cukor", "A society wedding brings a bride, her former husband, and a pair of reporters into one room.", "The_Philadelphia_Story_(film)", "jpg"],
  ["treasure-sierra-madre", "The Treasure of the Sierra Madre", 1948, "Adventure", 126, "John Huston", "Three prospectors head into the mountains, where an uncertain fortune tests their trust.", "The_Treasure_of_the_Sierra_Madre_(film)", "jpg"],
  ["sunset-boulevard", "Sunset Boulevard", 1950, "Drama", 110, "Billy Wilder", "A screenwriter accepts an unusual job from a former star who refuses to leave the spotlight.", "Sunset_Boulevard_(film)", "jpg"],
  ["high-noon", "High Noon", 1952, "Western", 85, "Fred Zinnemann", "A marshal prepares to face a returning outlaw while the town weighs its own courage.", "High_Noon", "jpg"],
  ["on-waterfront", "On the Waterfront", 1954, "Crime", 108, "Elia Kazan", "A dockworker considers speaking out against the organization that controls his waterfront.", "On_the_Waterfront", "jpg"],
  ["searchers", "The Searchers", 1956, "Western", 119, "John Ford", "A veteran and his companion search the frontier for a missing member of their family.", "The_Searchers_(film)", "jpg"],
  ["paths-of-glory", "Paths of Glory", 1957, "War", 88, "Stanley Kubrick", "A French colonel confronts the machinery of command after a costly battlefield order.", "Paths_of_Glory", "jpg"],
  ["touch-of-evil", "Touch of Evil", 1958, "Crime", 111, "Orson Welles", "A border investigation becomes a contest of power between a visiting officer and a local detective.", "Touch_of_Evil", "jpg"],
  ["400-blows", "The 400 Blows", 1959, "Drama", 99, "François Truffaut", "A restless Parisian boy looks for understanding as school and home feel increasingly distant.", "The_400_Blows", "jpg"],
  ["psycho", "Psycho", 1960, "Horror", 109, "Alfred Hitchcock", "A stop at a roadside motel sets off a mystery that reshapes the lives of its guests.", "Psycho_(1960_film)", "jpg"],
  ["la-dolce-vita", "La Dolce Vita", 1960, "Drama", 174, "Federico Fellini", "A journalist moves through Rome's glittering nights in search of a life that feels meaningful.", "La_Dolce_Vita", "jpg"],
  ["battle-of-algiers", "The Battle of Algiers", 1966, "Drama", 121, "Gillo Pontecorvo", "A city and its residents are changed by a struggle for independence and the forces sent to contain it.", "The_Battle_of_Algiers", "jpg"],
  ["bonnie-and-clyde", "Bonnie and Clyde", 1967, "Crime", 111, "Arthur Penn", "Two young outsiders become national fugitives as their robberies turn into a public spectacle.", "Bonnie_and_Clyde_(film)", "jpg"],
  ["godfather-part-ii", "The Godfather Part II", 1974, "Crime", 202, "Francis Ford Coppola", "Two generations of a family business unfold across New York and a changing American West.", "The_Godfather_Part_II", "jpg"],
  ["jaws", "Jaws", 1975, "Thriller", 124, "Steven Spielberg", "A local police chief, a marine biologist, and a seasoned captain search for danger offshore.", "Jaws_(film)", "jpg"],
  ["taxi-driver", "Taxi Driver", 1976, "Drama", 114, "Martin Scorsese", "A night-shift cab driver watches a changing city from behind the wheel and struggles to find a place in it.", "Taxi_Driver", "jpg"],
  ["alien", "Alien", 1979, "Sci-Fi", 117, "Ridley Scott", "A commercial crew answers a distant signal and discovers something aboard their ship.", "Alien_(film)", "jpg"],
  ["apocalypse-now", "Apocalypse Now", 1979, "War", 147, "Francis Ford Coppola", "A river journey into wartime Cambodia becomes a search for a renegade officer.", "Apocalypse_Now", "jpg"],
  ["blade-runner", "Blade Runner", 1982, "Sci-Fi", 117, "Ridley Scott", "A detective in a rain-lit future is assigned to track down a group of escaped artificial beings.", "Blade_Runner", "png"],
  ["amadeus", "Amadeus", 1984, "Drama", 160, "Miloš Forman", "A celebrated court composer looks back on his rivalry with a young musical prodigy.", "Amadeus_(film)", "jpg"],
  ["do-the-right-thing", "Do the Right Thing", 1989, "Drama", 120, "Spike Lee", "On a hot Brooklyn day, neighbors, workers, and a local business contend with rising tension.", "Do_the_Right_Thing", "png"],
];

const CLASSIC_MOVIES: Movie[] = CLASSIC_ROWS.map(([id, title, year, genre, runtime, director, synopsis, wikiSlug, posterExt], index) => ({
  id, title, year, genre, runtime, director, synopsis, posterExt,
  palette: CLASSIC_PALETTES[index % CLASSIC_PALETTES.length],
  platforms: [],
  sourcePage: `https://en.wikipedia.org/wiki/${wikiSlug}`,
}));
const MOVIES: Movie[] = [...BASE_MOVIES, ...CLASSIC_MOVIES].slice(0, 100);

const ACADEMY_AWARD_IDS = new Set([
  "interstellar", "blade-runner-2049", "dark-knight", "grand-budapest", "dune-part-two",
  "whiplash", "parasite", "spirited-away", "godfather", "pulp-fiction", "oppenheimer",
  "everything-everywhere", "sound-of-music", "bridge-on-the-river-kwai", "stagecoach",
  "best-years-of-our-lives", "wizard-of-oz", "grapes-of-wrath", "citizen-kane", "casablanca",
  "lost-weekend", "bicycle-thieves", "all-about-eve", "rashomon", "roman-holiday",
  "the-apartment", "lawrence-of-arabia", "to-kill-a-mockingbird", "graduate",
  "french-connection", "chinatown", "one-flew-over-cuckoos-nest", "all-presidents-men",
  "raging-bull", "cinema-paradiso", "deer-hunter", "sunrise", "it-happened-one-night",
  "rebecca", "philadelphia-story", "treasure-sierra-madre", "sunset-boulevard",
  "high-noon", "on-waterfront", "godfather-part-ii", "jaws", "alien", "amadeus",
]);

const CRITERION_FILMS: CriterionFilm[] = [
  { title: "The 39 Steps", poster: "/__mockup/images/reelroom-criterion-the-39-steps.jpg", source: "https://www.criterion.com/films/234-the-39-steps" },
  { title: "The 400 Blows", poster: "/__mockup/images/reelroom-criterion-the-400-blows.jpg", source: "https://www.criterion.com/films/151-the-400-blows" },
  { title: "Alexander Nevsky", poster: "/__mockup/images/reelroom-criterion-alexander-nevsky.jpg", source: "https://www.criterion.com/films/341-alexander-nevsky" },
  { title: "Ashes and Diamonds", poster: "/__mockup/images/reelroom-criterion-ashes-and-diamonds.jpg", source: "https://www.criterion.com/films/342-ashes-and-diamonds" },
  { title: "Ballad of a Soldier", poster: "/__mockup/images/reelroom-criterion-ballad-of-a-soldier.jpg", source: "https://www.criterion.com/films/343-ballad-of-a-soldier" },
  { title: "Beauty and the Beast", poster: "/__mockup/images/reelroom-criterion-beauty-and-the-beast.jpg", source: "https://www.criterion.com/films/177-beauty-and-the-beast" },
  { title: "Black Orpheus", poster: "/__mockup/images/reelroom-criterion-black-orpheus.jpg", source: "https://www.criterion.com/films/344-black-orpheus" },
  { title: "Brief Encounter", poster: "/__mockup/images/reelroom-criterion-brief-encounter.jpg", source: "https://www.criterion.com/films/345-brief-encounter" },
  { title: "The Fallen Idol", poster: "/__mockup/images/reelroom-criterion-the-fallen-idol.jpg", source: "https://www.criterion.com/films/346-the-fallen-idol" },
  { title: "Fires on the Plain", poster: "/__mockup/images/reelroom-criterion-fires-on-the-plain.jpg", source: "https://www.criterion.com/films/347-fires-on-the-plain" },
  { title: "Fists in the Pocket", poster: "/__mockup/images/reelroom-criterion-fists-in-the-pocket.jpg", source: "https://www.criterion.com/films/348-fists-in-the-pocket" },
  { title: "Floating Weeds", poster: "/__mockup/images/reelroom-criterion-floating-weeds.jpg", source: "https://www.criterion.com/films/349-floating-weeds" },
  { title: "Forbidden Games", poster: "/__mockup/images/reelroom-criterion-forbidden-games.jpg", source: "https://www.criterion.com/films/350-forbidden-games" },
  { title: "Grand Illusion", poster: "/__mockup/images/reelroom-criterion-grand-illusion.jpg", source: "https://www.criterion.com/films/351-grand-illusion" },
  { title: "Häxan", poster: "/__mockup/images/reelroom-criterion-haxan.jpg", source: "https://www.criterion.com/films/352-haxan" },
  { title: "Ikiru", poster: "/__mockup/images/reelroom-criterion-ikiru.jpg", source: "https://www.criterion.com/films/353-ikiru" },
  { title: "Il posto", poster: "/__mockup/images/reelroom-criterion-il-posto.jpg", source: "https://www.criterion.com/films/364-il-posto" },
  { title: "The Importance of Being Earnest", poster: "/__mockup/images/reelroom-criterion-the-importance-of-being-earnest.jpg", source: "https://www.criterion.com/films/355-the-importance-of-being-earnest" },
  { title: "Ivan the Terrible, Part II", poster: "/__mockup/images/reelroom-criterion-ivan-the-terrible-part-ii.jpg", source: "https://www.criterion.com/films/354-ivan-the-terrible-part-ii" },
  { title: "Le jour se lève", poster: "/__mockup/images/reelroom-criterion-le-jour-se-leve.jpg", source: "https://www.criterion.com/films/356-le-jour-se-leve" },
  { title: "Jules and Jim", poster: "/__mockup/images/reelroom-criterion-jules-and-jim.jpg", source: "https://www.criterion.com/films/218-jules-and-jim" },
  { title: "Kind Hearts and Coronets", poster: "/__mockup/images/reelroom-criterion-kind-hearts-and-coronets.jpg", source: "https://www.criterion.com/films/357-kind-hearts-and-coronets" },
  { title: "Knife in the Water", poster: "/__mockup/images/reelroom-criterion-knife-in-the-water.jpg", source: "https://www.criterion.com/films/219-knife-in-the-water" },
  { title: "The Lady Vanishes", poster: "/__mockup/images/reelroom-criterion-the-lady-vanishes.jpg", source: "https://www.criterion.com/films/358-the-lady-vanishes" },
  { title: "The Life and Death of Colonel Blimp", poster: "/__mockup/images/reelroom-criterion-the-life-and-death-of-colonel-blimp.jpg", source: "https://www.criterion.com/films/359-the-life-and-death-of-colonel-blimp" },
  { title: "Loves of a Blonde", poster: "/__mockup/images/reelroom-criterion-loves-of-a-blonde.jpg", source: "https://www.criterion.com/films/246-loves-of-a-blonde" },
  { title: "L’avventura", poster: "/__mockup/images/reelroom-criterion-l-avventura.jpg", source: "https://www.criterion.com/films/209-l-avventura" },
  { title: "M", poster: "/__mockup/images/reelroom-criterion-m.jpg", source: "https://www.criterion.com/films/558-m" },
  { title: "Monsieur Hulot’s Holiday", poster: "/__mockup/images/reelroom-criterion-monsieur-hulot-s-holiday.jpg", source: "https://www.criterion.com/films/360-monsieur-hulot-s-holiday" },
  { title: "Miss Julie", poster: "/__mockup/images/reelroom-criterion-miss-julie.jpg", source: "https://www.criterion.com/films/361-miss-julie" },
  { title: "Pandora’s Box", poster: "/__mockup/images/reelroom-criterion-pandora-s-box.jpg", source: "https://www.criterion.com/films/362-pandora-s-box" },
  { title: "Pépé le moko", poster: "/__mockup/images/reelroom-criterion-pepe-le-moko.jpg", source: "https://www.criterion.com/films/363-pepe-le-moko" },
  { title: "Pygmalion", poster: "/__mockup/images/reelroom-criterion-pygmalion.jpg", source: "https://www.criterion.com/films/365-pygmalion" },
  { title: "Rashomon", poster: "/__mockup/images/reelroom-criterion-rashomon.jpg", source: "https://www.criterion.com/films/307-rashomon" },
  { title: "Richard III", poster: "/__mockup/images/reelroom-criterion-richard-iii.jpg", source: "https://www.criterion.com/films/366-richard-iii" },
  { title: "The Rules of the Game", poster: "/__mockup/images/reelroom-criterion-the-rules-of-the-game.jpg", source: "https://www.criterion.com/films/295-the-rules-of-the-game" },
  { title: "Seven Samurai", poster: "/__mockup/images/reelroom-criterion-seven-samurai.jpg", source: "https://www.criterion.com/films/165-seven-samurai" },
  { title: "The Seventh Seal", poster: "/__mockup/images/reelroom-criterion-the-seventh-seal.jpg", source: "https://www.criterion.com/films/173-the-seventh-seal" },
  { title: "The Spirit of the Beehive", poster: "/__mockup/images/reelroom-criterion-the-spirit-of-the-beehive.jpg", source: "https://www.criterion.com/films/367-the-spirit-of-the-beehive" },
  { title: "La strada", poster: "/__mockup/images/reelroom-criterion-la-strada.jpg", source: "https://www.criterion.com/films/185-la-strada" },
  { title: "Summertime", poster: "/__mockup/images/reelroom-criterion-summertime.jpg", source: "https://www.criterion.com/films/368-summertime" },
  { title: "The Third Man", poster: "/__mockup/images/reelroom-criterion-the-third-man.jpg", source: "https://www.criterion.com/films/236-the-third-man" },
  { title: "Three Documentaries", poster: "/__mockup/images/reelroom-criterion-three-documentaries.jpg", source: "https://www.criterion.com/films/1079-three-documentaries" },
  { title: "Ugetsu", poster: "/__mockup/images/reelroom-criterion-ugetsu.jpg", source: "https://www.criterion.com/films/369-ugetsu" },
  { title: "Umberto D.", poster: "/__mockup/images/reelroom-criterion-umberto-d.jpg", source: "https://www.criterion.com/films/371-umberto-d" },
  { title: "The Virgin Spring", poster: "/__mockup/images/reelroom-criterion-the-virgin-spring.jpg", source: "https://www.criterion.com/films/372-the-virgin-spring" },
  { title: "Viridiana", poster: "/__mockup/images/reelroom-criterion-viridiana.jpg", source: "https://www.criterion.com/films/373-viridiana" },
  { title: "The Wages of Fear", poster: "/__mockup/images/reelroom-criterion-the-wages-of-fear.jpg", source: "https://www.criterion.com/films/370-the-wages-of-fear" },
  { title: "The White Sheik", poster: "/__mockup/images/reelroom-criterion-the-white-sheik.jpg", source: "https://www.criterion.com/films/374-the-white-sheik" },
  { title: "Wild Strawberries", poster: "/__mockup/images/reelroom-criterion-wild-strawberries.jpg", source: "https://www.criterion.com/films/175-wild-strawberries" },
];

const HERO_POSTERS = [
  { movieId: "interstellar", image: "/__mockup/images/reelroom-interstellar.jpg", source: "https://en.wikipedia.org/wiki/Interstellar_(film)" },
  { movieId: "dune-part-two", image: "/__mockup/images/reelroom-dune-part-two.jpg", source: "https://en.wikipedia.org/wiki/Dune:_Part_Two" },
  { movieId: "blade-runner-2049", image: "/__mockup/images/reelroom-blade-runner-2049.jpg", source: "https://en.wikipedia.org/wiki/Blade_Runner_2049" },
  { movieId: "oppenheimer", image: "/__mockup/images/reelroom-oppenheimer.jpg", source: "https://en.wikipedia.org/wiki/Oppenheimer_(film)" },
  { movieId: "parasite", image: "/__mockup/images/reelroom-parasite.jpg", source: "https://en.wikipedia.org/wiki/Parasite_(2019_film)" },
  { movieId: "godfather", image: "/__mockup/images/reelroom-godfather.jpg", source: "https://en.wikipedia.org/wiki/The_Godfather" },
] as const;
const POSTER_SOURCES: Record<string, string> = {
  interstellar: "https://en.wikipedia.org/wiki/Interstellar_(film)",
  "blade-runner-2049": "https://en.wikipedia.org/wiki/Blade_Runner_2049",
  "dark-knight": "https://en.wikipedia.org/wiki/The_Dark_Knight",
  "grand-budapest": "https://en.wikipedia.org/wiki/The_Grand_Budapest_Hotel",
  "dune-part-two": "https://en.wikipedia.org/wiki/Dune:_Part_Two",
  "the-shining": "https://en.wikipedia.org/wiki/The_Shining_(film)",
  whiplash: "https://en.wikipedia.org/wiki/Whiplash_(2014_film)",
  parasite: "https://en.wikipedia.org/wiki/Parasite_(2019_film)",
  inception: "https://en.wikipedia.org/wiki/Inception",
  "2001": "https://en.wikipedia.org/wiki/2001:_A_Space_Odyssey_(film)",
  godfather: "https://en.wikipedia.org/wiki/The_Godfather",
  "pulp-fiction": "https://en.wikipedia.org/wiki/Pulp_Fiction",
  "spirited-away": "https://en.wikipedia.org/wiki/Spirited_Away",
  "the-batman": "https://en.wikipedia.org/wiki/The_Batman_(film)",
  oppenheimer: "https://en.wikipedia.org/wiki/Oppenheimer_(film)",
  "everything-everywhere": "https://en.wikipedia.org/wiki/Everything_Everywhere_All_at_Once",
  "portrait-lady": "https://en.wikipedia.org/wiki/Portrait_of_a_Lady_on_Fire",
  "before-sunrise": "https://en.wikipedia.org/wiki/Before_Sunrise",
  ...Object.fromEntries(CLASSIC_MOVIES.map((movie) => [movie.id, movie.sourcePage ?? "https://en.wikipedia.org/wiki/Film"])),
  "sound-of-music": "https://commons.wikimedia.org/wiki/File:Sound_of_music.jpg",
};

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

function GravityField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    type Star = {
      x: number; y: number; vx: number; vy: number; driftX: number; driftY: number;
      size: number; depth: number; phase: number; tint: number;
    };
    type GeometryMark = {
      x: number; y: number; radius: number; depth: number; angle: number;
      sides: number; tint: number; ring: boolean;
    };
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionPreference.matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let geometryMarks: GeometryMark[] = [];
    let frame = 0;
    let intersecting = true;
    let pointerActive = false;
    let pointerX = 0;
    let pointerY = 0;
    let disposed = false;
    let seed = 93017;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const paint = (time: number, animate: boolean) => {
      if (!width || !height || disposed) return;
      context.clearRect(0, 0, width, height);

      if (animate) {
        for (const star of stars) {
          if (pointerActive) {
            const dx = pointerX - star.x;
            const dy = pointerY - star.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            if (distance < 210) {
              const pull = (1 - distance / 210) * 0.075 * star.depth;
              star.vx += (dx / distance) * pull;
              star.vy += (dy / distance) * pull;
            }
          }
          star.vx *= 0.94;
          star.vy *= 0.94;
          star.x += star.driftX + star.vx;
          star.y += star.driftY + star.vy;
          if (star.x < 0) star.x += width;
          if (star.x > width) star.x -= width;
          if (star.y < 0) star.y += height;
          if (star.y > height) star.y -= height;
        }
      }

      const linkDistance = 132;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < linkDistance) {
            context.strokeStyle = `rgba(177, 218, 200, ${(1 - distance / linkDistance) * 0.11})`;
            context.lineWidth = 0.55;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      for (const mark of geometryMarks) {
        const dx = mark.x - pointerX;
        const dy = mark.y - pointerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const proximity = pointerActive ? Math.max(0, 1 - distance / 360) : 0;
        const repel = !reduceMotion ? proximity * mark.depth * 18 : 0;
        const x = mark.x + (dx / distance) * repel;
        const y = mark.y + (dy / distance) * repel;
        const radius = mark.radius * (1 + (!reduceMotion ? proximity * 0.08 : 0));
        const rgb = mark.tint < 0.48 ? "69, 155, 229" : "0, 224, 84";
        const opacity = 0.11 + mark.depth * 0.12 + proximity * 0.13;

        context.save();
        context.translate(x, y);
        context.rotate(mark.angle + (animate ? time * 0.000035 * mark.depth : 0));
        context.strokeStyle = `rgba(${rgb}, ${opacity})`;
        context.lineWidth = mark.depth > 0.72 ? 0.9 : 0.65;
        context.beginPath();
        for (let side = 0; side < mark.sides; side++) {
          const angle = (Math.PI * 2 * side) / mark.sides - Math.PI / 2;
          const pointX = Math.cos(angle) * radius;
          const pointY = Math.sin(angle) * radius;
          if (side === 0) context.moveTo(pointX, pointY);
          else context.lineTo(pointX, pointY);
        }
        context.closePath();
        context.stroke();
        if (mark.ring) {
          context.beginPath();
          context.arc(0, 0, radius * 0.52, 0, Math.PI * 2);
          context.strokeStyle = `rgba(${rgb}, ${opacity * 0.72})`;
          context.stroke();
        } else {
          context.beginPath();
          context.moveTo(-radius * 0.28, 0);
          context.lineTo(radius * 0.28, 0);
          context.moveTo(0, -radius * 0.28);
          context.lineTo(0, radius * 0.28);
          context.strokeStyle = `rgba(${rgb}, ${opacity * 0.58})`;
          context.stroke();
        }
        context.restore();
      }

      for (const star of stars) {
        const shimmer = reduceMotion ? 0.78 : 0.55 + Math.sin(time * 0.0007 + star.phase) * 0.25;
        const opacity = Math.min(0.88, shimmer * (0.34 + star.depth * 0.52));
        const rgb = star.tint < 0.13 ? "0, 224, 84" : star.tint < 0.24 ? "69, 155, 229" : star.tint < 0.34 ? "230, 190, 137" : "225, 234, 232";
        context.fillStyle = `rgba(${rgb}, ${opacity})`;
        context.beginPath();
        context.arc(star.x, star.y, star.size * (0.6 + star.depth * 0.8), 0, Math.PI * 2);
        context.fill();
      }
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const oldWidth = width || rect.width;
      const oldHeight = height || rect.height;
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!stars.length) {
        const count = width < 720 ? 96 : 176;
        stars = Array.from({ length: count }, () => {
          const depth = random() ** 1.5;
          const drift = random() * Math.PI * 2;
          return {
            x: random() * width, y: random() * height, vx: 0, vy: 0,
            driftX: Math.cos(drift) * 0.045, driftY: Math.sin(drift) * 0.045,
            size: 0.45 + random() * 0.65, depth, phase: random() * Math.PI * 2, tint: random(),
          };
        });
        const geometryCount = width < 720 ? 12 : 26;
        geometryMarks = Array.from({ length: geometryCount }, () => ({
          x: width * (0.43 + random() * 0.57),
          y: random() * height,
          radius: 9 + random() * 26,
          depth: 0.3 + random() * 0.7,
          angle: random() * Math.PI,
          sides: 3 + Math.floor(random() * 4),
          tint: random(),
          ring: random() > 0.58,
        }));
      } else {
        for (const star of stars) {
          star.x *= width / oldWidth;
          star.y *= height / oldHeight;
        }
        for (const mark of geometryMarks) {
          mark.x *= width / oldWidth;
          mark.y *= height / oldHeight;
        }
      }
      paint(performance.now(), false);
    };

    const tick = (time: number) => {
      frame = 0;
      if (disposed || reduceMotion || !intersecting || document.visibilityState !== "visible") return;
      paint(time, true);
      frame = window.requestAnimationFrame(tick);
    };

    const syncMotion = () => {
      const shouldAnimate = !disposed && !reduceMotion && intersecting && document.visibilityState === "visible";
      if (shouldAnimate && !frame) frame = window.requestAnimationFrame(tick);
      if (!shouldAnimate && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        paint(performance.now(), false);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerActive = pointerX >= 0 && pointerX <= width && pointerY >= 0 && pointerY <= height;
      if (reduceMotion) paint(performance.now(), false);
    };
    const clearPointer = () => {
      pointerActive = false;
      if (reduceMotion) paint(performance.now(), false);
    };
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      syncMotion();
    };
    const handleVisibility = () => syncMotion();
    const intersectionObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
        intersecting = entries.some((entry) => entry.isIntersecting);
        syncMotion();
      });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);

    resize();
    resizeObserver?.observe(host);
    intersectionObserver?.observe(host);
    host.addEventListener("pointermove", handlePointerMove, { passive: true });
    host.addEventListener("pointerleave", clearPointer);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionChange);
    syncMotion();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", clearPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return <div className="rr-hero-stars" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

function Logo({ onClick }: { onClick: () => void }) {
  return <button className="rr-brand" onClick={onClick} aria-label="REELROOM home" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}>
    <svg className="rr-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M5 4.5h26v27H5z" fill="none" stroke="#00E054" strokeWidth="1.5"/>
      <path d="M10 27V9h8.1c4 0 6.2 1.9 6.2 5 0 2.5-1.4 4.1-3.9 4.7L26 27h-5.4l-4.9-7.8h-1.1V27zm4.6-11.6h3.2c1.3 0 2-.5 2-1.5s-.7-1.5-2-1.5h-3.2z" fill="#F2F4F6"/>
      <path d="M2 10V2h8M26 2h8v8M34 26v8h-8M10 34H2v-8" fill="none" stroke="var(--rr-blue)" strokeWidth="1"/>
    </svg>
    <span><span className="rr-wordmark">REELROOM</span><span className="rr-tagline">Every Film. Your Way.</span></span>
  </button>;
}

function Poster({ movie, onClick, saved, onFavorite }: { movie: Movie; onClick: () => void; saved: boolean; onFavorite: () => void }) {
  return <div className="rr-poster" role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }} style={{ "--poster-bg": `linear-gradient(148deg, ${movie.palette[0]}, #11181c 78%)`, "--poster-glow": movie.palette[1] } as CSSProperties} aria-label={`View ${movie.title} details`}>
    <img className="rr-poster-image" src={`/__mockup/images/reelroom-${movie.id}.${movie.posterExt ?? "jpg"}`} alt={`${movie.title} theatrical poster`} loading="lazy" onError={(event) => event.currentTarget.classList.add("poster-error")}/>
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
  const availability = movie.platforms.length ? "Disc · Digital" : "Physical only";
  return <article className="rr-movie-card">
    <Poster movie={movie} onClick={onDetails} saved={saved} onFavorite={onFavorite}/>
    <div className="rr-movie-info">
      <h3 className="rr-movie-title">{movie.title}</h3>
      <div className="rr-movie-sub">{movie.year} <span aria-hidden="true">·</span> {movie.genre} <span aria-hidden="true">·</span> {movie.runtime} min</div>
      <div className="rr-movie-bottom"><span className="rr-price">From {money(base)} <small>demo</small></span><span className="rr-tags">{availability}{ACADEMY_AWARD_IDS.has(movie.id) ? " · Academy award" : ""}</span></div>
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
  const [collection, setCollection] = useState<Collection>("All films");
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
      if (!movie.platforms.length) return Number.POSITIVE_INFINITY;
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
    if (view !== "home") return;
    const hero = document.querySelector<HTMLElement>(".rr-hero");
    if (!hero) return;

    const posters = Array.from(hero.querySelectorAll<HTMLElement>(".rr-hero-poster"));
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const updateScrollDrift = () => {
      animationFrame = 0;
      const scrollDistance = Math.max(0, window.scrollY);

      posters.forEach((poster, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const strength = 0.014 + (index % 3) * 0.003;
        const offset = motionPreference.matches
          ? 0
          : Math.max(-12, Math.min(12, scrollDistance * strength * direction));
        poster.style.setProperty("--poster-scroll-y", `${offset.toFixed(2)}px`);
      });
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateScrollDrift);
    };
    const handleMotionChange = () => scheduleUpdate();

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    motionPreference.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      motionPreference.removeEventListener("change", handleMotionChange);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      posters.forEach((poster) => poster.style.removeProperty("--poster-scroll-y"));
    };
  }, [view]);
  useEffect(() => {
    if (!adPlaying) return;
    const timer = window.setInterval(() => setAdSecond((current) => {
      if (current >= 11) { setAdPlaying(false); return 12; }
      return current + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [adPlaying, adKey]);

  const navigate = (next: View) => {
    if (next !== "details") setCollection("All films");
    setView(next);
    setMobileOpen(false);
    setAdded(false);
    if (next === "checkout") { setCheckoutStep(1); setCheckoutErrors({}); setConfirmedOrder(null); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const navigateCollection = (next: Collection) => {
    navigate("browse");
    setCollection(next);
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
    if (view === "digital") result = result.filter((movie) => movie.platforms.length);
    if (collection === "Digital only") result = result.filter((movie) => movie.platforms.length > 0);
    if (collection === "Physical only") result = result.filter((movie) => movie.platforms.length === 0);
    if (collection === "Academy Award films") result = result.filter((movie) => ACADEMY_AWARD_IDS.has(movie.id));
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
  }, [view, collection, genre, decade, search, format, modeFilter, maxPrice, sort]);

  const itemPrice = experience === "Physical"
    ? PHYSICAL_PRICE[buyMode][selectedOption]
    : Number((({ "Apple TV": 2.5, "Amazon Prime Video": 2.9, "Google TV": 2.3, "YouTube Movies": 2.2 } as Record<string, number>)[selectedOption] ?? 2.5) * (buyMode === "Buy" ? 3.2 : 1)).toFixed(3);
  const rental = experience === "Physical" ? "7-day rental · return by the date shown at checkout" : "30-day viewing window · 48 hours to finish once started";
  const setMode = (mode: "Buy" | "Rent") => { setBuyMode(mode); setAdded(false); };
  const setExperienceMode = (kind: "Physical" | "Digital") => {
    if (kind === "Digital" && selectedMovie.platforms.length === 0) return;
    setExperience(kind); setSelectedOption(kind === "Physical" ? "Blu-ray" : (selectedMovie.platforms[0] ?? "Apple TV")); setAdded(false);
  };
  const addToCart = () => {
    if (experience === "Digital" && selectedMovie.platforms.length === 0) {
      setToast("This title has no digital listing in the demo");
      return;
    }
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
  const resetFilters = () => { setCollection("All films"); setSearch(""); setGenre("All genres"); setDecade("All decades"); setFormat("Any format"); setModeFilter("Any mode"); setMaxPrice("Any price"); setSort("Featured"); };

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
  const homeCollectionSection = (name: Collection, eyebrow: string, title: string, copy: string, films: Movie[]) => <section className="rr-section rr-home-collection" key={name}>
    <div className="rr-wrap">
      <div className="rr-section-head">
        <div><span className="rr-eyebrow">{eyebrow}</span><h2 className="rr-section-title rr-display">{title}</h2><p className="rr-collection-copy">{copy}</p></div>
        <button className="rr-text-link" onClick={() => navigateCollection(name)}>Explore collection <ArrowRight size={14}/></button>
      </div>
      {movieGrid(films.slice(0, 4), "four")}
    </div>
  </section>;

  const criterionCollectionSection = () => <section className="rr-section rr-criterion-section" id="criterion" aria-labelledby="rr-criterion-heading">
    <div className="rr-wrap">
      <div className="rr-criterion-heading">
        <div>
          <span className="rr-eyebrow">The Criterion Collection · Essential Art House</span>
          <h2 className="rr-section-title rr-display" id="rr-criterion-heading">Fifty frames in film history.</h2>
          <p className="rr-collection-copy">A 50-film selection from Criterion’s Essential Art House: 50 Years of Janus Films box set. An invitation to explore, not an official ranking.</p>
        </div>
        <span className="rr-criterion-count"><strong>{CRITERION_FILMS.length}</strong><span>essential films</span></span>
      </div>
      <div className="rr-criterion-rail" role="list" aria-label="50 films from Criterion's Essential Art House collection">
        {CRITERION_FILMS.map((film, index) => <a className="rr-criterion-card" key={film.title} href={film.source} target="_blank" rel="noopener noreferrer" role="listitem" aria-label={`View ${film.title} at The Criterion Collection`}>
          <span className="rr-criterion-poster"><img src={film.poster} alt={`${film.title} Criterion Collection artwork`} loading={index < 7 ? "eager" : "lazy"} decoding="async"/></span>
          <span className="rr-criterion-caption"><span className="rr-criterion-index">{String(index + 1).padStart(2, "0")} / 50</span><span className="rr-criterion-title">{film.title}</span></span>
        </a>)}
      </div>
      <p className="rr-criterion-credit">Artwork and film details © their respective rights holders. <a href="https://www.criterion.com/boxsets/305-essential-art-house-50-years-of-janus-films" target="_blank" rel="noopener noreferrer">Explore the official Criterion set <ArrowRight size={12}/></a></p>
    </div>
  </section>;

  const handleHeroPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const hero = event.currentTarget;
    const rect = hero.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    hero.querySelectorAll<HTMLElement>(".rr-hero-poster").forEach((poster, index) => {
      const depth = 0.52 + (index % 4) * 0.15;
      const offsetX = reduceMotion ? 0 : -pointerX * 8 * depth;
      const offsetY = reduceMotion ? 0 : -pointerY * 6 * depth;
      poster.style.setProperty("--poster-shift-x", `${offsetX.toFixed(2)}px`);
      poster.style.setProperty("--poster-shift-y", `${offsetY.toFixed(2)}px`);
    });
  };
  const handleHeroPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.querySelectorAll<HTMLElement>(".rr-hero-poster").forEach((poster) => {
      poster.style.setProperty("--poster-shift-x", "0px");
      poster.style.setProperty("--poster-shift-y", "0px");
    });
  };

  const renderHome = () => <main>
    <section className="rr-hero" onPointerMove={handleHeroPointerMove} onPointerLeave={handleHeroPointerLeave}>
      <GravityField />
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
    {homeCollectionSection("Digital only", "Platform picks", "Digital only.", "Compare illustrative platform options. The same title may also have a disc edition; availability is not retailer-verified.", MOVIES.filter((movie) => movie.platforms.length > 0))}
    {homeCollectionSection("Physical only", "The disc shelf", "Physical only.", "Eighty-two classics are listed on disc in this demo. Regional stock and release formats are not verified.", MOVIES.filter((movie) => movie.platforms.length === 0))}
    {homeCollectionSection("Top 100", "A growing shortlist", "The Top 100.", `Built for 100 films; ${MOVIES.length} titles are on the shelf today.`, MOVIES)}
    {homeCollectionSection("Academy Award films", "The gold standard", "Academy Award films.", "A collection of Academy Award-winning pictures, performances, writing, and craft.", MOVIES.filter((movie) => ACADEMY_AWARD_IDS.has(movie.id)))}
    {criterionCollectionSection()}
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
    const pageTitle = collection !== "All films" ? collection : view === "physical" ? "Physical cinema" : view === "digital" ? "Digital cinema" : view === "watchlist" ? "Your watchlist" : "The film archive";
    const list = view === "watchlist" ? filteredMovies.filter((movie) => watchlist.includes(movie.id)) : filteredMovies;
    const collectionCopy: Record<Collection, string> = {
      "All films": "A considered collection across genres, decades, and the many ways to watch.",
      "Digital only": "Titles with example digital platform options. Digital access and current availability are not verified.",
      "Physical only": "Eighty-two classic films listed on disc in this demonstration catalog; no digital options are represented here.",
      "Top 100": `A growing hundred-film collection. ${MOVIES.length} titles are available to browse today.`,
      "Academy Award films": "Films with Academy Award wins across picture, performance, writing, and craft.",
    };
    const pageDescription = collection !== "All films" ? collectionCopy[collection] : view === "physical" ? "Find a film for the shelf, the cinema room, or a good old-fashioned movie night. Availability is demonstration data." : view === "digital" ? "Compare example digital options by platform. No viewing rights or third-party purchases are provided here." : view === "watchlist" ? "A personal shortlist of films worth coming back to." : collectionCopy["All films"];
    return <main className="rr-wrap">
      <div className="rr-page-head"><span className="rr-eyebrow">{view === "watchlist" ? "Saved for later" : "Curated cinema archive"}</span><h1>{pageTitle}</h1><p>{pageDescription}</p></div>
      {view === "watchlist" ? <section className="rr-section compact">{watchlist.length === 0 ? <div className="rr-empty"><Heart size={25}/><h2>Your next favorite belongs here.</h2><p>Save films while browsing and they will wait right here for you.</p><button className="rr-button" onClick={() => navigate("browse")}>Explore movies <ArrowRight size={14}/></button></div> : movieGrid(list, "four")}</section> : <>
        <div className="rr-category-tabs" role="tablist" aria-label="Movie collections">
          {COLLECTIONS.map((name) => <button type="button" role="tab" aria-selected={collection === name} className={`rr-category-tab ${collection === name ? "active" : ""}`} key={name} onClick={() => setCollection(name)}>{name}</button>)}
        </div>
        <div className="rr-catalog-toolbar">
          <label className="rr-search"><Search size={17}/><input id="catalog-search" className="rr-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, directors, genres…" aria-label="Search films"/></label>
          <label><span className="rr-filter-label">Sort by</span><select className="rr-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort movies"><option>Featured</option><option>Title A–Z</option><option>Newest</option><option>Oldest</option><option>Price: low to high</option></select></label>
        </div>
        <div className="rr-filters">
          <label className="rr-filter"><span className="rr-filter-label">Genre</span><select className="rr-select" value={genre} onChange={(event) => setGenre(event.target.value)}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="rr-filter"><span className="rr-filter-label">Decade</span><select className="rr-select" value={decade} onChange={(event) => setDecade(event.target.value)}><option>All decades</option>{[1920,1930,1940,1950,1960,1970,1980,1990,2000,2010,2020].map((year) => <option key={year}>{year}s</option>)}</select></label>
          <label className="rr-filter"><span className="rr-filter-label">Format</span><select className="rr-select" value={format} onChange={(event) => setFormat(event.target.value)}><option>Any format</option><option>DVD</option><option>Blu-ray</option><option>4K Ultra HD</option><option>Digital</option></select></label>
          <label className="rr-filter"><span className="rr-filter-label">Experience</span><select className="rr-select" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option>Any mode</option><option>Buy</option><option>Rent</option><option>Physical</option><option>Digital</option></select></label>
          <label className="rr-filter"><span className="rr-filter-label">Starting price</span><select className="rr-select" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}><option>Any price</option><option value="2">Under 2 KWD</option><option value="4">Under 4 KWD</option><option value="7">Under 7 KWD</option><option value="10">Under 10 KWD</option></select></label>
        </div>
        <div className="rr-results-line"><span>{list.length} films · {MOVIES.length} of 100 titles in the catalog</span><button className="rr-text-link" onClick={resetFilters}>Clear filters <RotateCcw size={12}/></button></div>
        {movieGrid(list, "six")}
      </>}
       <div style={{ padding: "30px 0 55px" }}>
         <p className="rr-demo-note">Catalog availability, format options, platform listings, and every KWD amount are illustrative demonstration data—not verified retailer inventory or streaming rights.</p>
         <details className="rr-poster-credits"><summary>Poster sources &amp; image rights</summary><p>Film poster artwork is shown for identification and belongs to its respective rights holders. Sources link to the film entries where each image was found.</p><div>{MOVIES.map((movie) => <a key={movie.id} href={POSTER_SOURCES[movie.id]} target="_blank" rel="noopener noreferrer">{movie.title}</a>)}</div></details>
       </div>
    </main>;
  };

  const renderDetails = () => {
    const options = experience === "Physical" ? ["DVD", "Blu-ray", ...(FOUR_K_DEMO_TITLES.has(selectedMovie.id) ? ["4K Ultra HD"] : [])] : selectedMovie.platforms;
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
            <button className={`rr-choice ${experience === "Digital" ? "active blue" : ""}`} disabled={selectedMovie.platforms.length === 0} onClick={() => setExperienceMode("Digital")}><strong>DIGITAL</strong><span>{selectedMovie.platforms.length ? "Choose a platform" : "Not listed in this demo"}</span></button>
          </div>
          {selectedMovie.platforms.length === 0 && <p className="rr-physical-note">Physical-only demo listing. Digital availability is not represented here.</p>}
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
              return <button key={option} className={`rr-choice ${selectedOption === option ? `active ${experience === "Digital" ? "blue" : ""}` : ""}`} onClick={() => setOption(option)}><span><strong>{option}</strong><span>{experience === "Physical" ? (option === "DVD" ? "Standard definition" : option === "Blu-ray" ? "High definition" : "Ultra high definition") : `${buyMode} · demo listing`}</span></span><span className="rr-selection-price">{money(optionPrice)}</span></button>;
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
              <div className="rr-poster" style={{ "--poster-bg": `linear-gradient(148deg,${movie.palette[0]},#11181c 78%)`, "--poster-glow": movie.palette[1] } as CSSProperties}><img className="rr-poster-image" src={`/__mockup/images/reelroom-${movie.id}.${movie.posterExt ?? "jpg"}`} alt={`${movie.title} theatrical poster`} loading="lazy"/><div className="rr-poster-art"/><span className="rr-poster-title">{movie.title}</span></div>
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
    <section className="rr-section"><div className="rr-story"><div><span className="rr-eyebrow">The idea</span><h2>Less hunting.<br/>More settling in.</h2><p>Finding a favorite film should feel like browsing a thoughtfully kept collection, not opening another endless storefront. REELROOM brings disc formats and digital platform options into one simple, considered view.</p><p>Choose a physical edition for the shelf or a digital platform preference for the evening. The experience is designed around the film, then gets out of the way.</p><button className="rr-button" style={{ marginTop: 19 }} onClick={() => navigate("browse")}>Explore the archive <ArrowRight size={14}/></button></div><div className="rr-brand-spec"><span className="rr-eyebrow">Brand & design</span><div className="rr-spec-row"><strong>Personality</strong><span>Cinematic · Curated · Effortless</span></div><div className="rr-spec-row"><strong>Mark</strong><span>An original R held inside a restrained film frame.</span></div><div className="rr-spec-row"><strong>Palette</strong><span>Cinema Black anchors the room; Reel Green marks the essentials, Projection Blue signals digital choices and focus, and Film Orange punctuates selected highlights.</span></div><div className="rr-spec-row"><strong>Type</strong><span>Space Grotesk for confident film titles; Inter for readable, quiet utility.</span></div><div className="rr-spec-row"><strong>Principle</strong><span>Poster-first discovery. No clutter between you and the next film.</span></div></div></div></section>
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
