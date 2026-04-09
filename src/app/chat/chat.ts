import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-chat',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './chat.html',
})
export class ChatComponent {
  readonly quickPrompts = [
    'What have I saved about transformer architecture?',
    'Find tensions between my product notes and research docs.',
    'Give me a concise brief from the latest imported sources.',
  ];
}
