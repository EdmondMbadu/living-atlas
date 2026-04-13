import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CitationPassage } from '../atlas.models';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { WikiService } from '../wiki.service';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, ThemeToggleComponent, MobileMenuComponent],
  templateUrl: './chat.html',
})
export class ChatComponent {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly wikiService = inject(WikiService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly isSigningOut = signal(false);
  readonly avatarMenuOpen = signal(false);
  readonly question = signal('');
  readonly selectedCitation = signal<CitationPassage | null>(null);

  readonly currentUserName = this.authService.displayName;
  readonly currentUserEmail = this.authService.email;
  readonly queryHistory = this.chatService.queryHistory;
  readonly latestAnswer = this.chatService.latestAnswer;
  readonly latestCitations = this.chatService.latestCitations;
  readonly isSubmitting = this.chatService.isSubmitting;
  readonly submitError = this.chatService.submitError;
  readonly knowledgeGap = this.chatService.knowledgeGap;
  readonly selectedTopic = this.wikiService.selectedTopic;

  readonly quickPrompts = [
    'What does my knowledge base say about transformer architecture?',
    'Summarize the strongest themes in my uploaded sources.',
    'What contradictions exist across my notes and documents?',
  ];

  readonly userInitials = () => {
    const name = this.currentUserName();
    if (!name) return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  async submitQuestion(): Promise<void> {
    const question = this.question().trim();
    if (!question) {
      return;
    }

    await this.chatService.ask(
      question,
      this.selectedTopic() ? [this.selectedTopic()!.id] : undefined,
    );
  }

  usePrompt(prompt: string): void {
    this.question.set(prompt);
  }

  openCitation(citation: CitationPassage): void {
    this.selectedCitation.set(citation);
  }

  closeCitation(): void {
    this.selectedCitation.set(null);
  }

  formatDate(value: { toDate(): Date } | Date | null | undefined): string {
    const date = value instanceof Date ? value : typeof value?.toDate === 'function' ? value.toDate() : null;
    if (!date) {
      return 'Just now';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  toggleAvatarMenu(): void {
    this.avatarMenuOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      !this.elementRef.nativeElement
        .querySelector('.avatar-menu-wrapper')
        ?.contains(event.target as Node)
    ) {
      this.avatarMenuOpen.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.isSigningOut.set(true);
    this.avatarMenuOpen.set(false);

    try {
      await this.authService.signOut();
      await this.router.navigateByUrl('/');
    } finally {
      this.isSigningOut.set(false);
    }
  }
}
