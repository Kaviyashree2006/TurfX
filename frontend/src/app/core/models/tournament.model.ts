import { SportType } from './turf.model';

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface TournamentTurf {
  id:      string;
  name:    string;
  address: { line1: string; city: string; state: string; pincode: string };
  images:  string[];
}

export interface TournamentOwner {
  id:    string;
  name:  string;
  email: string;
}

export interface Tournament {
  id:              string;
  turfId:          string;
  ownerId:         string;
  name:            string;
  description:     string;
  sport:           SportType;
  date:            string;   // YYYY-MM-DD
  startTime:       string;   // HH:mm
  endTime:         string;   // HH:mm
  maxParticipants: number;
  entryFee:        number;
  prizeInfo:       string;
  status:          TournamentStatus;
  participantCount: number;
  isRegistered:    boolean;
  createdAt:       string;
  updatedAt:       string;
  turf:            TournamentTurf | null;
  owner:           TournamentOwner | null;
}

export interface TournamentsResponse {
  tournaments: Tournament[];
  total:       number;
  page:        number;
  pages:       number;
}

export interface MyRegistration {
  id:           string;
  phone:        string;
  registeredAt: string;
  tournament:   Tournament;
}

export interface MyRegistrationsResponse {
  registrations: MyRegistration[];
  total:         number;
}

export interface Participant {
  id:           string;
  phone:        string;
  registeredAt: string;
  user: {
    id:    string;
    name:  string;
    email: string;
    phone: string | null;
  } | null;
}

export interface ParticipantsResponse {
  tournamentName: string;
  participants:   Participant[];
  total:          number;
}

export interface CreateTournamentDto {
  turfId:          string;
  name:            string;
  description:     string;
  sport:           SportType;
  date:            string;
  startTime:       string;
  endTime:         string;
  maxParticipants: number;
  entryFee:        number;
  prizeInfo:       string;
}

export type UpdateTournamentDto = Partial<CreateTournamentDto> & { status?: TournamentStatus };
