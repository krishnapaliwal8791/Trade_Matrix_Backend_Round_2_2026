import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { sellRequestRepository } from '../repositories/sellRequest.repository';
import { portfolioRepository } from '../repositories/portfolio.repository';
import { holdingRepository } from '../repositories/holding.repository';

const ensureActiveTradingWindow = async (tx: any) => {
  const event = await tx.event.findUnique({ where: { isSingleton: true } });
  if (!event || event.status !== 'LIVE' || !event.activeNewsBundleId) {
    throw new AppError('Trading is only available during an active news bundle.', 400, 'BUSINESS_RULE_ERROR');
  }
};

const create = async (sellerTeamId: string, data: any) => {
  if (sellerTeamId === data.buyerTeamId) {
    throw new AppError('Cannot trade with your own team.', 400, 'BUSINESS_RULE_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    await ensureActiveTradingWindow(tx);

    const market = await tx.market.findUnique({ where: { companyId: data.companyId } });
    if (!market) throw new AppError('Market not found', 404, 'NOT_FOUND_ERROR');

    const currentPrice = market.currentPrice;
    const requestedPrice = new Prisma.Decimal(data.pricePerShare);

    if (requestedPrice.lessThan(currentPrice.mul(0.75)) || requestedPrice.greaterThan(currentPrice)) {
      throw new AppError('Price must be between 75% and 100% of the current market price.', 400, 'BUSINESS_RULE_ERROR');
    }

    const sellerHolding = await holdingRepository.findByTeamAndCompany(sellerTeamId, data.companyId, tx);
    if (!sellerHolding) {
      throw new AppError('You do not own shares of this company.', 400, 'BUSINESS_RULE_ERROR');
    }

    if (sellerHolding.quantity - sellerHolding.reservedQuantity < data.quantity) {
      throw new AppError('Insufficient unreserved shares.', 400, 'BUSINESS_RULE_ERROR');
    }

    // Atomic increment for reservation
    await tx.holding.update({
      where: { id: sellerHolding.id },
      data: { reservedQuantity: { increment: data.quantity } }
    });

    return await tx.sellRequest.create({
      data: {
        sellerTeamId,
        buyerTeamId: data.buyerTeamId,
        companyId: data.companyId,
        quantity: data.quantity,
        pricePerShare: data.pricePerShare,
        reservedShares: data.quantity,
        status: 'BUYER_PENDING',
      }
    });
  });
};

const accept = async (buyerTeamId: string, id: string) => {
  return await prisma.$transaction(async (tx) => {
    await ensureActiveTradingWindow(tx);

    const request = await tx.sellRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'BUYER_PENDING' || request.buyerTeamId !== buyerTeamId) {
      throw new AppError('Invalid or unavailable request.', 400, 'BUSINESS_RULE_ERROR');
    }

    const totalAmount = request.pricePerShare.mul(request.quantity);

    const buyerPortfolio = await portfolioRepository.findByTeam(buyerTeamId, tx);
    if (!buyerPortfolio) throw new AppError('Portfolio not found', 404, 'NOT_FOUND_ERROR');

    const availableCash = buyerPortfolio.cash.sub(buyerPortfolio.reservedCash);
    if (availableCash.lessThan(totalAmount)) {
      throw new AppError('Insufficient unreserved cash.', 400, 'BUSINESS_RULE_ERROR');
    }

    // Attempt exact state transition
    const updatedRequest = await tx.sellRequest.updateMany({
      where: { id, status: 'BUYER_PENDING' },
      data: { status: 'ORGANIZER_PENDING', reservedCash: totalAmount }
    });

    if (updatedRequest.count === 0) throw new AppError('State transition failed.', 409, 'CONFLICT_ERROR');

    // Reserve cash atomically
    await tx.portfolio.update({
      where: { id: buyerPortfolio.id },
      data: { reservedCash: { increment: totalAmount } }
    });

    return { success: true };
  });
};

const rejectByBuyer = async (buyerTeamId: string, id: string) => {
  return await prisma.$transaction(async (tx) => {
    await ensureActiveTradingWindow(tx);

    const request = await tx.sellRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'BUYER_PENDING' || request.buyerTeamId !== buyerTeamId) {
      throw new AppError('Invalid or unavailable request.', 400, 'BUSINESS_RULE_ERROR');
    }

    const updatedRequest = await tx.sellRequest.updateMany({
      where: { id, status: 'BUYER_PENDING' },
      data: { status: 'REJECTED', rejectedBy: 'BUYER' }
    });

    if (updatedRequest.count === 0) throw new AppError('State transition failed.', 409, 'CONFLICT_ERROR');

    // Release seller holding reservation
    const sellerHolding = await holdingRepository.findByTeamAndCompany(request.sellerTeamId, request.companyId, tx);
    if (sellerHolding) {
      await tx.holding.update({
        where: { id: sellerHolding.id },
        data: { reservedQuantity: { decrement: request.reservedShares } }
      });
    }

    return { success: true };
  });
};

