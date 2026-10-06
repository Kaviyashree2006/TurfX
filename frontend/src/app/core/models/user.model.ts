export type UserRole = 'customer' | 'owner' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
