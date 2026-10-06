export interface Review {
  id:         string;
  turfId:     string;
  customerId: string | null;
  bookingId:  string;
  rating:     number;
  comment:    string;
  createdAt:  string;
  updatedAt:  string;
  customer:   { id: string; name: string } | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface CreateReviewDto {
  bookingId: string;
  rating:    number;
  comment:   string;
}

export interface UpdateReviewDto {
  rating?:  number;
  comment?: string;
}
