import { prisma } from '../lib/prisma';

const findAllWithCurrentPrice = async () => {
  return prisma.company.findMany({
    select: {
      id: true,
      name: true,
      sector: true,
      description: true,
      logo: true,
      Market: {
        select: {
          currentPrice: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

export const companyRepository = {
  findAllWithCurrentPrice,
};
