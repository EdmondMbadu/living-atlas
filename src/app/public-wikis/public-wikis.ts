import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AtlasService } from '../atlas.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { PUBLIC_WIKI_CATALOG } from '../public-wiki-catalog';

const ALL_CATEGORIES = 'All';

interface AtlasMedia {
  hero_url: string | null;
  logo_url: string | null;
  cover_color: string | null;
}

@Component({
  selector: 'app-public-wikis',
  imports: [RouterLink, ThemeToggleComponent, FormsModule],
  templateUrl: './public-wikis.html',
})
export class PublicWikisComponent implements OnInit {
  private readonly atlasService = inject(AtlasService);
  readonly atlasMedia = signal<Record<string, AtlasMedia>>({});


  readonly publicWikis = [...PUBLIC_WIKI_CATALOG].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'live' ? -1 : 1;
  });
  readonly liveCount = this.publicWikis.filter((wiki) => wiki.status === 'live').length;
  readonly comingSoonCount = this.publicWikis.filter((wiki) => wiki.status === 'coming-soon').length;

  readonly categories = [
    ALL_CATEGORIES,
    ...Array.from(
      new Set(this.publicWikis.map((wiki) => wiki.category).filter((cat): cat is string => !!cat)),
    ).sort(),
  ];

  readonly activeCategory = signal<string>(ALL_CATEGORIES);
  readonly searchTerm = signal<string>('');

  readonly categoryCounts = this.categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === ALL_CATEGORIES
      ? this.publicWikis.length
      : this.publicWikis.filter((wiki) => wiki.category === cat).length;
    return acc;
  }, {});

  readonly hasFilters = computed(
    () => this.activeCategory() !== ALL_CATEGORIES || this.searchTerm().trim().length > 0,
  );

  readonly filteredWikis = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.publicWikis.filter((wiki) => {
      const catMatch = cat === ALL_CATEGORIES || wiki.category === cat;
      if (!catMatch) return false;
      if (!term) return true;
      const haystack = [
        wiki.title,
        wiki.subtitle,
        wiki.description,
        wiki.category ?? '',
        wiki.sources ?? '',
        ...(wiki.badges ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  clearFilters(): void {
    this.activeCategory.set(ALL_CATEGORIES);
    this.searchTerm.set('');
  }

  mediaFor(slug: string | undefined): AtlasMedia | null {
    if (!slug) return null;
    return this.atlasMedia()[slug] ?? null;
  }

  heroFor(wiki: (typeof this.publicWikis)[number]): string | null {
    return this.mediaFor(wiki.slug)?.hero_url ?? wiki.fallbackHeroUrl ?? null;
  }

  logoFor(wiki: (typeof this.publicWikis)[number]): string | null {
    return this.mediaFor(wiki.slug)?.logo_url ?? wiki.fallbackLogoUrl ?? null;
  }

  coverColorFor(wiki: (typeof this.publicWikis)[number]): string | null {
    return this.mediaFor(wiki.slug)?.cover_color ?? null;
  }

  initialsFor(title: string): string {
    return title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  async ngOnInit(): Promise<void> {
    const liveSlugs = this.publicWikis
      .filter((wiki) => wiki.status === 'live' && wiki.slug)
      .map((wiki) => wiki.slug as string);

    const results = await Promise.all(
      liveSlugs.map(async (slug) => {
        try {
          const atlas = await this.atlasService.getPublicAtlasBySlug(slug);
          if (!atlas) return null;
          return [
            slug,
            {
              hero_url: atlas.hero_url,
              logo_url: atlas.logo_url,
              cover_color: atlas.cover_color,
            },
          ] as const;
        } catch {
          return null;
        }
      }),
    );

    const next: Record<string, AtlasMedia> = {};
    for (const entry of results) {
      if (entry) next[entry[0]] = entry[1];
    }
    this.atlasMedia.set(next);
  }
}
