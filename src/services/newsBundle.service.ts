import { newsBundleRepository } from '../repositories/newsBundle.repository';
import { AppError } from '../utils/AppError';

const getOrganizerNewsBundles = async () => {
  const bundles = await newsBundleRepository.getOrganizerNewsBundles();

  return bundles.map(bundle => ({
    id: bundle.id,
    title: bundle.title,
    status: bundle.status,
    releasedAt: bundle.releasedAt,
    newsCount: bundle._count.News,
    bundlePriceCount: bundle._count.BundlePrices,
  }));
};

const getNewsBundle = async (id: string) => {
  const bundle = await newsBundleRepository.getBundleById(id);

  if (!bundle || bundle.status === 'PENDING') {
    throw new AppError('News bundle not found or not released.', 404, 'NOT_FOUND_ERROR');
  }

  return {
    id: bundle.id,
    title: bundle.title,
    releasedAt: bundle.releasedAt?.toISOString() || null,
    news: bundle.News,
  };
};

const revealNewsBundle = async (bundleId: string) => {
  await newsBundleRepository.executeRevealTransaction(bundleId);
};

export const newsBundleService = {
  getOrganizerNewsBundles,
  getNewsBundle,
  revealNewsBundle,
};
