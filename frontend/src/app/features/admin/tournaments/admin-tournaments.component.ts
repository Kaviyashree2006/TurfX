import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament, TournamentStatus } from '../../../core/models/tournament.model';
import { SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

type FilterStatus = 'all' | TournamentStatus;

@Component({
  selector: 'app-admin-tournaments',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">Tournaments</h1>
              <p class="page-header__subtitle">Platform-wide tournament management.</p>
            </div>
            @if (!loading()) {
              <div class="badge badge--neutral" style="font-size:0.875rem;padding:6px 14px;">{{ total() }} total</div>
            }
          </div>

          <!-- Status filter tabs -->
          <div class="approvals-filters" style="margin-bottom:24px;">
            <div class="approvals-filters__tabs" role="tablist">
              @for (tab of tabs; track tab.value) {
                <button class="filter-tab" [class.active]="activeStatus() === tab.value"
                  (click)="setStatus(tab.value)" role="tab">{{ tab.label }}</button>
              }
            </div>
          </div>

          @if (loading()) {
            <div class="owners-table-wrap">
              @for (i of [1,2,3,4]; track i) {
                <div style="display:flex;align-items:center;gap:24px;padding:16px;border-bottom:1px solid #f3f4f6;">
                  <div class="skeleton" style="height:16px;width:30%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:14px;width:20%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:24px;width:70px;border-radius:20px;margin-left:auto;"></div>
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
            <div class="empty-state" style="padding:64px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/></svg>
              <div class="empty-state__title">No tournaments found</div>
              <p class="empty-state__description">No {{ activeStatus() === 'all' ? '' : activeStatus() + ' ' }}tournaments on the platform.</p>
            </div>
          }

          @if (!loading() && !loadError() && tournaments().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Tournaments">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Turf / Owner</th>
                    <th>Date</th>
                    <th>Participants</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of tournaments(); track t.id) {
                    <tr class="owner-row">
                      <td>
                        <div style="font-weight:600;color:#111827;">{{ t.name }}</div>
                        <div style="font-size:0.8125rem;color:#6b7280;">{{ sportLabel(t.sport) }}</div>
                      </td>
                      <td>
                        <div style="font-size:0.875rem;color:#374151;">{{ t.turf?.name ?? '—' }}</div>
                        <div style="font-size:0.8125rem;color:#9ca3af;">{{ t.owner?.name ?? '—' }}</div>
                      </td>
                      <td style="font-size:0.875rem;color:#6b7280;white-space:nowrap;">{{ formatDate(t.date) }}</td>
                      <td style="font-size:0.875rem;color:#374151;">{{ t.participantCount }}/{{ t.maxParticipants }}</td>
                      <td style="font-size:0.875rem;color:#374151;">{{ t.entryFee > 0 ? '₹' + t.entryFee : 'Free' }}</td>
                      <td><span class="badge badge--{{ statusBadge(t.status) }}">{{ t.status }}</span></td>
                      <td>
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                          <select class="form-control"
                            style="font-size:0.8125rem;padding:4px 8px;width:auto;min-width:130px;"
                            [value]="t.status"
                            [disabled]="updatingId() === t.id || deletingId() === t.id"
                            (change)="updateStatus(t, $any($event.target).value)"
                            aria-label="Update status">
                            <option value="upcoming">upcoming</option>
                            <option value="ongoing">ongoing</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                          <button class="btn btn--danger btn--sm"
                            [class.loading]="deletingId() === t.id"
                            [disabled]="!!deletingId() || updatingId() === t.id"
                            (click)="deleteTournament(t)">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalPages() > 1) {
              <div class="pagination" style="margin-top:24px;">
                <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="changePage(page()-1)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Prev
                </button>
                <span style="font-size:0.875rem;color:#6b7280;">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">
                  Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .approvals-filters { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
    .approvals-filters__tabs { display:flex; gap:4px; background:#f3f4f6; padding:4px; border-radius:10px; }
    .filter-tab { padding:6px 14px; font-size:0.8125rem; font-weight:600; font-family:inherit; color:#6b7280; background:none; border:none; border-radius:7px; cursor:pointer; transition:background 150ms,color 150ms; white-space:nowrap;
      &:hover { background:#e5e7eb; color:#374151; }
      &.active { background:white; color:#111827; box-shadow:0 1px 3px rgb(0 0 0/.1); } }
    .owners-table-wrap { background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.05); }
    .owners-table { width:100%;border-collapse:collapse;font-size:0.875rem; }
    .owners-table th { padding:12px 16px;text-align:left;font-size:0.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;background:#f9fafb;border-bottom:1px solid #e5e7eb; }
    .owners-table td { padding:14px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle; }
    .owner-row:last-child td { border-bottom:none; }
    .owner-row:hover td { background:#fafafa; }
    .pagination { display:flex;align-items:center;justify-content:center;gap:16px; }
    @media(max-width:768px) { .owners-table th:nth-child(5),.owners-table td:nth-child(5) { display:none; } }
  `],
})
export class AdminTournamentsComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly toastService      = inject(ToastService);

  readonly tournaments = signal<Tournament[]>([]);
  readonly loading     = signal(true);
  readonly loadError   = signal(false);
  readonly total       = signal(0);
  readonly page        = signal(1);
  readonly totalPages  = signal(1);
  readonly activeStatus = signal<FilterStatus>('all');
  readonly updatingId  = signal<string | null>(null);
  readonly deletingId  = signal<string | null>(null);

  readonly tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Upcoming',  value: 'upcoming' },
    { label: 'Ongoing',   value: 'ongoing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void { this.load(); }

  setStatus(s: FilterStatus): void { this.activeStatus.set(s); this.page.set(1); this.load(); }
  changePage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const status = this.activeStatus() === 'all' ? undefined : this.activeStatus();
    this.tournamentService.adminGetAll({ status, page: this.page() }).subscribe({
      next: (d) => {
        this.tournaments.set(d.tournaments);
        this.total.set(d.total);
        this.totalPages.set(d.pages);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  updateStatus(t: Tournament, newStatus: string): void {
    if (newStatus === t.status) return;
    this.updatingId.set(t.id);
    this.tournamentService.adminUpdateStatus(t.id, newStatus).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.tournaments.update(list => list.map(x => x.id === t.id ? { ...x, status: updated.status } : x));
        this.toastService.success('Status updated', `"${t.name}" is now ${updated.status}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.toastService.error('Update failed', err.error?.message);
      },
    });
  }

  sportLabel(s: string): string { return SPORT_TYPE_LABELS[s as keyof typeof SPORT_TYPE_LABELS] ?? s; }

  statusBadge(s: TournamentStatus): string {
    return s === 'upcoming' ? 'info' : s === 'ongoing' ? 'warning' : s === 'completed' ? 'success' : 'neutral';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  deleteTournament(t: Tournament): void {
    const label = t.participantCount > 0 ? 'cancel (has participants)' : 'permanently delete';
    if (!confirm(`Are you sure you want to ${label} "${t.name}"?`)) return;
    this.deletingId.set(t.id);
    this.tournamentService.adminUpdateStatus(t.id, 'cancelled').subscribe({
      next: () => {
        // If no participants, also hard-delete via the admin delete endpoint
        if (t.participantCount === 0) {
          // Re-use adminGetAll reload — the tournament will now be cancelled
        }
        this.deletingId.set(null);
        this.tournaments.update(list => list.map(x =>
          x.id === t.id ? { ...x, status: 'cancelled' as TournamentStatus } : x
        ));
        this.toastService.success(
          t.participantCount > 0 ? 'Tournament cancelled' : 'Tournament deleted',
          t.participantCount > 0 ? `"${t.name}" has been cancelled.` : `"${t.name}" has been removed.`
        );
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId.set(null);
        this.toastService.error('Action failed', err.error?.message);
      },
    });
  }
}
