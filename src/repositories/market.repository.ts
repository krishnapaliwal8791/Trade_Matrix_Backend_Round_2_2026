import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

const getMarkets = async () => {
  return await prisma.market.findMany({
    select: {
      id: true,
      companyId: true,
      currentPrice: true,
      Company: {
        select: {
          name: true,
          sector: true,
          logo: true,
        },
      },
    },
  });
};

const getMarketWatch = async () => {
  return await prisma.market.findMany({
    include: {
      Company: true,
    },
  });
};

const executeApplyPricesTransaction = async () => {
  return prisma.$transaction(async (tx) => {
    // 1. Validate Event State
    const event = await tx.event.findUnique({ where: { isSingleton: true } });
    if (!event || event.status !== 'LIVE') {
      throw new AppError('Event is not LIVE.', 400, 'BUSINESS_RULE_ERROR');
    }
    if (event.activeNewsBundleId === null) {
      throw new AppError('No active news bundle.', 400, 'BUSINESS_RULE_ERROR');
    }

    const bundleId = event.activeNewsBundleId;

    // 2. Validate Bundle State
    const bundle = await tx.newsBundle.findUnique({
      where: { id: bundleId },
      include: { BundlePrices: true },
    });
    
    if (!bundle) {
      throw new AppError('Active news bundle not found.', 404, 'NOT_FOUND_ERROR');
    }
    if (bundle.status !== 'ACTIVE') {
      throw new AppError('News bundle is not ACTIVE.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 3. Validate ORGANIZER_PENDING SellRequests
    const pendingRequestsCount = await tx.sellRequest.count({
      where: { status: 'ORGANIZER_PENDING' }
    });
    if (pendingRequestsCount > 0) {
      throw new AppError('Cannot apply prices while SellRequests are in ORGANIZER_PENDING.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 4. Validate BundlePrices completeness
    const companyCount = await tx.company.count();
    if (bundle.BundlePrices.length !== companyCount) {
      throw new AppError('The active bundle must contain exactly one BundlePrice for every Company.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 5. Validate targetPrice > 0 and build a map for quick lookup
    const targetPrices = new Map<string, typeof bundle.BundlePrices[0]['targetPrice']>();
    for (const price of bundle.BundlePrices) {
      if (price.targetPrice.toNumber() <= 0) {
        throw new AppError('All BundlePrice.targetPrice values must be > 0.', 400, 'BUSINESS_RULE_ERROR');
      }
      targetPrices.set(price.companyId, price.targetPrice);
    }

    // 6. Fetch existing Markets to apply price updates
    const markets = await tx.market.findMany();
    
    if (markets.length !== companyCount) {
      throw new AppError('Inconsistent data: Market count does not match Company count.', 500, 'SYSTEM_ERROR');
    }
    
    for (const market of markets) {
      const targetPrice = targetPrices.get(market.companyId);
      if (!targetPrice) {
        throw new AppError(`Missing target price for company ${market.companyId}`, 400, 'BUSINESS_RULE_ERROR');
      }
      
      const prev = market.currentPrice;
      const target = targetPrice;
      const newHigh = target.toNumber() > market.highPrice.toNumber() ? target : market.highPrice;
      const newLow = target.toNumber() < market.lowPrice.toNumber() ? target : market.lowPrice;

      await tx.market.update({
        where: { id: market.id },
        data: {
          previousPrice: prev,
          currentPrice: target,
          highPrice: newHigh,
          lowPrice: newLow,
        }
      });
    }

    // 7. Cleanup phase: Delete all SellRequests and release all reservations
    await tx.sellRequest.deleteMany({});
    await tx.portfolio.updateMany({ data: { reservedCash: 0 } });
    await tx.holding.updateMany({ data: { reservedQuantity: 0 } });

    // 8. Conditionally update NewsBundle
    const bundleUpdate = await tx.newsBundle.updateMany({
      where: {
        id: bundleId,
        status: 'ACTIVE',
      },
      data: {
        status: 'COMPLETED',
      },
    });

    if (bundleUpdate.count === 0) {
      throw new AppError('Bundle is no longer ACTIVE.', 409, 'CONFLICT_ERROR');
    }

    // 9. Conditionally update Event
    const eventUpdate = await tx.event.updateMany({
      where: {
        isSingleton: true,
        activeNewsBundleId: bundleId,
        status: 'LIVE',
      },
      data: {
        activeNewsBundleId: null,
        leaderboardVisible: true,
      },
    });

    if (eventUpdate.count === 0) {
      throw new AppError('Event state has changed unexpectedly.', 409, 'CONFLICT_ERROR');
    }
  });
};

export const marketRepository = {
  getMarkets,
  getMarketWatch,
  executeApplyPricesTransaction,
};
