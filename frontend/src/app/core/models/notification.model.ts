export type NotificationType =
  | 'booking_confirmed'
  | 'tournament_registered'
  | 'tournament_cancelled';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  refId:     string | null;
  refType:   'booking' | 'tournament' | null;
  read:      boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total:         number;
  unreadCount:   number;
  page:          number;
  pages:         number;
}
