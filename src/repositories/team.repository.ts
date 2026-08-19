import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const getAllTeamsWithPortfolios = async (tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  return await db.team.findMany({
    include: {
      Portfolio: {
        include: {
          Holdings: {
            include: {
              Company: {
                include: { Market: true }
              }
            }
          }
        }
      }
    }
  });
};

const findByIdWithUsers = async (teamId: string) => {
  return await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

const findAvailableTradingTeams = async (excludeTeamId: string) => {
  return await prisma.team.findMany({
    where: {
      id: { not: excludeTeamId },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
};

export const teamRepository = {
  getAllTeamsWithPortfolios,
  findByIdWithUsers,
  findAvailableTradingTeams,
};