const approveByOrganizer = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    await ensureActiveTradingWindow(tx);

    const request = await tx.sellRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'ORGANIZER_PENDING') {
      throw new AppError('Request not pending organizer approval.', 400, 'BUSINESS_RULE_ERROR');
    }

    const updatedRequest = await tx.sellRequest.updateMany({
      where: { id, status: 'ORGANIZER_PENDING' },
      data: { status: 'COMPLETED' }
    });
    if (updatedRequest.count === 0) throw new AppError('State transition failed.', 409, 'CONFLICT_ERROR');

    // Portfolio updates (deterministically sorted to prevent deadlock)
    const teams = [request.sellerTeamId, request.buyerTeamId].sort();
    
    for (const teamId of teams) {
      const port = await portfolioRepository.findByTeam(teamId, tx);
      if (!port) throw new AppError('Portfolio missing.', 500, 'SYSTEM_ERROR');
      
      if (teamId === request.sellerTeamId) {
        await tx.portfolio.update({
          where: { id: port.id },
          data: { cash: { increment: request.reservedCash } }
        });
      } else {
        await tx.portfolio.update({
          where: { id: port.id },
          data: { 
            cash: { decrement: request.reservedCash },
            reservedCash: { decrement: request.reservedCash }
          }
        });
      }
    }

    // Holding updates
    const sellerHolding = await holdingRepository.findByTeamAndCompany(request.sellerTeamId, request.companyId, tx);
    if (sellerHolding) {
      await tx.holding.update({
        where: { id: sellerHolding.id },
        data: { 
          quantity: { decrement: request.reservedShares },
          reservedQuantity: { decrement: request.reservedShares }
        }
      });
      // Cleanup if 0
      const checkHolding = await tx.holding.findUnique({ where: { id: sellerHolding.id } });
      if (checkHolding && checkHolding.quantity === 0) {
        await tx.holding.delete({ where: { id: sellerHolding.id } });
      }
    }

    const buyerPortfolio = await portfolioRepository.findByTeam(request.buyerTeamId, tx);
    if (buyerPortfolio) {
      // Upsert buyer holding atomically
      await tx.holding.upsert({
        where: {
          portfolioId_companyId: {
            portfolioId: buyerPortfolio.id,
            companyId: request.companyId
          }
        },
        update: { quantity: { increment: request.quantity } },
        create: {
          portfolioId: buyerPortfolio.id,
          companyId: request.companyId,
          quantity: request.quantity
        }
      });
    }

    // Create Trade
    await tx.trade.create({
      data: {
        sellerTeamId: request.sellerTeamId,
        buyerTeamId: request.buyerTeamId,
        companyId: request.companyId,
        quantity: request.quantity,
        pricePerShare: request.pricePerShare
      }
    });

    return { success: true };
  });
};

const rejectByOrganizer = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    await ensureActiveTradingWindow(tx);

    const request = await tx.sellRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'ORGANIZER_PENDING') {
      throw new AppError('Request not pending organizer approval.', 400, 'BUSINESS_RULE_ERROR');
    }

    const updatedRequest = await tx.sellRequest.updateMany({
      where: { id, status: 'ORGANIZER_PENDING' },
      data: { status: 'REJECTED', rejectedBy: 'ORGANIZER' }
    });
    if (updatedRequest.count === 0) throw new AppError('State transition failed.', 409, 'CONFLICT_ERROR');

    const sellerHolding = await holdingRepository.findByTeamAndCompany(request.sellerTeamId, request.companyId, tx);
    if (sellerHolding) {
      await tx.holding.update({
        where: { id: sellerHolding.id },
        data: { reservedQuantity: { decrement: request.reservedShares } }
      });
    }

    const buyerPortfolio = await portfolioRepository.findByTeam(request.buyerTeamId, tx);
    if (buyerPortfolio) {
      await tx.portfolio.update({
        where: { id: buyerPortfolio.id },
        data: { reservedCash: { decrement: request.reservedCash } }
      });
    }

    return { success: true };
  });
};

export const sellRequestService = {
  create,
  accept,
  rejectByBuyer,
  approveByOrganizer,
  rejectByOrganizer
};
