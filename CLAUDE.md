# L'elefante — Agent Instructions

Sito Astro 6 minimale, HTML-first, in riadattamento da template generico a progetto editoriale italiano: **L'elefante**, giornalismo dati sulle disuguaglianze in Italia.

Il progetto è a metà tra esperimento e produzione: prima di cambiare feature fondamentali, esplora il codice e considera i placeholder ancora presenti.

## Regole di lavoro

- Leggi i file coinvolti prima di modificare. Per cambi strutturali controlla sempre `src/content/site.ts`, `src/content/articles.ts`, `src/layouts/Base.astro`, `src/styles/global.css` e le pagine interessate.
- Mantieni interventi piccoli e coerenti con l'architettura esistente.
- Tutti i testi pubblici devono essere in italiano.
- Il contenuto viene prima del design: leggibilità, fonti e accessibilità contano più degli effetti visuali.
- Usa JS solo quando aggiunge valore editoriale reale: grafici, filtri, mappe, scrollytelling.
- Non aggiungere framework UI, Tailwind, React/Vue/Svelte salvo decisione eccezionale e documentata.

## Comandi

```bash
npm run dev
npm run build
npm run preview
npm run check
```

Deploy configurato in `astro.config.mjs`: `https://elefante-disuguaglianze.github.io`. Se tocchi canonical o SEO, verifica anche `site.url` in `src/content/site.ts`.

## Struttura da ricordare

- `src/content/site.ts`: fonte principale per nome sito, tagline, descrizione, testi home, autore, nav, SEO default.
- `src/content/articles.ts`: registry degli articoli renderizzati in home (`number`, `title`, `description`, `href`, `published`, `image`, `imageAlt`, `publishedAt`).
- `src/layouts/Base.astro`: layout globale con `SEO`, `Header`, `Footer`, `SkipLink`, font, CSS globale e Cloudflare Analytics.
- `src/components/SEO.astro`: meta tag, canonical, Open Graph, Twitter card, JSON-LD.
- `src/components/ArticleCard.astro`: card home; attualmente renderizza solo articoli pubblicati.
- `src/components/charts/`: componenti D3 degli articoli.
- `src/scripts/`: logica TS per scrollytelling.
- `src/styles/partials/`: token, reset, font, struttura, behavior.
- Asset: font in `public/fonts/`, OG in `public/images/og/`, immagini articolo in `src/assets/articles/`, dataset futuri in `public/data/`.

## Pagine e articoli

Ogni pagina usa `Base.astro`. Pattern:

```astro
---
import Base from "../layouts/Base.astro";
import { site } from "../content/site";
---

<Base title="Titolo" description="..." canonicalPath="/pagina">
  <article class="prose">...</article>
</Base>
```

Per aggiungere un articolo: registra l'oggetto in `articles.ts`, crea `src/pages/articoli/[numero].astro`, importa eventuali immagini da `src/assets/articles/`, poi imposta `published: true` e `publishedAt` quando è pronto.

## CSS

- CSS plain, niente utility framework.
- Usa token da `src/styles/partials/tokens.css`; evita nuovi colori/spazi hardcoded.
- Classi in stile BEM (`header__inner`, `nav__link`, `article-card__title`, `is-active`).
- Layout, prose, header, footer e griglia articoli stanno in `structure.css`.

## Visualizzazioni

- Chart in `src/components/charts/`, naming `Chart_[numero_articolo].[numero_chart].astro`.
- Struttura consigliata: `<figure class="viz-figure">`, `<figcaption>`, target chart, `<noscript><table>`.
- Ogni visualizzazione deve avere fallback `<noscript>` con tabella dei dati chiave.
- Usa label accessibili, `aria-label`, `aria-live` quando ci sono input.
- Per nuove chart D3 usa CDN ESM nel componente:

```js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
```

- Non presentare dati inventati come reali. Indica fonti e limiti nelle caption o nel testo.
- `scrollama` è la dipendenza usata per scrollytelling. Il pattern attuale è sticky graphic + `.step[data-step]` + script in `src/scripts/`.

## Stato da non dimenticare

- `src/content/site.ts` contiene ancora tagline/testi di prova, email `hello@example.com`, URL `example.com` e `seo.ogImage` non allineata al file reale.
- `Base.astro` ha `CF_TOKEN = "XXX"`.
- `public/images/og/` contiene `elefant.png`, mentre il default punta a `/images/og/og-default.svg`.
- `about.astro`, `contact.astro`, `legal.astro` hanno contenuti placeholder/template, in parte in inglese.
- `src/pages/articoli/1.astro` contiene lorem ipsum e dati di esempio.
- `articles.ts` ha articoli 1 e 2 più draft 4; `src/pages/articoli/2.astro` dichiara titolo/canonical da articolo 3. Chiarire prima di rinumerare.
- `Chart_1.1`, `Chart_1.2`, `Chart_1.3` usano dati/soglie inventati.
- `package.json` contiene ancora `d3`; la convenzione per le chart è CDN, ma `src/scripts/scrollytelling_3.ts` lo importa da npm.
- `src/scripts/scrollytelling_3.ts` andrebbe rinominato con cautela aggiornando l'import.
- `behaviors.css` contiene placeholder da template; `structure.css` ha ancora alcuni hardcoded.

## Prima del deploy

Rimuovere placeholder, sistemare token Cloudflare o analytics, allineare OG/canonical, sostituire o dichiarare i dati inventati, poi eseguire:

```bash
npm run check
npm run build
```
