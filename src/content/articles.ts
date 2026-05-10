import type { ImageMetadata } from "astro";
import italiaPerPochi from "../assets/articles/italia-per-pochi.png";

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
    title: "Italia per pochi.",
    description:
      "Ognuno dei 100 punti in movimento rappresenta l'1% della popolazione italiana. Un viaggio interattivo per scoprire chi detiene il 100% della ricchezza.",
    href: "articoli/1",
    published: true,
    image: italiaPerPochi,
    imageAlt: "Grafico con 100 punti che rappresentano la popolazione italiana",
    publishedAt: new Date("2026-04-10"),
  },
  {
    number: 2,
    title: "Integrazione, davvero?",
    description:
      "Tutti parlano di accoglienza, ma chi se ne occupa sul territorio? Una mappatura dei centri di aiuto mostra una geografia fortemente disuguale.",
    href: "articoli/2",
    published: true,
    publishedAt: new Date("2026-04-15"),

  },
  {
    number: 3,
    title: "STORYBOARD",
    description:
      "STORYBOARD redditi.",
    href: "articoli/3",
    published: true,
    publishedAt: new Date("2026-05-10"),
  },
];
