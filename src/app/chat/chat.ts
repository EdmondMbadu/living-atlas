import { AfterViewChecked, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CitationPassage, QueryHistoryItem } from '../atlas.models';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { WikiService } from '../wiki.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: CitationPassage[];
  pending?: boolean;
  knowledgeGap?: boolean;
}

const THINKING_STAGES = [
  'Searching knowledge base',
  'Reading relevant entries',
  'Synthesizing answer',
];

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, ThemeToggleComponent, MobileMenuComponent],
  templateUrl: './chat.html',
})
export class ChatComponent implements AfterViewChecked {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly wikiService = inject(WikiService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly isSigningOut = signal(false);
  readonly avatarMenuOpen = signal(false);
  readonly question = signal('');
  readonly selectedCitation = signal<CitationPassage | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly thinkingStage = signal(0);
  readonly historyExpanded = signal(false);
  readonly activeHistoryId = signal<string | null>(null);

  @ViewChild('transcriptEnd') transcriptEnd?: ElementRef<HTMLElement>;

  private shouldScrollToEnd = false;
  private thinkingInterval: ReturnType<typeof setInterval> | null = null;

  readonly currentUserName = this.authService.displayName;
  readonly currentUserEmail = this.authService.email;
  readonly queryHistory = this.chatService.queryHistory;
  readonly isSubmitting = this.chatService.isSubmitting;
  readonly submitError = this.chatService.submitError;
  readonly selectedTopic = this.wikiService.selectedTopic;

  readonly visibleHistory = computed(() => {
    const all = this.queryHistory();
    return this.historyExpanded() ? all : all.slice(0, 6);
  });

  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly currentThinkingLabel = computed(() => THINKING_STAGES[this.thinkingStage()] ?? THINKING_STAGES[0]);

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
    if (!question || this.isSubmitting()) {
      return;
    }

    this.activeHistoryId.set(null);
    this.question.set('');

    const userId = `u-${Date.now()}`;
    const pendingId = `a-${Date.now()}`;
    this.messages.update((msgs) => [
      ...msgs,
      { id: userId, role: 'user', text: question },
      { id: pendingId, role: 'assistant', text: '', pending: true },
    ]);
    this.shouldScrollToEnd = true;
    this.startThinkingRotation();

    await this.chatService.ask(
      question,
      this.selectedTopic() ? [this.selectedTopic()!.id] : undefined,
    );

    this.stopThinkingRotation();

    const err = this.submitError();
    if (err) {
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === pendingId ? { ...m, pending: false, text: err } : m,
        ),
      );
    } else {
      const answer = this.chatService.latestAnswer() ?? '';
      const citations = this.chatService.latestCitations();
      const gap = this.chatService.knowledgeGap();
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === pendingId
            ? { ...m, pending: false, text: answer, citations, knowledgeGap: gap }
            : m,
        ),
      );
    }
    this.shouldScrollToEnd = true;
  }

  private startThinkingRotation(): void {
    this.thinkingStage.set(0);
    this.thinkingInterval = setInterval(() => {
      this.thinkingStage.update((s) => Math.min(s + 1, THINKING_STAGES.length - 1));
    }, 1400);
  }

  private stopThinkingRotation(): void {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
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

  newChat(): void {
    this.messages.set([]);
    this.question.set('');
    this.selectedCitation.set(null);
    this.activeHistoryId.set(null);
  }

  loadHistoryItem(item: QueryHistoryItem): void {
    this.activeHistoryId.set(item.id);
    this.selectedCitation.set(null);
    this.messages.set([
      { id: `${item.id}-q`, role: 'user', text: item.question },
      {
        id: `${item.id}-a`,
        role: 'assistant',
        text: item.answer,
        citations: item.cited_passages ?? [],
        knowledgeGap: !!item.knowledge_gap,
      },
    ]);
    this.shouldScrollToEnd = true;
  }

  toggleHistoryExpanded(): void {
    this.historyExpanded.update((v) => !v);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.submitQuestion();
    }
  }

  truncate(text: string, max = 48): string {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToEnd) {
      this.shouldScrollToEnd = false;
      this.transcriptEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
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
