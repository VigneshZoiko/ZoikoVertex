import type { SafetyPattern } from "../types";

export const HATE_PATTERNS: SafetyPattern[] = [
  // ---------------------------------------------------------------------------
  // RACIAL SLURS — BLACK / AFRICAN ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "nigger",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "nigga",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "coon",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "sambo",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "spook", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "jigaboo",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "pickaninny",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "darkie",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "jungle bunny",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "porch monkey",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "tar baby",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "cotton picker",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — ASIAN ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "chink",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "gook",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "slant", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "slanteye",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "zipperhead",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  { pattern: "nip", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "jap", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "chinaman",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "chigger",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "flip", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "dink", category: "hate_speech", severity: "high", score: 0.75 },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — HISPANIC / LATINO ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "spic",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "wetback",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "beaner",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "greaser", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "border hopper",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "illegal alien",
    category: "hate_speech",
    severity: "medium",
    score: 0.6,
  },
  {
    pattern: "anchor baby",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — MIDDLE EASTERN / SOUTH ASIAN ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "raghead",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "towelhead",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "sand nigger",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "camel jockey",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "dune coon",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "terrorist",
    category: "hate_speech",
    severity: "high",
    score: 0.7,
  },
  {
    pattern: "paki",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "curry muncher",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "dot head",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "abu", category: "hate_speech", severity: "medium", score: 0.55 },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — JEWISH ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "kike",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "heeb",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "hymie",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "yid", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "jewboy",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "hebe",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "zhid",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "jewish conspiracy",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "jewish control",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "rothschild conspiracy",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "zionist conspiracy",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — WHITE / EUROPEAN ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "cracker",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  { pattern: "honky", category: "hate_speech", severity: "high", score: 0.75 },
  {
    pattern: "whitey",
    category: "hate_speech",
    severity: "medium",
    score: 0.6,
  },
  {
    pattern: "white trash",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "redneck",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "hillbilly",
    category: "hate_speech",
    severity: "medium",
    score: 0.5,
  },
  { pattern: "kraut", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "mick", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "paddy", category: "hate_speech", severity: "medium", score: 0.6 },
  { pattern: "limey", category: "hate_speech", severity: "medium", score: 0.5 },
  { pattern: "wop", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "dago", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "guinea", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "polack", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "bohunk", category: "hate_speech", severity: "high", score: 0.75 },

  // ---------------------------------------------------------------------------
  // RACIAL SLURS — INDIGENOUS / OTHER ORIGIN
  // ---------------------------------------------------------------------------
  {
    pattern: "redskin",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "injun",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "squaw",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "half breed",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "wagon burner",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "prairie nigger",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "abbo",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "boong",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "coon",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "gin", category: "hate_speech", severity: "high", score: 0.75 },

  // ---------------------------------------------------------------------------
  // GENDER & SEXUALITY SLURS
  // ---------------------------------------------------------------------------
  {
    pattern: "faggot",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  { pattern: "fag", category: "hate_speech", severity: "high", score: 0.85 },
  { pattern: "dyke", category: "hate_speech", severity: "high", score: 0.85 },
  {
    pattern: "queer",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  { pattern: "homo", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "sodomite",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "tranny",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "shemale",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "he-she", category: "hate_speech", severity: "high", score: 0.85 },
  { pattern: "it", category: "hate_speech", severity: "medium", score: 0.5 },
  { pattern: "trap", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "troon", category: "hate_speech", severity: "high", score: 0.85 },
  {
    pattern: "trannie",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "sissy", category: "hate_speech", severity: "medium", score: 0.6 },
  { pattern: "pansy", category: "hate_speech", severity: "medium", score: 0.6 },
  {
    pattern: "pillow biter",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "carpet muncher",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "bull dyke",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "groomer", category: "hate_speech", severity: "high", score: 0.8 },

  // ---------------------------------------------------------------------------
  // DISABILITY SLURS
  // ---------------------------------------------------------------------------
  { pattern: "retard", category: "hate_speech", severity: "high", score: 0.85 },
  {
    pattern: "retarded",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  { pattern: "spastic", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "spaz", category: "hate_speech", severity: "medium", score: 0.65 },
  {
    pattern: "cripple",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  { pattern: "gimp", category: "hate_speech", severity: "medium", score: 0.6 },
  {
    pattern: "mongoloid",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "moron",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  { pattern: "idiot", category: "hate_speech", severity: "low", score: 0.35 },
  {
    pattern: "imbecile",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "lunatic",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "psycho",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  { pattern: "schizo", category: "hate_speech", severity: "high", score: 0.75 },
  {
    pattern: "nutjob",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  { pattern: "lame", category: "hate_speech", severity: "low", score: 0.3 },
  {
    pattern: "deaf mute",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  { pattern: "dumb", category: "hate_speech", severity: "low", score: 0.3 },

  // ---------------------------------------------------------------------------
  // WHITE SUPREMACY / NAZI IDEOLOGY
  // ---------------------------------------------------------------------------
  {
    pattern: "white power",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "white pride",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "white supremacy",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "white supremacist",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "white nationalist",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "white genocide",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "great replacement",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "master race",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "aryan race",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "aryan nation",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "pure blood",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "blood purity",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "race traitor",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "race mixing",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "racial purity",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "nazi", category: "hate_speech", severity: "high", score: 0.7 },
  {
    pattern: "heil hitler",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "sieg heil",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "fourth reich",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "third reich",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  { pattern: "88", category: "hate_speech", severity: "medium", score: 0.55 },
  {
    pattern: "1488",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "14 words",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "blood and soil",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "boots and laces",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "gas the",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "gas the jews",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "holocaust denial",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "holohoax",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "jewish question",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "final solution",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "ethnic cleansing",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "racial holy war",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "rahowa",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "ku klux klan",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "kkk",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "skinhead",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "stormfront",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "daily stormer",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },

  // ---------------------------------------------------------------------------
  // DEHUMANISATION & INCITEMENT
  // ---------------------------------------------------------------------------
  {
    pattern: "subhuman",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "animals like you",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  { pattern: "vermin", category: "hate_speech", severity: "high", score: 0.8 },
  {
    pattern: "parasites",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  {
    pattern: "cockroaches",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "infestation",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  {
    pattern: "invasion",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "great replacement",
    category: "hate_speech",
    severity: "critical",
    score: 0.95,
  },
  {
    pattern: "replacement theory",
    category: "hate_speech",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "inferior race",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "superior race",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "kill all",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "death to",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "exterminate",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "cleanse the",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "purge the",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "wipe them out",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "they should all die",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },

  // ---------------------------------------------------------------------------
  // RELIGIOUS HATE
  // ---------------------------------------------------------------------------
  {
    pattern: "islamophobe",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "muslim scum",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "dirty muslim",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "kill muslims",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "christian scum",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  { pattern: "papist", category: "hate_speech", severity: "high", score: 0.75 },
  {
    pattern: "bible thumper",
    category: "hate_speech",
    severity: "medium",
    score: 0.55,
  },
  {
    pattern: "godless",
    category: "hate_speech",
    severity: "medium",
    score: 0.5,
  },
  {
    pattern: "infidels",
    category: "hate_speech",
    severity: "medium",
    score: 0.6,
  },
  {
    pattern: "crusade against",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  {
    pattern: "jihad against",
    category: "hate_speech",
    severity: "critical",
    score: 0.9,
  },
  {
    pattern: "sikh scum",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "hindu scum",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "jewish scum",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "dirty jew",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },

  // ---------------------------------------------------------------------------
  // GENDER-BASED HATE
  // ---------------------------------------------------------------------------
  {
    pattern: "women belong",
    category: "hate_speech",
    severity: "high",
    score: 0.75,
  },
  {
    pattern: "women are inferior",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "men are superior",
    category: "hate_speech",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "go back to the kitchen",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "women should know their place",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  {
    pattern: "feminazi",
    category: "hate_speech",
    severity: "high",
    score: 0.8,
  },
  { pattern: "whore", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "slut", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "cunt", category: "hate_speech", severity: "high", score: 0.85 },
  { pattern: "bitch", category: "hate_speech", severity: "medium", score: 0.6 },
  { pattern: "slag", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "skank", category: "hate_speech", severity: "high", score: 0.75 },
  { pattern: "hoe", category: "hate_speech", severity: "medium", score: 0.55 },
  { pattern: "incel", category: "hate_speech", severity: "medium", score: 0.6 },
  { pattern: "femoid", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "roastie", category: "hate_speech", severity: "high", score: 0.8 },
  { pattern: "thot", category: "hate_speech", severity: "medium", score: 0.55 },
];
