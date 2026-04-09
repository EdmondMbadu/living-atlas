import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-sign-in',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './sign-in.html',
})
export class SignInComponent {}
