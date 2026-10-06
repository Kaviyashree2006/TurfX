import {
  Component, Input, Output, EventEmitter, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UploadedImage {
  /** An existing Cloudinary URL (already saved) */
  url?: string;
  /** A local File waiting to be uploaded */
  file?: File;
  /** Local object-URL for preview (generated from file) */
  preview?: string;
  /** Unique client-side key */
  key: string;
}

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="img-upload">
      <!-- Existing + pending images grid -->
      @if (images().length > 0) {
        <div class="img-upload__grid">
          @for (img of images(); track img.key) {
            <div class="img-upload__item" [class.img-upload__item--uploading]="uploading()">
              <img
                [src]="img.preview ?? img.url"
                [alt]="img.url ? 'Turf photo' : 'Preview'"
                class="img-upload__thumb"
                loading="lazy"
              />
              <button
                type="button"
                class="img-upload__remove"
                (click)="removeImage(img)"
                [disabled]="uploading()"
                aria-label="Remove image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              @if (!img.url && img.file) {
                <span class="img-upload__badge">New</span>
              }
            </div>
          }
        </div>
      }

      <!-- Drop zone (shown when under limit) -->
      @if (canAddMore()) {
        <label
          class="img-upload__dropzone"
          [class.img-upload__dropzone--drag]="dragging()"
          [class.img-upload__dropzone--disabled]="uploading()"
          (dragover)="onDragOver($event)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)"
          [attr.aria-disabled]="uploading()"
        >
          <input
            #fileInput
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="sr-only"
            (change)="onFileSelect($event)"
            [disabled]="uploading()"
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#9ca3af" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span class="img-upload__dropzone-text">
            <span class="img-upload__dropzone-primary">
              Click to upload or drag &amp; drop
            </span>
            <span class="img-upload__dropzone-hint">
              JPEG, PNG or WebP · max 5 MB each · up to {{ maxImages }} photos
            </span>
          </span>
        </label>
      }

      <!-- Validation error -->
      @if (validationError()) {
        <p class="form-error" role="alert" style="margin-top:8px;">{{ validationError() }}</p>
      }

      <!-- Counter -->
      <p class="img-upload__counter">
        {{ images().length }} / {{ maxImages }} photos
      </p>
    </div>
  `,
  styles: [`
    .img-upload { display: flex; flex-direction: column; gap: 12px; }

    .img-upload__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 10px;
    }

    .img-upload__item {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }

    .img-upload__thumb {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }

    .img-upload__remove {
      position: absolute; top: 4px; right: 4px;
      width: 22px; height: 22px;
      background: rgba(0,0,0,0.55);
      color: white;
      border: none;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background 150ms ease;
      &:hover { background: rgba(220,38,38,0.85); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .img-upload__badge {
      position: absolute; bottom: 4px; left: 4px;
      font-size: 0.625rem; font-weight: 700;
      background: #16a34a; color: white;
      padding: 1px 6px; border-radius: 20px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .img-upload__dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 28px 20px;
      border: 2px dashed #d1d5db;
      border-radius: 12px;
      background: #f9fafb;
      cursor: pointer;
      transition: border-color 150ms ease, background 150ms ease;
      text-align: center;

      &:hover, &--drag {
        border-color: #16a34a;
        background: #f0fdf4;
      }

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .img-upload__dropzone-text {
      display: flex; flex-direction: column; gap: 4px;
    }

    .img-upload__dropzone-primary {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .img-upload__dropzone-hint {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .img-upload__counter {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: right;
    }
  `],
})
export class ImageUploadComponent {
  @Input() maxImages = 8;
  @Input() uploading = signal(false);

  /** Existing Cloudinary URLs (already saved to the turf) */
  @Input() set existingUrls(urls: string[]) {
    const existing: UploadedImage[] = (urls ?? []).map(url => ({
      url, key: url,
    }));
    // Merge: keep pending new files, replace existing URL list
    const pending = this._images().filter(i => !i.url);
    this._images.set([...existing, ...pending]);
  }

  /** Emitted whenever the image list changes (new files added or any removed) */
  @Output() imagesChanged = new EventEmitter<{
    newFiles: File[];
    removedUrls: string[];
  }>();

  readonly dragging = signal(false);
  readonly validationError = signal('');

  private _images = signal<UploadedImage[]>([]);
  readonly images = computed(() => this._images());

  readonly canAddMore = computed(() => this._images().length < this.maxImages);

  private _removedUrls: string[] = [];

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    this._processFiles(files);
  }

  onFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this._processFiles(files);
    input.value = ''; // reset so same file can be re-selected
  }

  removeImage(img: UploadedImage): void {
    if (img.url) {
      this._removedUrls.push(img.url);
    }
    if (img.preview) {
      URL.revokeObjectURL(img.preview);
    }
    this._images.update(list => list.filter(i => i.key !== img.key));
    this._emit();
  }

  private _processFiles(files: File[]): void {
    this.validationError.set('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024;
    const current = this._images().length;
    const remaining = this.maxImages - current;

    const valid: UploadedImage[] = [];

    for (const file of files) {
      if (valid.length >= remaining) {
        this.validationError.set(`You can only add ${remaining} more photo(s).`);
        break;
      }
      if (!allowed.includes(file.type)) {
        this.validationError.set('Only JPEG, PNG and WebP images are allowed.');
        continue;
      }
      if (file.size > maxBytes) {
        this.validationError.set('Each image must be 5 MB or smaller.');
        continue;
      }
      const preview = URL.createObjectURL(file);
      valid.push({ file, preview, key: `new-${Date.now()}-${Math.random()}` });
    }

    if (valid.length > 0) {
      this._images.update(list => [...list, ...valid]);
      this._emit();
    }
  }

  private _emit(): void {
    this.imagesChanged.emit({
      newFiles:    this._images().filter(i => !!i.file).map(i => i.file!),
      removedUrls: [...this._removedUrls],
    });
  }
}
