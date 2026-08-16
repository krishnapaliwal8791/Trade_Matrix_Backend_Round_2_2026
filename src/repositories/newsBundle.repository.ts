import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

const getOrganizerNewsBundles = async () => {
  return await prisma.newsBundle.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      releasedAt: true,
      _count: {
        select: {
          News: true,
          BundlePrices: true,
        },
      },
    },
  });
};

const getBundleById = async (id: string) => {
  return await prisma.newsBundle.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      releasedAt: true,
      News: {
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
    },
  });
};

const executeRevealTransaction = async (bundleId: string) => {
  return prisma.$transaction(async (tx) => {
    // 1. Validate Event State
    const event = await tx.event.findUnique({ where: { isSingleton: true } });
    if (!event || event.status !== 'LIVE') {
      throw new AppError('Event is not LIVE.', 400, 'BUSINESS_RULE_ERROR');
    }
    if (event.activeNewsBundleId !== null) {
      throw new AppError('Another news bundle is already active.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 2. Validate Bundle State
    const bundle = await tx.newsBundle.findUnique({
      where: { id: bundleId },
      include: { BundlePrices: true },
    });
    if (!bundle) {
      throw new AppError('News bundle not found.', 404, 'NOT_FOUND_ERROR');
    }
    if (bundle.status !== 'PENDING') {
      throw new AppError('News bundle is not PENDING.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 3. Validate BundlePrices completeness
    const companyCount = await tx.company.count();
    if (bundle.BundlePrices.length !== companyCount) {
      throw new AppError('Bundle must contain exactly one BundlePrice for every Company.', 400, 'BUSINESS_RULE_ERROR');
    }

    // 4. Validate targetPrice > 0
    for (const price of bundle.BundlePrices) {
      if (price.targetPrice.toNumber() <= 0) {
        throw new AppError('Every BundlePrice.targetPrice must be > 0.', 400, 'BUSINESS_RULE_ERROR');
      }
    }

    // 5. Conditionally update NewsBundle
    const bundleUpdate = await tx.newsBundle.updateMany({
      where: {
        id: bundleId,
        status: 'PENDING',
      },
      data: {
        status: 'ACTIVE',
        releasedAt: new Date(),
      },
    });

    if (bundleUpdate.count === 0) {
      throw new AppError('Bundle is no longer pending.', 409, 'CONFLICT_ERROR');
    }

    // 6. Conditionally update Event
    const eventUpdate = await tx.event.updateMany({
      where: {
        isSingleton: true,
        activeNewsBundleId: null,
        status: 'LIVE',
      },
      data: {
        activeNewsBundleId: bundleId,
        leaderboardVisible: false,
      },
    });

    if (eventUpdate.count === 0) {
      throw new AppError('Another news bundle is already active or event is no longer live.', 409, 'CONFLICT_ERROR');
    }
  });
};

export const newsBundleRepository = {
  getOrganizerNewsBundles,
  getBundleById,
  executeRevealTransaction,
};
