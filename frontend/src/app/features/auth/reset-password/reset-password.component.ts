import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value ?? '';
  if (!val) return null;
  if (val.length < 8) return { minlength: true };
  if (!/[A-Z]/.test(val)) return { uppercase: true };
  if (!/[0-9]/.test(val)) return { number: true };
  return null;
}

@Component({
  selector: 'app-reset-password',
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
          <h1 class="auth-layout__brand-headline">Set a new<br>password.</h1>
          <p class="auth-layout__brand-sub">Choose a strong, unique password. Your reset link expires in 30 minutes.</p>
        </div>
      </div>

      <div class="auth-layout__form-panel">
        <div class="auth-layout__form-container">
          <div class="auth-layout__mobile-logo">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#16a34a"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
            <span>TurfX</span>
          </div>

          @if (!resetDone()) {
            <h2 class="auth-layout__title">Reset your password</h2>
            <p class="auth-layout__subtitle">Enter your new password below.</p>

            @if (serverError()) {
              <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ serverError() }}
                @if (showLoginLink()) {
                  <a routerLink="/forgot-password" style="display:block;margin-top:8px;color:#2563eb;">Request a new reset link →</a>
                }
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-stack" novalidate>
              <div class="form-group">
                <label for="password" class="form-label">New password <span class="required">*</span></label>
                <div class="input-wrapper">
                  <span class="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                  <input id="password" [type]="showPwd() ? 'text' : 'password'" class="form-control has-icon-left has-icon-right" [class.is-invalid]="isInvalid('password')" formControlName="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" autocomplete="new-password"/>
                  <button type="button" class="input-icon input-icon--right" (click)="togglePwd()" aria-label="Toggle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                @if (isInvalid('password')) {
                  <span class="form-error" role="alert">{{ getError('password') }}</span>
                } @else {
                  <span class="form-hint">At least 8 characters, one uppercase letter, and one number.</span>
                }
              </div>

              <button type="submit" class="btn btn--primary btn--full btn--lg" [class.loading]="loading()" [disabled]="loading()">
                @if (!loading()) { Reset password } @else { Resetting… }
              </button>
            </form>
          } @else {
            <div style="text-align:center;padding:16px 0;">
              <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 class="auth-layout__title" style="margin-bottom:8px;">Password reset!</h2>
              <p style="color:#6b7280;margin-bottom:32px;">Your password has been updated. Sign in with your new password.</p>
              <a routerLink="/login" class="btn btn--primary btn--full">Sign in now</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private token = '';
  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly showLoginLink = signal(false);
  readonly resetDone = signal(false);
  readonly showPwd = signal(false);

  togglePwd(): void { this.showPwd.update(v => !v); }

  readonly form = this.fb.group({
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.serverError.set('Invalid reset link. Please request a new one.');
      this.showLoginLink.set(true);
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'Password is required.';
    if (ctrl.errors['minlength'] || ctrl.errors['uppercase'] || ctrl.errors['number'])
      return 'Password must be at least 8 characters with one uppercase letter and one number.';
    return '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token) return;

    this.loading.set(true);
    this.serverError.set('');

    this.authService.resetPassword(this.token, this.form.value.password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetDone.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Reset failed. The link may have expired.');
        if (err.error?.code === 'INVALID_RESET_TOKEN') this.showLoginLink.set(true);
      },
    });
  }
}
