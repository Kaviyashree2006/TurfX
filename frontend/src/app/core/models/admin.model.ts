import { ApprovalStatus } from './user.model';

export interface OwnerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  resubmissionCount: number;
  businessName?: string | null;
  businessAddress?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnersResponse {
  owners: OwnerSummary[];
  total: number;
}
