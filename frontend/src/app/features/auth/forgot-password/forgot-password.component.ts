import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="auth-layout">
      <div class="auth-layout__brand">
        <div class="auth-layout__brand-content">
          <div class="auth-layout__brand-logo">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.2)"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
            <span>TurfX</span>
          </div>
          <h1 class="auth-layout__brand-headline">Recover your<br>account.</h1>
          <p class="auth-layout__brand-sub">Enter your email address and we'll send you a secure link to reset your password.</p>
        </div>
      </div>

      <div class="auth-layout__form-panel">
        <div class="auth-layout__form-container">
          <div class="auth-layout__mobile-logo">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#16a34a"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
            <span>TurfX</span>
          </div>

          @if (!sent()) {
            <h2 class="auth-layout__title">Forgot password?</h2>
            <p class="auth-layout__subtitle">No worries — enter your email and we'll send a reset link.</p>

            @if (serverError()) {
              <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ serverError() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-stack" novalidate>
              <div class="form-group">
                <label for="email" class="form-label">Email address <span class="required">*</span></label>
                <div class="input-wrapper">
                  <span class="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                  <input id="email" type="email" class="form-control has-icon-left" [class.is-invalid]="isInvalid('email')" formControlName="email" placeholder="you@example.com" autocomplete="email"/>
                </div>
                @if (isInvalid('email')) {
                  <span class="form-error" role="alert">Please enter a valid email address.</span>
                }
              </div>

              <button type="submit" class="btn btn--primary btn--full btn--lg" [class.loading]="loading()" [disabled]="loading()">
                @if (!loading()) { Send reset link } @else { Sending… }
              </button>
            </form>
          } @else {
            <!-- Success state -->
            <div style="text-align:center;padding:16px 0;">
              <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 class="auth-layout__title" style="margin-bottom:8px;">Check your inbox</h2>
              <p style="color:#6b7280;font-size:0.9375rem;line-height:1.6;margin-bottom:32px;">If an account exists for <strong>{{ form.value.email }}</strong>, a password reset link has been sent. Check your spam folder if you don't see it within a few minutes.</p>
              <a routerLink="/login" class="btn btn--primary btn--full">Back to sign in</a>
            </div>
          }

          <p style="text-align:center;font-size:0.875rem;color:#6b7280;margin-top:24px;">
            Remember your password?
            <a routerLink="/login" class="btn btn--link" style="font-size:0.875rem;">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly sent = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');

    this.authService.forgotPassword(this.form.value.email!).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }
}
