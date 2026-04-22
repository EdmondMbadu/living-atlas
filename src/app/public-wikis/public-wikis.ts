import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { PUBLIC_WIKI_CATALOG } from '../public-wiki-catalog';

@Component({
  selector: 'app-public-wikis',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './public-wikis.html',
})
export class PublicWikisComponent {
  readonly publicWikis = PUBLIC_WIKI_CATALOG;
  readonly featuredWikis = this.publicWikis.filter((wiki) => wiki.status === 'live').slice(0, 3);
  readonly liveCount = this.publicWikis.filter((wiki) => wiki.status === 'live').length;
  readonly comingSoonCount = this.publicWikis.filter((wiki) => wiki.status === 'coming-soon').length;
}
