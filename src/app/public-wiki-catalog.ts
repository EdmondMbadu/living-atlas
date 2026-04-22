export type PublicWikiStatus = 'live' | 'coming-soon';

export interface PublicWikiCatalogItem {
  title: string;
  subtitle: string;
  description: string;
  status: PublicWikiStatus;
  slug?: string;
  accentClass: string;
}

export const PUBLIC_WIKI_CATALOG: PublicWikiCatalogItem[] = [
  {
    title: 'Philly',
    subtitle: 'City Atlas',
    description: 'Public knowledge for Philadelphia research, local context, and connected source material.',
    status: 'live',
    slug: 'philly',
    accentClass: 'from-emerald-400/30 via-teal-400/10 to-transparent',
  },
  {
    title: 'NewWorld Game',
    subtitle: 'Platform Atlas',
    description: 'A public wiki for NewWorld Game concepts, programs, and reference documents.',
    status: 'live',
    slug: 'newworld-game',
    accentClass: 'from-cyan-400/30 via-sky-400/10 to-transparent',
  },
  {
    title: 'MS Bookmakers',
    subtitle: 'Industry Atlas',
    description: 'A public wiki for bookmaker knowledge, notes, and curated source material.',
    status: 'live',
    slug: 'ms-bookmakers',
    accentClass: 'from-amber-400/30 via-orange-400/10 to-transparent',
  },
  {
    title: 'Public Wiki 04',
    subtitle: 'Coming Soon',
    description: 'Reserved for the next public Living Wiki release.',
    status: 'coming-soon',
    accentClass: 'from-white/10 via-white/5 to-transparent',
  },
  {
    title: 'Public Wiki 05',
    subtitle: 'Coming Soon',
    description: 'Another public wiki is being prepared for launch.',
    status: 'coming-soon',
    accentClass: 'from-white/10 via-white/5 to-transparent',
  },
  {
    title: 'Public Wiki 06',
    subtitle: 'Coming Soon',
    description: 'This slot will open once the next atlas is ready to publish.',
    status: 'coming-soon',
    accentClass: 'from-white/10 via-white/5 to-transparent',
  },
];
