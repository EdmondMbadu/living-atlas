import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {}
