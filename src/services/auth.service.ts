import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export const authenticate = async (clerkId: string) => {
  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND', true);
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError('User is inactive', 403, 'USER_INACTIVE', true);
  }

  if (user.role === Role.ORGANIZER) {
    // Organizer is allowed to have a null teamId
  } else {
    // Team Captain and Participant must have a teamId
    if (!user.teamId) {
      throw new AppError('User is not assigned to a team', 403, 'TEAM_NOT_ASSIGNED', true);
    }
  }

  return {
    id: user.id,
    clerkId: user.clerkId,
    role: user.role,
    teamId: user.teamId,
    status: user.status,
  };
};

export const authService = {
  authenticate,
};
