import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification, NotificationsResponse } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly api  = `${environment.apiUrl}/notifications`;

  getAll(page = 1): Observable<NotificationsResponse> {
    const params = new HttpParams().set('page', String(page));
    return this.http
      .get<{ success: true; data: NotificationsResponse }>(this.api, { params })
      .pipe(map(r => r.data));
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<{ success: true; data: { count: number } }>(`${this.api}/unread-count`)
      .pipe(map(r => r.data.count));
  }

  markRead(id: string): Observable<Notification> {
    return this.http
      .patch<{ success: true; data: { notification: Notification } }>(`${this.api}/${id}/read`, {})
      .pipe(map(r => r.data.notification));
  }

  markAllRead(): Observable<void> {
    return this.http
      .patch<void>(`${this.api}/read-all`, {})
      .pipe(map(() => undefined));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api}/${id}`)
      .pipe(map(() => undefined));
  }
}
