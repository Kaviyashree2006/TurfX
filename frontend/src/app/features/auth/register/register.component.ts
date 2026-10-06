import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="auth-layout">
      <!-- Brand panel -->
      <div class="auth-layout__brand">
        <div class="auth-layout__brand-content">
          <div class="auth-layout__brand-logo">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.2)"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
            <span>TurfX</span>
          </div>
          <h1 class="auth-layout__brand-headline">Start booking<br>in minutes.</h1>
          <p class="auth-layout__brand-sub">Create a free account and discover the best sports venues near you.</p>
          <div class="auth-layout__brand-features">
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Free to create an account</span>
            </div>
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Browse hundreds of verified turfs</span>
            </div>
            <div class="auth-layout__brand-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Join tournaments and track your team</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form panel -->
      <div class="auth-layout__form-panel">
        <div class="auth-layout__form-container">
          <div class="auth-layout__mobile-logo">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#16a34a"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
            <span>TurfX</span>
          </div>

          <h2 class="auth-layout__title">Create your account</h2>
          <p class="auth-layout__subtitle">Join TurfX and start booking today.</p>

          @if (serverError()) {
            <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {{ serverError() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-stack" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="name" class="form-label">Full name <span class="required">*</span></label>
                <input id="name" type="text" class="form-control" [class.is-invalid]="isInvalid('name')" formControlName="name" placeholder="John Smith" autocomplete="name"/>
                @if (isInvalid('name')) {
                  <span class="form-error" role="alert">{{ getError('name') }}</span>
                }
              </div>
              <div class="form-group">
                <label for="phone" class="form-label">Phone <span style="color:#9ca3af;font-weight:400;">(optional)</span></label>
                <input id="phone" type="tel" class="form-control" [class.is-invalid]="isInvalid('phone')" formControlName="phone" placeholder="+91 98765 43210" autocomplete="tel"/>
                @if (isInvalid('phone')) {
                  <span class="form-error" role="alert">{{ getError('phone') }}</span>
                }
              </div>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">Email address <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input id="email" type="email" class="form-control has-icon-left" [class.is-invalid]="isInvalid('email')" formControlName="email" placeholder="you@example.com" autocomplete="email"/>
              </div>
              @if (isInvalid('email')) {
                <span class="form-error" role="alert">{{ getError('email') }}</span>
              }
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input id="password" [type]="showPassword() ? 'text' : 'password'" class="form-control has-icon-left has-icon-right" [class.is-invalid]="isInvalid('password')" formControlName="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" autocomplete="new-password"/>
                <button type="button" class="input-icon input-icon--right" (click)="togglePassword()" [attr.aria-label]="showPassword() ? 'Hide' : 'Show'">
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
              @if (!loading()) { Create account } @else { Creating account… }
            </button>
          </form>

          <div class="divider" style="margin:24px 0;">or</div>

          <p style="text-align:center;font-size:0.875rem;color:#6b7280;">
            Already have an account?
            <a routerLink="/login" class="btn btn--link" style="font-size:0.875rem;">Sign in</a>
          </p>
          <p style="text-align:center;font-size:0.875rem;color:#6b7280;margin-top:8px;">
            Own a turf?
            <a routerLink="/register/owner" class="btn btn--link" style="font-size:0.875rem;">Register as owner →</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly showPassword = signal(false);

  togglePassword(): void { this.showPassword.update(v => !v); }

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator]],
    phone: ['', [Validators.pattern(/^\+?[0-9]{7,15}$/)]],
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
    if (ctrl.errors['minlength']) return `Must be at least ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['maxlength']) return `Must be ${ctrl.errors['maxlength'].requiredLength} characters or fewer.`;
    if (ctrl.errors['pattern']) return 'Please enter a valid phone number.';
    if (ctrl.errors['uppercase']) return 'Password must contain at least one uppercase letter.';
    if (ctrl.errors['number']) return 'Password must contain at least one number.';
    return 'Invalid value.';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');

    const { name, email, password, phone } = this.form.value;
    this.authService.registerCustomer({ name: name!, email: email!, password: password!, phone: phone || undefined }).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.toastService.success('Account created!', `Welcome to TurfX, ${data.user.name}!`);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
