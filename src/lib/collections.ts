// Collection data mirroring the Catalog service seed (CatalogModels.cs).
// In production both pages fetch GET /api/v1/collections; this local mirror
// keeps the demo working without the backend and MUST stay in sync with the seed.

export type Company = { symbol: string; name: string; blurb: string };
export type CollectionDef = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  companies: Company[];
};

export const collections: CollectionDef[] = [
  {
    slug: "gaming",
    name: "Gaming",
    tagline: "Companies behind the games they already love",
    emoji: "🎮",
    companies: [
      { symbol: "MSFT", name: "Microsoft", blurb: "Makes Xbox and Minecraft" },
      { symbol: "NTDOY", name: "Nintendo", blurb: "Home of Mario and Zelda" },
      { symbol: "RBLX", name: "Roblox", blurb: "The platform where kids build their own games" },
      { symbol: "EA", name: "Electronic Arts", blurb: "FIFA, Madden and The Sims" },
    ],
  },
  {
    slug: "space",
    name: "Space & Beyond",
    tagline: "For the kid who stares at the stars",
    emoji: "🚀",
    companies: [
      { symbol: "RKLB", name: "Rocket Lab", blurb: "Launches small rockets to orbit" },
      { symbol: "BA", name: "Boeing", blurb: "Builds planes and spacecraft" },
      { symbol: "LMT", name: "Lockheed Martin", blurb: "Built parts of the Mars rovers" },
    ],
  },
  {
    slug: "ai-robotics",
    name: "AI & Robotics",
    tagline: "The technology shaping their future",
    emoji: "🤖",
    companies: [
      { symbol: "NVDA", name: "NVIDIA", blurb: "Makes the chips that power AI" },
      { symbol: "GOOGL", name: "Alphabet", blurb: "Google's parent, an AI pioneer" },
      { symbol: "ISRG", name: "Intuitive Surgical", blurb: "Robots that help doctors in surgery" },
    ],
  },
  {
    slug: "everyday",
    name: "Brands They Know",
    tagline: "Companies kids see every day",
    emoji: "🛒",
    companies: [
      { symbol: "DIS", name: "Disney", blurb: "Movies, parks and Disney+" },
      { symbol: "MCD", name: "McDonald's", blurb: "The golden arches" },
      { symbol: "AAPL", name: "Apple", blurb: "iPhones and iPads" },
      { symbol: "KO", name: "Coca-Cola", blurb: "The world's most famous drink" },
    ],
  },
  {
    slug: "planet",
    name: "Planet Friendly",
    tagline: "Companies working on a cleaner world",
    emoji: "🌍",
    companies: [
      { symbol: "TSLA", name: "Tesla", blurb: "Electric cars and batteries" },
      { symbol: "ENPH", name: "Enphase", blurb: "Solar power technology" },
      { symbol: "WM", name: "Waste Management", blurb: "Recycling at scale" },
    ],
  },
  {
    slug: "automobiles",
    name: "Automobiles",
    tagline: "The companies behind the cars they spot on the road",
    emoji: "🚗",
    companies: [
      { symbol: "TSLA", name: "Tesla", blurb: "Electric cars and self-driving tech" },
      { symbol: "TM", name: "Toyota", blurb: "One of the world's biggest carmakers" },
      { symbol: "F", name: "Ford", blurb: "The company that put the world on wheels" },
      { symbol: "RACE", name: "Ferrari", blurb: "The legendary red racing cars" },
    ],
  },
  {
    slug: "sports",
    name: "Sports & Fitness",
    tagline: "For the kid who lives on the field",
    emoji: "⚽",
    companies: [
      { symbol: "NKE", name: "Nike", blurb: "The swoosh on their sneakers" },
      { symbol: "ADDYY", name: "Adidas", blurb: "Three stripes, worn by champions" },
      { symbol: "MANU", name: "Manchester United", blurb: "Own a piece of a football club" },
    ],
  },
  {
    slug: "food",
    name: "Food & Treats",
    tagline: "Brands from their favourite snacks",
    emoji: "🍫",
    companies: [
      { symbol: "HSY", name: "Hershey", blurb: "Chocolate, Kisses and Reese's" },
      { symbol: "MDLZ", name: "Mondelez", blurb: "Oreo, Cadbury and Toblerone" },
      { symbol: "DPZ", name: "Domino's", blurb: "Pizza night, delivered" },
    ],
  },
];

export function findCollection(slug: string | null): CollectionDef {
  return collections.find((c) => c.slug === slug) ?? collections[0];
}

export const allCompanies: Company[] = Object.values(
  collections.flatMap((c) => c.companies).reduce<Record<string, Company>>((acc, co) => {
    acc[co.symbol] = co;
    return acc;
  }, {}),
);
