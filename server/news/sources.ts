// Curated. Adding a source is a line here, there is no UI for it.
export interface NewsSource {
  name: string;
  url: string;
}

export interface NewsCategoryDef {
  id: string;
  label: string;
  sources: NewsSource[];
}

const GOOGLE = "hl=de&gl=DE&ceid=DE:de";
const google = (topic: string) =>
  `https://news.google.com/rss/headlines/section/topic/${topic}?${GOOGLE}`;

export const NEWS_CATEGORIES: NewsCategoryDef[] = [
  {
    id: "schlagzeilen",
    label: "Schlagzeilen",
    sources: [
      { name: "Google News", url: `https://news.google.com/rss?${GOOGLE}` },
      { name: "SPIEGEL", url: "https://www.spiegel.de/schlagzeilen/index.rss" },
      { name: "SZ", url: "https://rss.sueddeutsche.de/rss/Topthemen" },
      { name: "n-tv", url: "https://www.n-tv.de/rss" },
    ],
  },
  {
    id: "welt",
    label: "Welt",
    sources: [
      { name: "tagesschau", url: "https://www.tagesschau.de/index~rss2.xml" },
      { name: "Deutschlandfunk", url: "https://www.deutschlandfunk.de/nachrichten-100.rss" },
    ],
  },
  {
    id: "politik",
    label: "Politik",
    sources: [
      { name: "tagesschau", url: "https://www.tagesschau.de/inland/index~rss2.xml" },
      { name: "ZEIT", url: "https://newsfeed.zeit.de/politik/index" },
    ],
  },
  {
    id: "wirtschaft",
    label: "Wirtschaft",
    sources: [{ name: "tagesschau", url: "https://www.tagesschau.de/wirtschaft/index~rss2.xml" }],
  },
  {
    id: "technik",
    label: "Technik & KI",
    sources: [
      { name: "heise", url: "https://www.heise.de/rss/heise-atom.xml" },
      { name: "The Decoder", url: "https://the-decoder.de/feed/" },
      { name: "t3n", url: "https://t3n.de/rss.xml" },
      { name: "Golem", url: "https://rss.golem.de/rss.php?feed=RSS2.0" },
      { name: "ComputerBase", url: "https://www.computerbase.de/rss/news.xml" },
      { name: "netzpolitik", url: "https://netzpolitik.org/feed/" },
      { name: "Google News", url: google("TECHNOLOGY") },
    ],
  },
  {
    id: "tech-en",
    label: "Tech (englisch)",
    sources: [
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    sources: [{ name: "GameStar", url: "https://www.gamestar.de/news/rss/news.rss" }],
  },
  {
    id: "wissen",
    label: "Wissen",
    sources: [
      { name: "Spektrum", url: "https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406" },
      { name: "tagesschau", url: "https://www.tagesschau.de/wissen/index~rss2.xml" },
      { name: "Google News", url: google("SCIENCE") },
    ],
  },
  {
    id: "gesundheit",
    label: "Gesundheit",
    sources: [{ name: "Google News", url: google("HEALTH") }],
  },
  {
    id: "kultur",
    label: "Kultur & Unterhaltung",
    sources: [
      { name: "SPIEGEL", url: "https://www.spiegel.de/kultur/index.rss" },
      { name: "Google News", url: google("ENTERTAINMENT") },
    ],
  },
  {
    id: "sport",
    label: "Sport",
    sources: [
      { name: "kicker", url: "https://newsfeed.kicker.de/news/aktuell" },
      { name: "Sportschau", url: "https://www.sportschau.de/index~rss2.xml" },
    ],
  },
  {
    id: "bayern",
    label: "Bayern",
    sources: [
      {
        name: "tagesschau",
        url: "https://www.tagesschau.de/inland/regional/bayern/index~rss2.xml",
      },
    ],
  },
  {
    id: "deals",
    label: "Deals",
    sources: [{ name: "mydealz", url: "https://www.mydealz.de/rss/hot" }],
  },
];
