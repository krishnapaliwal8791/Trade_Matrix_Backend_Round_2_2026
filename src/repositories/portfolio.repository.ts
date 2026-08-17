import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const findByTeam = async (teamId: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  return await db.portfolio.findUnique({
    where: { teamId },
  });
};

export const portfolioRepository = {
  findByTeam,
};
