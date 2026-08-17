import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const findByTeamAndCompany = async (teamId: string, companyId: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  
  // We need to find portfolio first
  const portfolio = await db.portfolio.findUnique({ where: { teamId } });
  if (!portfolio) return null;

  return await db.holding.findUnique({
    where: {
      portfolioId_companyId: {
        portfolioId: portfolio.id,
        companyId,
      }
    }
  });
};

export const holdingRepository = {
  findByTeamAndCompany,
};
