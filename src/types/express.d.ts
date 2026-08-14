import { Role, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        role: Role;
        teamId: string | null;
        status: UserStatus;
      };
    }
  }
}
