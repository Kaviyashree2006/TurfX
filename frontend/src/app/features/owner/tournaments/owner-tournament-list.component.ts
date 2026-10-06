import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament, TournamentStatus } from '../../../core/models/tournament.model';
import { SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

@Component({
  selector: 'app-owner-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">My Tournaments</h1>
              <p class="page-header__subtitle">Create and manage tournaments for your turfs.</p>
            </div>
            <a routerLink="/owner/tournaments/new" class="btn btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New tournament
            </a>
          </div>

          @if (loading()) {
            <div style="display:flex;flex-direction:column;gap:12px;">
              @for (i of [1,2,3]; track i) {
                <div class="turf-row-skeleton">
                  <div class="skeleton" style="width:64px;height:64px;border-radius:8px;flex-shrink:0;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--text" style="width:40%;"></div>
                  </div>
                </div>
              }
            </div>
          }

          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              Failed to load tournaments.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

          @if (!loading() && !loadError() && tournaments().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 7V4a2 2 0 0 0-2-2H4"/></svg>
              <div class="empty-state__title">No tournaments yet</div>
              <p class="empty-state__description">Create your first tournament to start accepting registrations.</p>
              <a routerLink="/owner/tournaments/new" class="btn btn--primary" style="margin-top:8px;">Create tournament</a>
            </div>
          }

          @if (!loading() && !loadError() && tournaments().length > 0) {
            <div class="turf-list">
              @for (t of tournaments(); track t.id) {
                <div class="turf-list-item">
                  <!-- Info -->
                  <div class="turf-list-item__info" style="flex:1;min-width:0;">
                    <div class="turf-list-item__name">{{ t.name }}</div>
                    <div class="turf-list-item__meta">
                      {{ sportLabel(t.sport) }}
                      @if (t.turf?.address?.city) { · {{ t.turf!.address.city }} }
                      · {{ formatDate(t.date) }}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
                      <span class="badge badge--{{ statusBadge(t.status) }}">{{ t.status }}</span>
                      <span style="font-size:0.8125rem;color:#6b7280;">
                        {{ t.participantCount }}/{{ t.maxParticipants }} registered
                      </span>
                      @if (t.entryFee > 0) {
                        <span style="font-size:0.8125rem;color:#6b7280;">· ₹{{ t.entryFee }} entry</span>
                      }
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="turf-list-item__actions">
                    <a [routerLink]="['/owner/tournaments', t.id, 'participants']" class="btn btn--ghost btn--sm">Participants</a>
                    @if (t.status !== 'cancelled' && t.status !== 'completed') {
                      <a [routerLink]="['/owner/tournaments', t.id, 'edit']" class="btn btn--ghost btn--sm">Edit</a>
                      <button class="btn btn--danger btn--sm"
                        [class.loading]="deletingId() === t.id"
                        [disabled]="!!deletingId()"
                        (click)="delete(t)">
                        {{ t.participantCount > 0 ? 'Cancel' : 'Delete' }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .turf-list { display: flex; flex-direction: column; gap: 12px; }
    .turf-list-item {
      display: flex; align-items: center; gap: 16px;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 16px; box-shadow: 0 1px 2px rgb(0 0 0/.04);
      transition: box-shadow 200ms;
      &:hover { box-shadow: 0 4px 8px rgb(0 0 0/.07); }
    }
    .turf-list-item__info { flex: 1; min-width: 0; }
    .turf-list-item__name { font-weight: 700; color: #111827; font-size: 0.9375rem; }
    .turf-list-item__meta { font-size: 0.8125rem; color: #6b7280; margin-top: 2px; }
    .turf-list-item__actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    .turf-row-skeleton {
      display: flex; align-items: center; gap: 16px;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;
    }
  `],
})
export class OwnerTournamentListComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly toastService      = inject(ToastService);

  readonly tournaments = signal<Tournament[]>([]);
  readonly loading     = signal(true);
  readonly loadError   = signal(false);
  readonly deletingId  = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.tournamentService.getOwnerTournaments().subscribe({
      next: (d) => { this.tournaments.set(d.tournaments); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  delete(t: Tournament): void {
    const label = t.participantCount > 0 ? 'cancel' : 'delete';
    if (!confirm(`Are you sure you want to ${label} "${t.name}"?`)) return;
    this.deletingId.set(t.id);
    this.tournamentService.delete(t.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toastService.success(t.participantCount > 0 ? 'Tournament cancelled' : 'Tournament deleted');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId.set(null);
        this.toastService.error('Action failed', err.error?.message);
      },
    });
  }

  sportLabel(s: string): string { return SPORT_TYPE_LABELS[s as keyof typeof SPORT_TYPE_LABELS] ?? s; }

  statusBadge(s: TournamentStatus): string {
    return s === 'upcoming' ? 'info' : s === 'ongoing' ? 'warning' : s === 'completed' ? 'success' : 'neutral';
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
