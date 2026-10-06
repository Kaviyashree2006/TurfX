import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../../core/models/tournament.model';
import { SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

type Filter = 'all' | 'my' | TournamentStatus;

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header">
            <h1 class="page-header__title">Tournaments</h1>
            <p class="page-header__subtitle">Find and register for upcoming tournaments near you.</p>
          </div>

          <!-- Status filter tabs -->
          <div class="filter-tabs" style="margin-bottom:24px;">
            @for (tab of tabs; track tab.value) {
              <button
                class="filter-tab"
                [class.active]="activeFilter() === tab.value"
                (click)="setFilter(tab.value)"
              >{{ tab.label }}</button>
            }
          </div>

          <!-- Loading skeletons -->
          @if (loading()) {
            <div class="tournament-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="tournament-card tournament-card--skeleton">
                  <div class="skeleton" style="height:160px;border-radius:10px 10px 0 0;"></div>
                  <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--text"></div>
                    <div class="skeleton skeleton--text" style="width:60%;"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load tournaments.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && tournaments().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 7V4a2 2 0 0 0-2-2H4"/><path d="M22 13H10"/></svg>
              <div class="empty-state__title">No tournaments found</div>
              <p class="empty-state__description">
                {{ activeFilter() === 'all' ? 'No tournaments have been created yet.' : activeFilter() === 'my' ? "You haven't registered for any tournaments yet." : 'No ' + activeFilter() + ' tournaments.' }}
              </p>
            </div>
          }

          <!-- Tournament grid -->
          @if (!loading() && !loadError() && tournaments().length > 0) {
            <div class="tournament-grid">
              @for (t of tournaments(); track t.id) {
                <a [routerLink]="['/tournaments', t.id]" class="tournament-card">
                  <!-- Turf image -->
                  <div class="tournament-card__image">
                    @if (t.turf?.images?.length) {
                      <img [src]="t.turf!.images[0]" [alt]="t.turf!.name" loading="lazy"/>
                    } @else {
                      <div class="tournament-card__image-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/></svg>
                      </div>
                    }
                    <span class="badge badge--{{ statusBadge(t.status) }} tournament-card__status-badge">{{ t.status }}</span>
                  </div>

                  <div class="tournament-card__body">
                    <div class="tournament-card__sport">{{ sportLabel(t.sport) }}</div>
                    <h3 class="tournament-card__name">{{ t.name }}</h3>
                    @if (t.turf) {
                      <p class="tournament-card__turf">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {{ t.turf.name }}{{ t.turf.address.city ? ' · ' + t.turf.address.city : '' }}
                      </p>
                    }
                    <div class="tournament-card__meta">
                      <span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {{ formatDate(t.date) }}
                      </span>
                      <span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {{ t.startTime }} – {{ t.endTime }}
                      </span>
                    </div>
                    <div class="tournament-card__footer">
                      <span class="tournament-card__participants">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {{ t.participantCount }}/{{ t.maxParticipants }}
                      </span>
                      <span class="tournament-card__fee">
                        {{ t.entryFee > 0 ? '₹' + t.entryFee : 'Free' }}
                      </span>
                    </div>
                  </div>
                </a>
              }
            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .filter-tabs {
      display: flex; gap: 4px; flex-wrap: wrap;
      background: #f3f4f6; padding: 4px; border-radius: 10px; width: fit-content;
    }
    .filter-tab {
      padding: 6px 14px; font-size: 0.8125rem; font-weight: 600; font-family: inherit;
      color: #6b7280; background: none; border: none; border-radius: 7px; cursor: pointer;
      transition: background 150ms, color 150ms; white-space: nowrap;
      &:hover { background: #e5e7eb; color: #374151; }
      &.active { background: white; color: #111827; box-shadow: 0 1px 3px rgb(0 0 0/.1); }
    }
    .tournament-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .tournament-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      overflow: hidden; text-decoration: none; color: inherit;
      box-shadow: 0 1px 2px rgb(0 0 0/.05); transition: box-shadow 200ms, transform 200ms;
      display: flex; flex-direction: column;
      &:hover { box-shadow: 0 8px 16px rgb(0 0 0/.08); transform: translateY(-2px); }
    }
    .tournament-card__image {
      height: 160px; overflow: hidden; background: #f3f4f6; position: relative;
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }
    .tournament-card__image-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    }
    .tournament-card__status-badge {
      position: absolute; top: 10px; right: 10px; font-size: 0.6875rem;
    }
    .tournament-card__body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .tournament-card__sport { font-size: 0.75rem; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 0.04em; }
    .tournament-card__name { font-size: 1rem; font-weight: 700; color: #111827; line-height: 1.3; }
    .tournament-card__turf { font-size: 0.8125rem; color: #6b7280; display: flex; align-items: center; gap: 4px; }
    .tournament-card__meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.8125rem; color: #6b7280; margin-top: 4px; span { display: flex; align-items: center; gap: 4px; } }
    .tournament-card__footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid #f3f4f6; }
    .tournament-card__participants { font-size: 0.8125rem; color: #6b7280; display: flex; align-items: center; gap: 4px; }
    .tournament-card__fee { font-size: 0.9375rem; font-weight: 700; color: #111827; }
  `],
})
export class TournamentListComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly authService       = inject(AuthService);

  readonly tournaments = signal<Tournament[]>([]);
  readonly loading     = signal(true);
  readonly loadError   = signal(false);
  readonly activeFilter = signal<Filter>('upcoming');

  get tabs(): { label: string; value: Filter }[] {
    const list: { label: string; value: Filter }[] = [
      { label: 'Upcoming',  value: 'upcoming' },
      { label: 'Ongoing',   value: 'ongoing' },
      { label: 'Completed', value: 'completed' },
      { label: 'All',       value: 'all' },
    ];
    if (this.authService.currentUser?.role === 'customer') {
      list.push({ label: 'My Registrations', value: 'my' });
    }
    return list;
  }

  ngOnInit(): void { this.load(); }

  setFilter(f: Filter): void { this.activeFilter.set(f); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    if (this.activeFilter() === 'my') {
      this.tournamentService.getMyRegistrations().subscribe({
        next: (d) => {
          this.tournaments.set(d.registrations.map(r => ({ ...r.tournament, isRegistered: true })));
          this.loading.set(false);
        },
        error: () => { this.loadError.set(true); this.loading.set(false); },
      });
      return;
    }

    const status = this.activeFilter() === 'all' ? undefined : this.activeFilter();
    this.tournamentService.getAll({ status }).subscribe({
      next: (d) => { this.tournaments.set(d.tournaments); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
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
