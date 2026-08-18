import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export type PopulatedPortfolio = Prisma.PortfolioGetPayload<{
  include: {
    Holdings: {
      include: {
        Company: {
          include: { Market: true }
        }
      }
    }
  }
}>;

const calculateFinancials = (portfolio: PopulatedPortfolio | null) => {
  let cash = 0;
  let currentValue = 0;

  if (portfolio) {
    cash = Number(portfolio.cash);
    currentValue = portfolio.Holdings.reduce((sum, holding) => {
      const market = holding.Company.Market;
      if (!market) {
        throw new AppError(`Data inconsistency: Market missing for company ${holding.companyId}`, 500, 'SYSTEM_ERROR');
      }
      const price = Number(market.currentPrice);
      return sum + (holding.quantity * price);
    }, 0);
  }

  const netWorth = cash + currentValue;

  return { cash, currentValue, netWorth };
};

export const portfolioService = {
  calculateFinancials,
};
