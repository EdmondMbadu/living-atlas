import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { AtlasAnimationComponent } from './atlas-animation/atlas-animation';
import { GraphAnimationComponent } from './atlas-animation/graph-animation';
import { PUBLIC_WIKI_CATALOG } from '../public-wiki-catalog';

@Component({
  selector: 'app-marketing',
  imports: [RouterLink, ThemeToggleComponent, AtlasAnimationComponent, GraphAnimationComponent],
  templateUrl: './marketing.html',
})
export class MarketingComponent {
  navItems = [
    { label: 'Public Wikis', href: '#public-wikis' },
    { label: 'Features', href: '#features' },
    { label: 'Security', href: '#security' },
    { label: 'Pricing', href: '#pricing' },
  ];

  featuredPublicWikis = PUBLIC_WIKI_CATALOG.filter((wiki) => wiki.status === 'live').slice(0, 3);

  workflowSteps = [
    {
      title: 'Reading document',
      description: 'PDFs, Whitepapers, and Code repositories analyzed.',
      icon: 'upload_file',
    },
    {
      title: 'Extracting knowledge',
      description: 'Semantic entities and logic chains mapped in real-time.',
      icon: 'psychology',
    },
    {
      title: 'Updating wiki',
      description: 'Your private encyclopedia evolves with every page read.',
      icon: 'account_tree',
    },
    {
      title: 'Done',
      description: 'Instantly queryable, forever stored in your Living Wiki.',
      icon: 'check_circle',
    },
  ];

  trustMarks = ['PHAROS_GENOMICS', 'QUANTUM_SYS', 'NEURO_LABS', 'VANTAGE_TECH'];

  securityPoints = [
    'Private context isolation by default.',
    'Explicit provenance for every generated insight.',
    'SOC2 Type II compliance ready architecture.',
    'Encrypted at rest and in transit.',
  ];
}
