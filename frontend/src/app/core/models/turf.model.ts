export type TurfStatus = 'pending' | 'approved' | 'rejected';

export type SportType =
  | 'box_cricket'
  | 'football_turf'
  | 'badminton'
  | 'basketball'
  | 'tennis'
  | 'cricket'
  | 'other';

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
  box_cricket:   'Box Cricket',
  football_turf: 'Football',
  badminton:     'Badminton',
  basketball:    'Basketball',
  tennis:        'Tennis',
  cricket:       'Cricket',
  other:         'Other',
};

export interface PeakHour {
  start: string; // HH:mm
  end:   string; // HH:mm
  price: number;
}

export interface Pricing {
  base:       number;
  weekend:    number | null;
  peakHours:  PeakHour[];
}

export interface Address {
  line1:   string;
  city:    string;
  state:   string;
  pincode: string;
}

export interface Location {
  type:        'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface OperatingHours {
  open:  string; // HH:mm
  close: string; // HH:mm
}

export interface Turf {
  id:                  string;
  ownerId:             string;
  name:                string;
  description:         string;
  sportTypes:          SportType[];
  address:             Address;
  location:            Location;
  images:              string[];
  amenities:           string[];
  operatingHours:      OperatingHours;
  slotDurationMinutes: number;
  blackoutDates:       string[]; // ISO date strings
  pricing:             Pricing;
  status:              TurfStatus;
  isActive:            boolean;
  rejectionReason:     string | null;
  ratingAvg:           number;
  ratingCount:         number;
  createdAt:           string;
  updatedAt:           string;
  // populated on admin views
  owner?: {
    id:           string;
    name:         string;
    email:        string;
    businessName: string | null;
    phone?:       string | null;
  };
}

export interface TurfsResponse {
  turfs: Turf[];
  total: number;
  page:  number;
  pages: number;
}

export interface CreateTurfDto {
  name:                string;
  description?:        string;
  sportTypes:          SportType[];
  address?:            Partial<Address>;
  location?:           Partial<Location>;
  amenities?:          string[];
  operatingHours?:     Partial<OperatingHours>;
  slotDurationMinutes?: number;
  pricing:             Pricing;
}

export type UpdateTurfDto = Partial<CreateTurfDto>;
