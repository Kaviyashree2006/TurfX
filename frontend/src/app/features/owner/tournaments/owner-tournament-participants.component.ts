import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { Participant } from '../../../core/models/tournament.model';

@Component({
  selector: 'app-owner-tournament-participants',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:760px;">

          <a routerLink="/owner/tournaments"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Tournaments
          </a>

          @if (loading()) {
            <div style="display:flex;justify-content:center;padding:64px;"><div class="spinner"></div></div>
          }

          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              Failed to load participants.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

          @if (!loading() && !loadError()) {
            <div class="page-header" style="margin-bottom:24px;">
              <h1 class="page-header__title">{{ tournamentName() }}</h1>
              <p class="page-header__subtitle">{{ participants().length }} participant{{ participants().length !== 1 ? 's' : '' }} registered</p>
            </div>

            @if (participants().length === 0) {
              <div class="empty-state">
                <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <div class="empty-state__title">No registrations yet</div>
                <p class="empty-state__description">Share your tournament to get participants registered.</p>
              </div>
            } @else {
              <div class="owners-table-wrap">
                <table class="owners-table" aria-label="Participants">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of participants(); track p.id; let i = $index) {
                      <tr class="owner-row">
                        <td style="color:#9ca3af;font-size:0.8125rem;">{{ i + 1 }}</td>
                        <td style="font-weight:600;color:#111827;">{{ p.user?.name ?? '—' }}</td>
                        <td style="color:#6b7280;font-size:0.875rem;">{{ p.user?.email ?? '—' }}</td>
                        <td style="color:#6b7280;font-size:0.875rem;">{{ p.phone || p.user?.phone || '—' }}</td>
                        <td style="color:#6b7280;font-size:0.8125rem;white-space:nowrap;">{{ formatDate(p.registeredAt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .owners-table-wrap { background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.05); }
    .owners-table { width:100%;border-collapse:collapse;font-size:0.875rem; }
    .owners-table th { padding:12px 16px;text-align:left;font-size:0.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;background:#f9fafb;border-bottom:1px solid #e5e7eb; }
    .owners-table td { padding:14px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle; }
    .owner-row:last-child td { border-bottom:none; }
    .owner-row:hover td { background:#fafafa; }
    @media(max-width:600px) { .owners-table th:nth-child(3),.owners-table td:nth-child(3) { display:none; } }
  `],
})
export class OwnerTournamentParticipantsComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly route             = inject(ActivatedRoute);

  readonly participants   = signal<Participant[]>([]);
  readonly tournamentName = signal('Participants');
  readonly loading        = signal(true);
  readonly loadError      = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tournamentService.getParticipants(id).subscribe({
      next: (d) => {
        this.participants.set(d.participants);
        this.tournamentName.set(d.tournamentName + ' — Participants');
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  formatDate(iso: string): string {
    return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }
}
