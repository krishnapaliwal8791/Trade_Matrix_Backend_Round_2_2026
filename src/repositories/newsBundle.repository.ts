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

export const newsBundleRepository = {
  getOrganizerNewsBundles,
  getBundleById,
};
