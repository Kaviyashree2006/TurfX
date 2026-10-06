import { Turf } from './turf.model';

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
export type BookingSource = 'customer' | 'tournament';
export type CancelledBy   = 'customer' | 'owner' | 'admin' | null;

export interface Slot {
  startTime:  string;
  endTime:    string;
  available:  boolean;
  price:      number;
}

export interface AvailabilityResponse {
  date:                string;
  blackout:            boolean;
  turfName?:           string;
  slotDurationMinutes?: number;
  slots:               Slot[];
}

export interface Booking {
  id:                  string;
  sourceType:          BookingSource;
  customerId:          string | null;
  turfId:              string;
  date:                string;
  startTime:           string;
  endTime:             string;
  sport:               string;
  amount:              number;
  status:              BookingStatus;
  cancelledBy:         CancelledBy;
  cancellationReason:  string | null;
  paymentId:           string | null;
  pendingExpiresAt:    string | null;
  createdAt:           string;
  updatedAt:           string;
  turf?: Pick<Turf, 'id' | 'name' | 'address' | 'images' | 'pricing'> | null;
  customer?: { id: string; name: string; email: string; phone: string | null } | null;
}

export interface BookingsResponse {
  bookings: Booking[];
  total:    number;
  page:     number;
  pages:    number;
}

export interface CreateBookingDto {
  turfId:    string;
  date:      string;
  startTime: string;
  sport:     string;
}

// ── Payment types (Phase 4) ───────────────────────────────────────────────────
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';

export interface PaymentOrder {
  orderId:   string;
  amount:    number;   // paise
  currency:  string;
  paymentId: string;   // our Payment._id
  keyId:     string;   // Razorpay public key_id
}

export interface VerifyPaymentDto {
  orderId:           string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface Payment {
  id:                string;
  bookingId:         string | null;
  userId:            string | null;
  provider:          string;
  orderId:           string | null;
  razorpayPaymentId: string | null;
  signatureVerified: boolean;
  amount:            number;
  platformFeeAmount: number;
  currency:          string;
  status:            PaymentStatus;
  refundId:          string | null;
  refundAmount:      number;
  createdAt:         string;
  updatedAt:         string;
}

export interface PaymentsResponse {
  payments: Payment[];
  total:    number;
  page:     number;
  pages:    number;
}

// ── Demo UPI ──────────────────────────────────────────────────────────────────
export interface UpiPaymentData {
  upiId:            string;
  upiUri:           string;
  bookingRef:       string;
  amount:           number;
  platformFeeAmount: number;
  currency:         string;
  isDemo:           true;
}
