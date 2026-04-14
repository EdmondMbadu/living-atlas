import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { AtlasService } from '../atlas.service';

@Component({
  selector: 'app-atlas-switcher',
  imports: [],
  templateUrl: './atlas-switcher.html',
})
export class AtlasSwitcherComponent {
  private readonly atlasService = inject(AtlasService);
  private readonly elementRef = inject(ElementRef);

  readonly atlases = this.atlasService.atlases;
  readonly activeAtlas = this.atlasService.activeAtlas;
  readonly menuOpen = signal(false);
  readonly creating = signal(false);
  readonly newName = signal('');
  readonly showCreate = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  select(atlasId: string): void {
    this.atlasService.setActive(atlasId);
    this.menuOpen.set(false);
  }

  openCreate(): void {
    this.showCreate.set(true);
    this.menuOpen.set(false);
    this.newName.set('');
  }

  cancelCreate(): void {
    this.showCreate.set(false);
    this.newName.set('');
  }

  async submitCreate(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newName().trim();
    if (!name) return;
    this.creating.set(true);
    try {
      await this.atlasService.createAtlas({ name });
      this.showCreate.set(false);
      this.newName.set('');
    } finally {
      this.creating.set(false);
    }
  }

  onNameInput(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
