import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const findById = async (id: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  return await db.sellRequest.findUnique({
    where: { id },
  });
};

const findOutgoingForTeam = async (teamId: string) => {
  return await prisma.sellRequest.findMany({
    where: { sellerTeamId: teamId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      Company: { select: { name: true } },
      BuyerTeam: { select: { name: true } },
    }
  });
};

const findIncomingForTeam = async (teamId: string) => {
  return await prisma.sellRequest.findMany({
    where: { buyerTeamId: teamId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      Company: { select: { name: true } },
      SellerTeam: { select: { name: true } },
    }
  });
};

const findAllForTeam = async (teamId: string) => {
  return await prisma.sellRequest.findMany({
    where: { OR: [{ sellerTeamId: teamId }, { buyerTeamId: teamId }] },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      Company: { select: { name: true } },
      SellerTeam: { select: { name: true } },
      BuyerTeam: { select: { name: true } },
    }
  });
};

const findAllForOrganizer = async () => {
  return await prisma.sellRequest.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      Company: { select: { name: true } },
      SellerTeam: { select: { name: true } },
      BuyerTeam: { select: { name: true } },
    }
  });
};

export const sellRequestRepository = {
  findById,
  findOutgoingForTeam,
  findIncomingForTeam,
  findAllForTeam,
  findAllForOrganizer,
};
