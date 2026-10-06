import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { TurfService } from '../../../core/services/turf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament, CreateTournamentDto, TournamentStatus } from '../../../core/models/tournament.model';
import { Turf, SPORT_TYPE_LABELS, SportType } from '../../../core/models/turf.model';

@Component({
  selector: 'app-owner-tournament-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:680px;">

          <a routerLink="/owner/tournaments"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Tournaments
          </a>

          <div class="page-header">
            <h1 class="page-header__title">{{ isEdit ? 'Edit Tournament' : 'New Tournament' }}</h1>
          </div>

          @if (loadingData()) {
            <div style="display:flex;justify-content:center;padding:64px;"><div class="spinner"></div></div>
          }

          @if (!loadingData()) {
            <div class="card">
              <div class="card__body">
                <form class="form-stack" (ngSubmit)="submit()" #f="ngForm" novalidate>

                  <!-- Turf selector -->
                  <div class="form-group">
                    <label class="form-label">Turf <span class="required">*</span></label>
                    @if (!isEdit && turfs().length === 0) {
                      <div class="alert alert--warning" style="font-size:0.875rem;">
                        You need at least one approved turf to create a tournament.
                        <a routerLink="/owner/turfs/new" class="btn btn--link" style="font-size:inherit;">Add turf</a>
                      </div>
                    } @else {
                      <select class="form-control" [(ngModel)]="form.turfId" name="turfId" [disabled]="isEdit" required>
                        <option value="">Select a turf…</option>
                        @for (turf of turfs(); track turf.id) {
                          <option [value]="turf.id">{{ turf.name }}</option>
                        }
                      </select>
                      @if (isEdit) {
                        <p class="form-hint">Venue is set to this turf.</p>
                      }
                    }
                  </div>

                  <!-- Name -->
                  <div class="form-group">
                    <label class="form-label">Tournament name <span class="required">*</span></label>
                    <input class="form-control" type="text" [(ngModel)]="form.name" name="name"
                           placeholder="e.g. Summer Box Cricket Championship" maxlength="120" required />
                  </div>

                  <!-- Sport -->
                  <div class="form-group">
                    <label class="form-label">Sport <span class="required">*</span></label>
                    <select class="form-control" [(ngModel)]="form.sport" name="sport" required>
                      <option value="">Select sport…</option>
                      @for (s of sportOptions; track s.value) {
                        <option [value]="s.value">{{ s.label }}</option>
                      }
                    </select>
                  </div>

                  <!-- Date + Time row -->
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Date <span class="required">*</span></label>
                      <input class="form-control" type="date" [(ngModel)]="form.date" name="date"
                             [min]="today" required />
                      <p class="form-hint">Cannot be a past date.</p>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Start time <span class="required">*</span></label>
                      <input class="form-control" type="time" [(ngModel)]="form.startTime" name="startTime" required />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">End time <span class="required">*</span></label>
                      <input class="form-control" type="time" [(ngModel)]="form.endTime" name="endTime" required />
                      @if (endTimeError()) {
                        <span class="form-error" role="alert">End time must be after start time.</span>
                      }
                    </div>
                    <div class="form-group">
                      <label class="form-label">Max participants <span class="required">*</span></label>
                      <input class="form-control" type="number" [(ngModel)]="form.maxParticipants" name="maxParticipants"
                             min="2" max="500" required />
                    </div>
                  </div>

                  <!-- Entry fee -->
                  <div class="form-group">
                    <label class="form-label">Entry fee (₹)</label>
                    <input class="form-control" type="number" [(ngModel)]="form.entryFee" name="entryFee"
                           min="0" placeholder="0 for free" />
                    <p class="form-hint">Leave 0 for free entry. Fee is collected at the venue.</p>
                  </div>

                  <!-- Prize info -->
                  <div class="form-group">
                    <label class="form-label">Prize / Reward</label>
                    <input class="form-control" type="text" [(ngModel)]="form.prizeInfo" name="prizeInfo"
                           placeholder="e.g. Trophy + ₹5000 cash prize" maxlength="500" />
                  </div>

                  <!-- Description -->
                  <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" [(ngModel)]="form.description" name="description"
                              rows="4" maxlength="2000"
                              placeholder="Rules, format, what to bring…"></textarea>
                  </div>

                  <!-- Status (edit only) -->
                  @if (isEdit) {
                    <div class="form-group">
                      <label class="form-label">Status <span class="required">*</span></label>
                      <select class="form-control" [(ngModel)]="form.status" name="status" required>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  }

                  @if (serverError()) {
                    <div class="alert alert--error" role="alert">{{ serverError() }}</div>
                  }

                  <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <button type="submit" class="btn btn--primary btn--lg"
                      [class.loading]="submitting()"
                      [disabled]="submitting() || f.invalid || (!isEdit && !form.turfId)">
                      @if (!submitting()) { {{ isEdit ? 'Save changes' : 'Create tournament' }} }
                      @else { Saving… }
                    </button>
                    <a routerLink="/owner/tournaments" class="btn btn--ghost btn--lg">Cancel</a>
                  </div>

                </form>
              </div>
            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .form-stack { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      @media (max-width: 540px) { grid-template-columns: 1fr; } }
  `],
})
export class OwnerTournamentFormComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly turfService       = inject(TurfService);
  private readonly toastService      = inject(ToastService);
  private readonly route             = inject(ActivatedRoute);
  private readonly router            = inject(Router);

  readonly turfs       = signal<Turf[]>([]);
  readonly loadingData = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal('');
  readonly endTimeError = signal(false);

  /** Today in YYYY-MM-DD — used as [min] on the date input. */
  readonly today = new Date().toISOString().slice(0, 10);

  isEdit = false;
  editId = '';

  form: CreateTournamentDto & { status?: TournamentStatus } = {
    turfId: '', name: '', description: '', sport: 'cricket',
    date: '', startTime: '', endTime: '',
    maxParticipants: 16, entryFee: 0, prizeInfo: '',
    status: 'upcoming',
  };

  readonly sportOptions = Object.entries(SPORT_TYPE_LABELS).map(([value, label]) => ({
    value: value as SportType, label,
  }));

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEdit = !!this.editId;

    // Always load owner's approved turfs for the selector
    this.turfService.getOwnerTurfs().subscribe({
      next: (d) => {
        const approved = d.turfs.filter(t => t.status === 'approved' && t.isActive);
        this.turfs.set(approved);
        if (!this.isEdit && approved.length === 1 && !this.form.turfId) {
          this.form.turfId = approved[0].id;
        }
      },
    });

    if (this.isEdit) {
      this.loadingData.set(true);
      this.tournamentService.getOwnerTournament(this.editId).subscribe({
        next: (t) => {
          this.form = {
            turfId:          t.turfId,
            name:            t.name,
            description:     t.description || '',
            sport:           t.sport,
            date:            t.date,
            startTime:       t.startTime,
            endTime:         t.endTime,
            maxParticipants: t.maxParticipants,
            entryFee:        t.entryFee,
            prizeInfo:       t.prizeInfo || '',
            status:          t.status,
          };
          if (t.turf && !this.turfs().some(x => x.id === t.turfId)) {
            this.turfs.update(list => [{
              id: t.turf!.id,
              name: t.turf!.name,
              address: t.turf!.address,
              images: t.turf!.images,
            } as Turf, ...list]);
          }
          this.loadingData.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loadingData.set(false);
          this.serverError.set(err.error?.message ?? 'Could not load tournament details.');
          this.toastService.error('Could not load tournament details.');
        },
      });
    }
  }

  submit(): void {
    this.serverError.set('');
    this.endTimeError.set(false);

    // Validate: date must not be in the past
    if (this.form.date && this.form.date < this.today) {
      this.serverError.set('Tournament date cannot be in the past.');
      return;
    }

    // Validate: end time must be after start time
    if (this.form.startTime && this.form.endTime && this.form.endTime <= this.form.startTime) {
      this.endTimeError.set(true);
      return;
    }

    this.submitting.set(true);
    const op = this.isEdit
      ? this.tournamentService.update(this.editId, this.form)
      : this.tournamentService.create(this.form);

    op.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success(this.isEdit ? 'Tournament updated' : 'Tournament created');
        this.router.navigate(['/owner/tournaments']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }
}
