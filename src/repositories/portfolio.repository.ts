import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const findByTeam = async (teamId: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  return await db.portfolio.findUnique({
    where: { teamId },
  });
};

const getPortfolioWithHoldings = async (teamId: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  return await db.portfolio.findUnique({
    where: { teamId },
    include: {
      Holdings: {
        include: {
          Company: {
            include: { Market: true }
          }
        }
      }
    }
  });
};

export const portfolioRepository = {
  findByTeam,
  getPortfolioWithHoldings,
};
