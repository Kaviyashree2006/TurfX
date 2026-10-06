import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament, TournamentStatus } from '../../../core/models/tournament.model';
import { SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:860px;">

          <a routerLink="/tournaments"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Tournaments
          </a>

          @if (loading()) {
            <div style="display:flex;justify-content:center;padding:64px;">
              <div class="spinner"></div>
            </div>
          }

          @if (!loading() && !tournament()) {
            <div class="empty-state">
              <div class="empty-state__title">Tournament not found</div>
              <a routerLink="/tournaments" class="btn btn--primary" style="margin-top:8px;">Browse tournaments</a>
            </div>
          }

          @if (!loading() && tournament()) {
            <div style="display:grid;grid-template-columns:1fr 320px;gap:32px;align-items:start;@media(max-width:768px){grid-template-columns:1fr}">

              <!-- Left: details -->
              <div>
                <!-- Status + sport -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span class="badge badge--{{ statusBadge(tournament()!.status) }}">{{ tournament()!.status }}</span>
                  <span class="badge badge--neutral">{{ sportLabel(tournament()!.sport) }}</span>
                </div>

                <h1 style="font-size:1.75rem;font-weight:800;color:#111827;line-height:1.2;margin-bottom:8px;">{{ tournament()!.name }}</h1>

                @if (tournament()!.turf) {
                  <p style="font-size:0.9375rem;color:#6b7280;display:flex;align-items:center;gap:5px;margin-bottom:20px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ tournament()!.turf!.name }}{{ tournament()!.turf!.address.city ? ' · ' + tournament()!.turf!.address.city : '' }}
                  </p>
                }

                <!-- Key info grid -->
                <div class="detail-grid" style="margin-bottom:24px;">
                  <div class="detail-grid__item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <div><div class="detail-grid__label">Date</div><div class="detail-grid__value">{{ formatDate(tournament()!.date) }}</div></div>
                  </div>
                  <div class="detail-grid__item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <div><div class="detail-grid__label">Time</div><div class="detail-grid__value">{{ tournament()!.startTime }} – {{ tournament()!.endTime }}</div></div>
                  </div>
                  <div class="detail-grid__item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <div><div class="detail-grid__label">Participants</div><div class="detail-grid__value">{{ tournament()!.participantCount }} / {{ tournament()!.maxParticipants }}</div></div>
                  </div>
                  <div class="detail-grid__item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <div><div class="detail-grid__label">Entry Fee</div><div class="detail-grid__value">{{ tournament()!.entryFee > 0 ? '₹' + tournament()!.entryFee : 'Free' }}</div></div>
                  </div>
                </div>

                @if (tournament()!.description) {
                  <div style="margin-bottom:24px;">
                    <h2 style="font-size:1rem;font-weight:700;color:#111827;margin-bottom:8px;">About this tournament</h2>
                    <p style="color:#4b5563;line-height:1.7;white-space:pre-wrap;">{{ tournament()!.description }}</p>
                  </div>
                }

                @if (tournament()!.prizeInfo) {
                  <div class="card" style="margin-bottom:24px;">
                    <div class="card__body" style="display:flex;align-items:flex-start;gap:12px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                      <div>
                        <div style="font-weight:700;color:#111827;margin-bottom:4px;">Prize / Reward</div>
                        <p style="color:#4b5563;font-size:0.9375rem;">{{ tournament()!.prizeInfo }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Right: registration card -->
              <aside>
                <div class="card" style="position:sticky;top:80px;">
                  <div class="card__body" style="display:flex;flex-direction:column;gap:16px;">

                    <!-- Capacity bar -->
                    <div>
                      <div style="display:flex;justify-content:space-between;font-size:0.875rem;color:#6b7280;margin-bottom:6px;">
                        <span>Spots filled</span>
                        <strong style="color:#111827;">{{ tournament()!.participantCount }}/{{ tournament()!.maxParticipants }}</strong>
                      </div>
                      <div style="background:#f3f4f6;border-radius:99px;height:8px;overflow:hidden;">
                        <div [style.width]="capacityPct() + '%'"
                             [style.background]="capacityPct() >= 90 ? '#dc2626' : capacityPct() >= 70 ? '#d97706' : '#16a34a'"
                             style="height:100%;border-radius:99px;transition:width 300ms;">
                        </div>
                      </div>
                    </div>

                    @if (serverError()) {
                      <div class="alert alert--error" role="alert" style="font-size:0.875rem;">{{ serverError() }}</div>
                    }

                    <!-- Registered state -->
                    @if (tournament()!.isRegistered || justRegistered()) {
                      <div class="alert alert--success">
                        <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span><strong>You're registered!</strong></span>
                      </div>
                      @if (tournament()!.status === 'upcoming') {
                        <button class="btn btn--ghost btn--full"
                          [class.loading]="submitting()"
                          [disabled]="submitting()"
                          (click)="unregister()">
                          @if (!submitting()) { Withdraw registration } @else { Withdrawing… }
                        </button>
                      }
                    }

                    <!-- Not registered -->
                    @if (!tournament()!.isRegistered && !justRegistered()) {
                      @if (tournament()!.status === 'upcoming') {
                        @if (tournament()!.participantCount >= tournament()!.maxParticipants) {
                          <div class="alert alert--error">Tournament is full.</div>
                        } @else if (isCustomer()) {
                          <button class="btn btn--primary btn--full btn--lg"
                            [class.loading]="submitting()"
                            [disabled]="submitting()"
                            (click)="register()">
                            @if (!submitting()) {
                              Register — {{ tournament()!.entryFee > 0 ? '₹' + tournament()!.entryFee : 'Free' }}
                            } @else { Registering… }
                          </button>
                        } @else if (!currentUser) {
                          <a routerLink="/login" class="btn btn--primary btn--full btn--lg">Log in to register</a>
                        } @else {
                          <div class="alert alert--info" style="font-size:0.875rem;">
                            Only customer accounts can register for tournaments.
                          </div>
                        }
                      } @else {
                        <div class="alert alert--info" style="font-size:0.875rem;">
                          Registration is closed for this tournament.
                        </div>
                      }
                    }

                    @if (tournament()!.entryFee > 0) {
                      <p style="font-size:0.75rem;color:#9ca3af;text-align:center;">
                        Entry fee collected at the venue on the day of the tournament.
                      </p>
                    }
                  </div>
                </div>
              </aside>

            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .detail-grid__item {
      display: flex; align-items: flex-start; gap: 10px;
      background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 14px;
    }
    .detail-grid__label { font-size: 0.75rem; color: #6b7280; font-weight: 500; }
    .detail-grid__value { font-size: 0.9375rem; font-weight: 700; color: #111827; }
  `],
})
export class TournamentDetailComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly authService       = inject(AuthService);
  private readonly toastService      = inject(ToastService);
  private readonly route             = inject(ActivatedRoute);

  readonly tournament   = signal<Tournament | null>(null);
  readonly loading      = signal(true);
  readonly submitting   = signal(false);
  readonly serverError  = signal('');
  readonly justRegistered = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tournamentService.getById(id).subscribe({
      next:  (t) => { this.tournament.set(t); this.loading.set(false); },
      error: ()  => { this.tournament.set(null); this.loading.set(false); },
    });
  }

  get currentUser() {
    return this.authService.currentUser;
  }

  isCustomer(): boolean {
    return this.authService.currentUser?.role === 'customer';
  }

  /** True when the tournament date is in the past (regardless of stored status). */
  isExpired(): boolean {
    const t = this.tournament();
    if (!t) return false;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const tDate = new Date(t.date + 'T00:00:00'); tDate.setUTCHours(0, 0, 0, 0);
    return tDate < today;
  }

  get currentUser() { return this.authService.currentUser; }

  capacityPct(): number {
    const t = this.tournament();
    if (!t || t.maxParticipants === 0) return 0;
    return Math.min(100, Math.round((t.participantCount / t.maxParticipants) * 100));
  }

  sportLabel(s: string): string { return SPORT_TYPE_LABELS[s as keyof typeof SPORT_TYPE_LABELS] ?? s; }

  statusBadge(s: TournamentStatus): string {
    return s === 'upcoming' ? 'info' : s === 'ongoing' ? 'warning' : s === 'completed' ? 'success' : 'neutral';
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  register(): void {
    const id = this.tournament()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.serverError.set('');
    this.tournamentService.register(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.justRegistered.set(true);
        this.tournament.update(t => t ? { ...t, participantCount: t.participantCount + 1, isRegistered: true } : t);
        this.toastService.success('Registered!', 'You are now registered for this tournament.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }

  unregister(): void {
    const id = this.tournament()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.serverError.set('');
    this.tournamentService.unregister(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.justRegistered.set(false);
        this.tournament.update(t => t ? { ...t, participantCount: Math.max(0, t.participantCount - 1), isRegistered: false } : t);
        this.toastService.success('Withdrawn', 'Your registration has been cancelled.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.message ?? 'Failed to withdraw. Please try again.');
      },
    });
  }
}
