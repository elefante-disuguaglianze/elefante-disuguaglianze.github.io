import type { ImageMetadata } from "astro";

export type Article = {
  number: number;
  title: string;
  description: string;
  href: string;
  published: boolean;
  image?: ImageMetadata;
  imageAlt?: string;
  publishedAt?: Date;
};

export const articles: Article[] = [
  {
    number: 1,
    title: "STORYBOARD",
    description:
      "STORYBOARD redditi.",
    href: "articoli/1",
    published: true,
    publishedAt: new Date("2026-05-10"),
  },
];
