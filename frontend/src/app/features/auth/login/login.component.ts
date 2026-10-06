import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="auth-layout">

      <!-- Brand panel -->
      <div class="auth-layout__brand">
        <div class="auth-layout__brand-content">
          <div class="auth-layout__brand-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.2)"/>
              <path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
            </svg>
            <span>TurfX</span>
          </div>
          <h1 class="auth-layout__brand-headline">Your game,<br>your turf.</h1>
          <p class="auth-layout__brand-sub">Book premium sports venues, run tournaments, and track your game — all in one platform.</p>
          <div class="auth-layout__brand-features">
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Instant turf booking with live availability</span>
            </div>
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Box cricket & football turf tournaments</span>
            </div>
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Secure payments powered by Razorpay</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form panel -->
      <div class="auth-layout__form-panel">
        <div class="auth-layout__form-container">

          <!-- Mobile logo -->
          <div class="auth-layout__mobile-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="#16a34a"/>
              <path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
            </svg>
            <span>TurfX</span>
          </div>

          <h2 class="auth-layout__title">Welcome back</h2>
          <p class="auth-layout__subtitle">Sign in to your account to continue.</p>

          <!-- Server error -->
          @if (serverError()) {
            <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {{ serverError() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-stack" novalidate>
            <!-- Email -->
            <div class="form-group">
              <label for="email" class="form-label">Email address <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input
                  id="email"
                  type="email"
                  class="form-control has-icon-left"
                  [class.is-invalid]="isInvalid('email')"
                  formControlName="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  aria-required="true"
                />
              </div>
              @if (isInvalid('email')) {
                <span class="form-error" role="alert">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ getError('email') }}
                </span>
              }
            </div>

            <!-- Password -->
            <div class="form-group">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <label for="password" class="form-label">Password <span class="required">*</span></label>
                <a routerLink="/forgot-password" class="btn btn--link" style="font-size:0.8125rem;">Forgot password?</a>
              </div>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control has-icon-left has-icon-right"
                  [class.is-invalid]="isInvalid('password')"
                  formControlName="password"
                  placeholder="Your password"
                  autocomplete="current-password"
                  aria-required="true"
                />
                <button type="button" class="input-icon input-icon--right" (click)="togglePassword()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                  @if (showPassword()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              @if (isInvalid('password')) {
                <span class="form-error" role="alert">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ getError('password') }}
                </span>
              }
            </div>

            <button type="submit" class="btn btn--primary btn--full btn--lg" [class.loading]="loading()" [disabled]="loading()">
              @if (!loading()) { Sign in } @else { Signing in… }
            </button>
          </form>

          <div class="divider" style="margin:24px 0;">or</div>

          <p style="text-align:center;font-size:0.875rem;color:#6b7280;">
            Don't have an account?
            <a routerLink="/register" class="btn btn--link" style="font-size:0.875rem;">Sign up free</a>
          </p>
          <p style="text-align:center;font-size:0.875rem;color:#6b7280;margin-top:8px;">
            Own a turf?
            <a routerLink="/register/owner" class="btn btn--link" style="font-size:0.875rem;">Register as owner</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly showPassword = signal(false);

  togglePassword(): void { this.showPassword.update(v => !v); }

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required.';
    if (ctrl.errors['email']) return 'Please enter a valid email address.';
    return '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');

    const { email, password } = this.form.value;
    this.authService.login(email!, password!).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.toastService.success('Welcome back!', `Signed in as ${data.user.name}`);
        this._redirectAfterLogin(data.user.role);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Login failed. Please try again.');
      },
    });
  }

  private _redirectAfterLogin(role: string): void {
    switch (role) {
      case 'admin': this.router.navigate(['/admin/dashboard']); break;
      case 'owner': this.router.navigate(['/owner/dashboard']); break;
      default:      this.router.navigate(['/dashboard']); break;
    }
  }
}
