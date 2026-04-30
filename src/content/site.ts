// src/content/site.ts
export type SiteNavItem = { 
    label: string;
    href: string 
};

export type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  elephant: string;
  url: string;            
  locale: string;
  author: {
    name: string;
    email?: string;
    url?: string;
    socials?: {
      instagram?: string;
    };
  };
  nav: SiteNavItem[];
  seo: {
    ogImage?: string;
    robots: string;
    themeColor: string;
  };
};

export const site: SiteConfig = {
  name: "ELEFANTE",
  tagline: "Un sito di prova, usando il framework Astro (non so che sto facendo)",
  description:
    "Inchieste e approfondimenti sulle disuguaglianze in Italia.",
  elephant: "La curva Milanovic (o \"curva dell'elefante\") è un grafico elaborato dall'economista Branko Milanovicvic che illustra la distribuzione della crescita del reddito globale tra il 1988 e il 2008. Mostra che i maggiori beneficiari della globalizzazione sono stati la classe media asiatica e l'1% più ricco, mentre la classe media dei paesi occidentali ha subito una stagnazione dei redditi",
  url: import.meta.env.SITE_URL ?? "https://elefante.github.io/",
  locale: "it",
  author: {
    name: "Elefanti",
    email: "hello@example.com",
    url: "https://example.com",
    socials: {
      instagram: "https://instagram.com/elefanti"
    }
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Chi siamo noi?", href: "/about" },
    { label: "Contatti", href: "/contact" },
  ],
  seo: {
    ogImage: "/images/og/elefant.png",
    robots: "index,follow",
    themeColor: "#ff7300"
  }
};
