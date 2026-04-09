import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-create-account',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './create-account.html',
})
export class CreateAccountComponent {}
