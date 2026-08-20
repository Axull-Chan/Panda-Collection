export interface JournalPost {
  id: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  image: string;
}

export const journalPosts: JournalPost[] = [
  {
    id: "the-weight-of-cloth",
    category: "Guide",
    date: "June 2026",
    title: "The Weight of Cloth",
    excerpt:
      "A few things worth checking before you buy — fabric weight, stitching, and how a piece actually wears over time.",
    image: "/images/flatlay-oxford.jpg",
  },
  {
    id: "building-a-capsule-wardrobe",
    category: "Style",
    date: "May 2026",
    title: "Building a Capsule Wardrobe",
    excerpt: "Fewer pieces, worn more often — how to build a wardrobe that actually gets used.",
    image: "/images/cover-vogue.jpg",
  },
  {
    id: "one-piece-three-ways",
    category: "Style",
    date: "April 2026",
    title: "One Piece, Three Ways",
    excerpt: "One top, three outfits — simple styling tricks that stretch your wardrobe further.",
    image: "/images/trench.jpg",
  },
];
