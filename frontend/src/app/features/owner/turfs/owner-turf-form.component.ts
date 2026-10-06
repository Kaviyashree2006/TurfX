import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HeaderComponent } from '../../../layout/header/header.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { TurfService } from '../../../core/services/turf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turf, SportType, SPORT_TYPE_LABELS, CreateTurfDto } from '../../../core/models/turf.model';

// Validator: HH:mm
function timeValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value ?? '';
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v) ? null : { invalidTime: true };
}

const ALL_SPORT_TYPES: SportType[] = [
  'box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other',
];

const COMMON_AMENITIES = [
  'Floodlights', 'Parking', 'Washroom', 'Changing Room', 'Drinking Water',
  'First Aid', 'Seating Area', 'Canteen', 'WiFi', 'CCTV',
];

@Component({
  selector: 'app-owner-turf-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, HeaderComponent, ImageUploadComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:800px;">

          <!-- Back -->
          <a routerLink="/owner/turfs" class="back-link" style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Turfs
          </a>

          <div class="page-header">
            <h1 class="page-header__title">{{ isEdit ? 'Edit Turf' : 'Add New Turf' }}</h1>
            <p class="page-header__subtitle">
              {{ isEdit ? 'Changes to pricing, sport types, address or hours will require admin re-approval.' : 'Your listing will be reviewed by an admin before going live.' }}
            </p>
          </div>

          <!-- Loading existing turf -->
          @if (loadingTurf()) {
            <div style="display:flex;justify-content:center;padding:48px;"><div class="spinner"></div></div>
          }

          @if (!loadingTurf()) {
            <!-- Re-review warning (edit mode with major fields present) -->
            @if (isEdit) {
              <div class="alert alert--warning" style="margin-bottom:24px;">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span><strong>Major fields</strong> (sport, address, pricing, hours) trigger re-review if changed on an approved turf. Minor fields (name, description, photos, amenities) save instantly.</span>
              </div>
            }

            <!-- Server error -->
            @if (serverError()) {
              <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ serverError() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-stack" novalidate>

              <!-- ── Identity ───────────────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Basic Information</h2></div>
                <div class="card__body">
                  <div class="form-stack">
                    <div class="form-group">
                      <label class="form-label">Turf name <span class="required">*</span></label>
                      <input type="text" class="form-control" [class.is-invalid]="inv('name')" formControlName="name" placeholder="e.g. Champions Cricket Arena"/>
                      @if (inv('name')) { <span class="form-error" role="alert">{{ err('name') }}</span> }
                    </div>

                    <div class="form-group">
                      <label class="form-label">Description</label>
                      <textarea class="form-control" formControlName="description" rows="3" placeholder="Describe your turf, facilities, rules…" style="resize:vertical;"></textarea>
                    </div>

                    <!-- Sport types -->
                    <div class="form-group">
                      <label class="form-label">Sport types <span class="required">*</span></label>
                      <div class="sport-chips">
                        @for (sport of allSports; track sport) {
                          <button
                            type="button"
                            class="sport-chip"
                            [class.sport-chip--active]="isSportSelected(sport)"
                            (click)="toggleSport(sport)"
                          >{{ sportLabel(sport) }}</button>
                        }
                      </div>
                      @if (isSportSelected('other')) {
                        <div class="form-group" style="margin-top:12px;">
                          <label class="form-label">Specify other sport <span class="required">*</span></label>
                          <input type="text" class="form-control" [formControl]="otherSportCtrl"
                                 placeholder="e.g. Volleyball, Kabaddi, Throwball…"
                                 maxlength="60" />
                          <p class="form-hint">This will be shown to customers in the turf description.</p>
                          @if (otherSportCtrl.invalid && otherSportCtrl.touched) {
                            <span class="form-error" role="alert">Please specify the sport name.</span>
                          }
                        </div>
                      }
                      @if (inv('sportTypes')) {
                        <span class="form-error" role="alert">Select at least one sport type.</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Location ──────────────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Location <span class="major-badge">Major field</span></h2></div>
                <div class="card__body">
                  <div class="form-stack">
                    <div class="form-group">
                      <label class="form-label">Address line 1</label>
                      <input type="text" class="form-control" formControlName="addressLine1" placeholder="Street / building name"/>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">City</label>
                        <input type="text" class="form-control" formControlName="addressCity" placeholder="Chennai"/>
                      </div>
                      <div class="form-group">
                        <label class="form-label">State</label>
                        <input type="text" class="form-control" formControlName="addressState" placeholder="Tamil Nadu"/>
                      </div>
                    </div>
                    <div class="form-group" style="max-width:200px;">
                      <label class="form-label">Pincode</label>
                      <input type="text" class="form-control" formControlName="addressPincode" placeholder="600001"/>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Pricing ───────────────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Pricing <span class="major-badge">Major field</span></h2></div>
                <div class="card__body">
                  <div class="form-stack">
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Base rate (₹/hr) <span class="required">*</span></label>
                        <div class="input-wrapper">
                          <span class="input-icon" style="font-size:0.875rem;font-weight:600;color:#374151;">₹</span>
                          <input type="number" class="form-control has-icon-left" [class.is-invalid]="inv('basePrice')" formControlName="basePrice" placeholder="600" min="0"/>
                        </div>
                        @if (inv('basePrice')) { <span class="form-error" role="alert">{{ err('basePrice') }}</span> }
                      </div>
                      <div class="form-group">
                        <label class="form-label">Weekend rate (₹/hr) <span style="color:#9ca3af;font-weight:400;">(optional)</span></label>
                        <div class="input-wrapper">
                          <span class="input-icon" style="font-size:0.875rem;font-weight:600;color:#374151;">₹</span>
                          <input type="number" class="form-control has-icon-left" formControlName="weekendPrice" placeholder="800" min="0"/>
                        </div>
                      </div>
                    </div>

                    <!-- Slot duration -->
                    <div class="form-group" style="max-width:220px;">
                      <label class="form-label">Slot duration</label>
                      <select class="form-control" formControlName="slotDurationMinutes">
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Operating hours ───────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Operating Hours <span class="major-badge">Major field</span></h2></div>
                <div class="card__body">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Opening time</label>
                      <input type="time" class="form-control" [class.is-invalid]="inv('openTime')" formControlName="openTime"/>
                      @if (inv('openTime')) { <span class="form-error" role="alert">Enter a valid time (HH:mm).</span> }
                    </div>
                    <div class="form-group">
                      <label class="form-label">Closing time</label>
                      <input type="time" class="form-control" [class.is-invalid]="inv('closeTime')" formControlName="closeTime"/>
                      @if (inv('closeTime')) { <span class="form-error" role="alert">Enter a valid time (HH:mm).</span> }
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Amenities ──────────────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Facilities</h2></div>
                <div class="card__body">
                  <p class="form-hint" style="margin-bottom:12px;">Select all that apply. These save immediately without requiring re-review.</p>
                  <div class="amenity-grid">
                    @for (a of commonAmenities; track a) {
                      <label class="amenity-chip">
                        <input
                          type="checkbox"
                          [checked]="isAmenitySelected(a)"
                          (change)="toggleAmenity(a)"
                          class="sr-only"
                        />
                        <span class="amenity-chip__inner" [class.amenity-chip__inner--active]="isAmenitySelected(a)">
                          {{ a }}
                        </span>
                      </label>
                    }
                  </div>
                </div>
              </div>

              <!-- ── Photos ────────────────────────────────────────────── -->
              <div class="card">
                <div class="card__header"><h2 class="section-title">Photos</h2></div>
                <div class="card__body">
                  <p class="form-hint" style="margin-bottom:12px;">Add up to 8 photos. Photo changes save immediately without requiring re-review.</p>
                  <app-image-upload
                    [existingUrls]="existingImages()"
                    [uploading]="imageUploading"
                    (imagesChanged)="onImagesChanged($event)"
                  />
                </div>
              </div>

              <!-- ── Submit ────────────────────────────────────────────── -->
              <div style="display:flex;gap:12px;flex-wrap:wrap;padding-bottom:24px;">
                <button
                  type="submit"
                  class="btn btn--primary btn--lg"
                  [class.loading]="saving()"
                  [disabled]="saving()"
                >
                  @if (!saving()) {
                    {{ isEdit ? 'Save changes' : 'Submit for review' }}
                  } @else {
                    {{ isEdit ? 'Saving…' : 'Submitting…' }}
                  }
                </button>
                <a routerLink="/owner/turfs" class="btn btn--ghost btn--lg">Cancel</a>
              </div>
            </form>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .section-title { font-size: 0.9375rem; font-weight: 700; color: #111827; }
    .major-badge {
      display: inline-block; margin-left: 8px;
      font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.04em;
      background: #fef3c7; color: #92400e; padding: 1px 7px; border-radius: 20px;
      text-transform: uppercase;
    }

    .sport-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .sport-chip {
      padding: 6px 14px; border-radius: 20px; font-size: 0.8125rem; font-weight: 500;
      border: 1.5px solid #d1d5db; background: white; color: #6b7280; cursor: pointer;
      transition: all 150ms ease;
      &:hover { border-color: #16a34a; color: #16a34a; }
      &--active { background: #f0fdf4; border-color: #16a34a; color: #15803d; font-weight: 600; }
    }

    .amenity-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .amenity-chip input { position: absolute; opacity: 0; pointer-events: none; }
    .amenity-chip__inner {
      display: inline-flex; align-items: center;
      padding: 6px 14px; border-radius: 20px; font-size: 0.8125rem; font-weight: 500;
      border: 1.5px solid #d1d5db; background: white; color: #6b7280; cursor: pointer;
      transition: all 150ms ease;
      &:hover { border-color: #16a34a; color: #16a34a; }
      &--active { background: #f0fdf4; border-color: #16a34a; color: #15803d; font-weight: 600; }
    }
  `],
})
export class OwnerTurfFormComponent implements OnInit {
  private readonly turfService = inject(TurfService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  isEdit = false;
  turfId = '';
  existingImages = signal<string[]>([]);
  loadingTurf = signal(false);
  saving = signal(false);
  serverError = signal('');
  imageUploading = signal(false);

  allSports = ALL_SPORT_TYPES;
  commonAmenities = COMMON_AMENITIES;
  private _selectedSports = signal<SportType[]>([]);
  private _selectedAmenities = signal<string[]>([]);
  private _newImageFiles: File[] = [];
  private _removedImageUrls: string[] = [];

  /** Free-text field shown when 'other' sport is selected. */
  readonly otherSportCtrl = new FormControl('', Validators.required);

  readonly form = this.fb.group({
    name:                ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description:         [''],
    sportTypes:          [[] as SportType[]],
    addressLine1:        [''],
    addressCity:         [''],
    addressState:        [''],
    addressPincode:      [''],
    basePrice:           [0, [Validators.required, Validators.min(0)]],
    weekendPrice:        [null as number | null],
    slotDurationMinutes: [60],
    openTime:            ['06:00', timeValidator],
    closeTime:           ['22:00', timeValidator],
  });

  ngOnInit(): void {
    this.turfId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEdit = !!this.turfId;
    if (this.isEdit) this._loadTurf();
  }

  private _loadTurf(): void {
    this.loadingTurf.set(true);
    this.turfService.getOwnerTurfById(this.turfId).subscribe({
      next: (turf) => {
        this._selectedSports.set([...turf.sportTypes]);
        this._selectedAmenities.set([...turf.amenities]);
        this.existingImages.set([...turf.images]);
        // Pre-fill the other sport field from the description if 'other' is selected
        if (turf.sportTypes.includes('other')) {
          this.otherSportCtrl.setValue(turf.description ?? '');
        }
        this.form.patchValue({
          name:                turf.name,
          description:         turf.description,
          addressLine1:        turf.address.line1,
          addressCity:         turf.address.city,
          addressState:        turf.address.state,
          addressPincode:      turf.address.pincode,
          basePrice:           turf.pricing.base,
          weekendPrice:        turf.pricing.weekend,
          slotDurationMinutes: turf.slotDurationMinutes,
          openTime:            turf.operatingHours.open,
          closeTime:           turf.operatingHours.close,
        });
        this.loadingTurf.set(false);
      },
      error: () => {
        this.loadingTurf.set(false);
        this.toastService.error('Could not load turf details.');
        this.router.navigate(['/owner/turfs']);
      },
    });
  }

  isSportSelected(sport: SportType): boolean { return this._selectedSports().includes(sport); }
  toggleSport(sport: SportType): void {
    this._selectedSports.update(s =>
      s.includes(sport) ? s.filter(x => x !== sport) : [...s, sport]
    );
  }
  sportLabel(s: SportType): string { return SPORT_TYPE_LABELS[s]; }

  isAmenitySelected(a: string): boolean { return this._selectedAmenities().includes(a); }
  toggleAmenity(a: string): void {
    this._selectedAmenities.update(list =>
      list.includes(a) ? list.filter(x => x !== a) : [...list, a]
    );
  }

  onImagesChanged(e: { newFiles: File[]; removedUrls: string[] }): void {
    this._newImageFiles = e.newFiles;
    this._removedImageUrls = e.removedUrls;
  }

  inv(f: string): boolean {
    const c = this.form.get(f);
    return !!(c?.invalid && c.touched);
  }

  err(f: string): string {
    const e = this.form.get(f)?.errors;
    if (!e) return '';
    if (e['required'])   return 'This field is required.';
    if (e['min'])        return 'Must be 0 or greater.';
    if (e['minlength'])  return `Must be at least ${e['minlength'].requiredLength} characters.`;
    if (e['maxlength'])  return `Must be ${e['maxlength'].requiredLength} characters or fewer.`;
    if (e['invalidTime'])return 'Enter a valid time (HH:mm).';
    return 'Invalid value.';
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this._selectedSports().length === 0) {
      this.serverError.set('Please select at least one sport type.');
      return;
    }
    // Validate "other" sport specification
    if (this._selectedSports().includes('other')) {
      this.otherSportCtrl.markAsTouched();
      if (!this.otherSportCtrl.value?.trim()) {
        this.serverError.set('Please specify the name of the other sport.');
        return;
      }
    }
    if (this.form.invalid) return;

    this.saving.set(true);
    this.serverError.set('');

    const v = this.form.value;
    // When 'other' is selected, prepend the sport name to the description
    const otherNote = this._selectedSports().includes('other') && this.otherSportCtrl.value?.trim()
      ? `Sport: ${this.otherSportCtrl.value.trim()}\n\n`
      : '';
    const dto: CreateTurfDto = {
      name:        v.name!,
      description: otherNote + (v.description ?? ''),
      sportTypes:  this._selectedSports(),
      address: {
        line1:   v.addressLine1 ?? '',
        city:    v.addressCity  ?? '',
        state:   v.addressState ?? '',
        pincode: v.addressPincode ?? '',
      },
      amenities:      this._selectedAmenities(),
      operatingHours: { open: v.openTime!, close: v.closeTime! },
      slotDurationMinutes: Number(v.slotDurationMinutes),
      pricing: {
        base:       Number(v.basePrice),
        weekend:    v.weekendPrice ? Number(v.weekendPrice) : null,
        peakHours:  [],
      },
    };

    try {
      let turf: Turf;
      if (this.isEdit) {
        const result = await this.turfService.updateTurf(this.turfId, dto).toPromise();
        turf = result!.turf;
        if (result!.resubmittedForReview) {
          this.toastService.warning('Changes require re-review', 'Major fields updated — your turf is pending admin approval again.');
        } else {
          this.toastService.success('Turf updated successfully.');
        }
      } else {
        turf = await this.turfService.createTurf(dto).toPromise() as Turf;
        this.toastService.success('Turf submitted', 'Your listing is pending admin approval.');
        this.turfId = turf.id;
        this.isEdit = true;
      }

      // Upload any new images
      if (this._newImageFiles.length > 0) {
        this.imageUploading.set(true);
        try {
          await this.turfService.uploadImages(turf.id, this._newImageFiles).toPromise();
        } catch {
          this.toastService.warning('Turf saved', 'Some images could not be uploaded — please try again.');
        }
        this.imageUploading.set(false);
      }

      // Delete removed images
      for (const url of this._removedImageUrls) {
        try {
          await this.turfService.deleteImage(turf.id, url).toPromise();
        } catch { /* best-effort */ }
      }

      this.saving.set(false);
      this.router.navigate(['/owner/turfs']);
    } catch (e) {
      this.saving.set(false);
      this.imageUploading.set(false);
      const err = e as HttpErrorResponse;
      this.serverError.set(err.error?.message ?? 'Failed to save turf. Please try again.');
    }
  }
}
