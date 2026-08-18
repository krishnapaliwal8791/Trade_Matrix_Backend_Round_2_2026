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

export const teamRepository = {
  getAllTeamsWithPortfolios,
  findByIdWithUsers,
};
