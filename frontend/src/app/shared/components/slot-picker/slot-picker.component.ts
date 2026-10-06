import {
  Component, Input, Output, EventEmitter,
  signal, computed, OnInit, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BookingService } from '../../../core/services/booking.service';
import { Slot, AvailabilityResponse } from '../../../core/models/booking.model';

@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="slot-picker">

      <!-- Date selector -->
      <div class="slot-picker__date-row">
        <div class="form-group" style="max-width:200px;">
          <label class="form-label">Select date</label>
          <input
            type="date"
            class="form-control"
            [value]="selectedDate()"
            [min]="minDate"
            [max]="maxDate"
            (change)="onDateChange($event)"
            aria-label="Pick a date"
          />
        </div>

        @if (loading()) {
          <div style="display:flex;align-items:center;gap:8px;color:#6b7280;font-size:0.875rem;margin-top:24px;">
            <div class="spinner spinner--sm"></div>
            Loading availability…
          </div>
        }
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="alert alert--error" role="alert" style="margin-top:12px;">
          <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error() }}
        </div>
      }

      <!-- Blackout -->
      @if (!loading() && availability() && availability()!.blackout) {
        <div class="alert alert--warning" style="margin-top:12px;">
          <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          This turf is unavailable on the selected date (maintenance / blackout).
        </div>
      }

      <!-- Slot grid -->
      @if (!loading() && slots().length > 0) {
        <div class="slot-picker__legend">
          <span class="slot-legend slot-legend--available">Available</span>
          <span class="slot-legend slot-legend--selected">Selected</span>
          <span class="slot-legend slot-legend--booked">Booked</span>
        </div>

        <div class="slot-grid" role="group" [attr.aria-label]="'Slots for ' + selectedDate()">
          @for (slot of slots(); track slot.startTime) {
            <button
              type="button"
              class="slot-btn"
              [class.slot-btn--available]="slot.available && selectedSlot()?.startTime !== slot.startTime"
              [class.slot-btn--selected]="selectedSlot()?.startTime === slot.startTime"
              [class.slot-btn--booked]="!slot.available"
              [disabled]="!slot.available"
              (click)="selectSlot(slot)"
              [attr.aria-pressed]="selectedSlot()?.startTime === slot.startTime"
              [attr.aria-label]="slot.startTime + ' – ' + slot.endTime + ', ₹' + slot.price + (slot.available ? '' : ', unavailable')"
            >
              <span class="slot-btn__time">{{ slot.startTime }}</span>
              <span class="slot-btn__price">₹{{ slot.price }}</span>
            </button>
          }
        </div>
      }

      <!-- No slots -->
      @if (!loading() && !error() && availability() && !availability()!.blackout && slots().length === 0) {
        <div class="empty-state" style="padding:32px 16px;">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div class="empty-state__title">No slots today</div>
          <p class="empty-state__description">This turf has no available slots configured. Try a different date.</p>
        </div>
      }

      <!-- Selected summary -->
      @if (selectedSlot()) {
        <div class="slot-picker__summary">
          <div class="slot-summary-card">
            <div class="slot-summary-card__info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{{ formatDate(selectedDate()) }} · {{ selectedSlot()!.startTime }} – {{ selectedSlot()!.endTime }}</span>
            </div>
            <div class="slot-summary-card__price">₹{{ selectedSlot()!.price }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .slot-picker { display: flex; flex-direction: column; gap: 16px; }

    .slot-picker__date-row {
      display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap;
    }

    /* Legend */
    .slot-picker__legend {
      display: flex; gap: 16px; flex-wrap: wrap;
    }
    .slot-legend {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.75rem; font-weight: 600; color: #6b7280;
      &::before {
        content: ''; display: inline-block;
        width: 12px; height: 12px; border-radius: 3px;
      }
    }
    .slot-legend--available::before { background: #f0fdf4; border: 1.5px solid #16a34a; }
    .slot-legend--selected::before  { background: #16a34a; }
    .slot-legend--booked::before    { background: #f3f4f6; border: 1.5px solid #d1d5db; }

    /* Grid */
    .slot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 8px;
    }

    /* Slot button */
    .slot-btn {
      display: flex; flex-direction: column; align-items: center;
      padding: 10px 6px; border-radius: 8px;
      border: 1.5px solid transparent;
      background: #f9fafb; cursor: pointer;
      transition: all 150ms ease; font-family: inherit;
      outline: none;

      &:focus-visible {
        outline: 2px solid #16a34a; outline-offset: 2px;
      }

      &--available {
        background: #f0fdf4; border-color: #bbf7d0; color: #15803d;
        &:hover { background: #dcfce7; border-color: #16a34a; }
      }

      &--selected {
        background: #16a34a; border-color: #16a34a; color: white;
        box-shadow: 0 0 0 3px rgba(22,163,74,0.2);
      }

      &--booked {
        background: #f3f4f6; border-color: #e5e7eb; color: #9ca3af;
        cursor: not-allowed; opacity: 0.6;
      }
    }

    .slot-btn__time {
      font-size: 0.8125rem; font-weight: 700; line-height: 1.2;
    }
    .slot-btn__price {
      font-size: 0.6875rem; font-weight: 500; margin-top: 2px;
      opacity: 0.85;
    }

    /* Summary */
    .slot-picker__summary { margin-top: 4px; }
    .slot-summary-card {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
      background: #f0fdf4; border: 1.5px solid #bbf7d0;
      border-radius: 10px; padding: 12px 16px;
    }
    .slot-summary-card__info {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.9rem; font-weight: 600; color: #15803d;
    }
    .slot-summary-card__price {
      font-size: 1.125rem; font-weight: 800; color: #15803d;
    }
  `],
})
export class SlotPickerComponent implements OnInit, OnChanges {
  private readonly bookingService = inject(BookingService);

  @Input({ required: true }) turfId!: string;
  @Input() initialDate?: string;

  @Output() slotSelected = new EventEmitter<{ date: string; slot: Slot } | null>();

  readonly loading      = signal(false);
  readonly error        = signal('');
  readonly availability = signal<AvailabilityResponse | null>(null);
  readonly selectedDate = signal<string>('');
  readonly selectedSlot = signal<Slot | null>(null);

  readonly slots = computed(() => this.availability()?.slots ?? []);

  /** Today in YYYY-MM-DD */
  readonly minDate = new Date().toISOString().slice(0, 10);
  /** 60 days ahead */
  readonly maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  })();

  ngOnInit(): void {
    const date = this.initialDate ?? this.minDate;
    this.selectedDate.set(date);
    this._load(date);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['turfId'] && !changes['turfId'].firstChange) {
      this._load(this.selectedDate());
    }
  }

  onDateChange(e: Event): void {
    const date = (e.target as HTMLInputElement).value;
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.slotSelected.emit(null);
    this._load(date);
  }

  selectSlot(slot: Slot): void {
    if (!slot.available) return;
    this.selectedSlot.set(slot);
    this.slotSelected.emit({ date: this.selectedDate(), slot });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  private _load(date: string): void {
    if (!this.turfId || !date) return;
    this.loading.set(true);
    this.error.set('');
    this.availability.set(null);

    this.bookingService.getAvailability(this.turfId, date).subscribe({
      next: (data) => {
        this.availability.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not load availability. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
