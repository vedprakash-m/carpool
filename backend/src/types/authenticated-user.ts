import { UserRole } from './shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  authProvider: string;
  familyId?: string;
  groupMemberships?: string[];
}
