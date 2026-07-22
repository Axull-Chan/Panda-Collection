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
    category: "Craft",
    date: "June 2026",
    title: "The Weight of Cloth",
    excerpt:
      "Why we begin every edition at the mill — choosing fabric by hand before a single line is drawn.",
    image: "/images/flatlay-oxford.jpg",
  },
  {
    id: "twenty-of-anything",
    category: "Studio",
    date: "May 2026",
    title: "Twenty of Anything",
    excerpt:
      "On the discipline of the numbered edition, and what a garment gains when it refuses to be infinite.",
    image: "/images/cover-vogue.jpg",
  },
  {
    id: "a-room-in-lisbon",
    category: "Places",
    date: "April 2026",
    title: "A Room in Lisbon",
    excerpt:
      "Notes from the atelier residency — morning light, chalk lines, and the sound of shears on paper.",
    image: "/images/trench.jpg",
  },
];
