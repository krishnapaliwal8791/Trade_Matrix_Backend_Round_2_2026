import { portfolioRepository } from '../repositories/portfolio.repository';
import { marketRepository } from '../repositories/market.repository';
import { AppError } from '../utils/AppError';

const getDashboardData = async (teamId: string) => {
  const portfolio = await portfolioRepository.getPortfolioWithHoldings(teamId);
  if (!portfolio) {
    throw new AppError('Portfolio not found', 404, 'NOT_FOUND_ERROR');
  }

  const markets = await marketRepository.getMarketWatch();

  // 1. Calculate Portfolio
  let totalShares = 0;
  let totalCurrentValue = 0;

  const holdings = portfolio.Holdings.map((holding) => {
    const market = holding.Company.Market;
    
    if (!market) {
      throw new AppError(`Data inconsistency: Market missing for company ${holding.companyId}`, 500, 'SYSTEM_ERROR');
    }
    
    const currentPrice = Number(market.currentPrice);
    const currentValue = holding.quantity * currentPrice;

    totalShares += holding.quantity;
    totalCurrentValue += currentValue;

    return {
      companyId: holding.companyId,
      companyName: holding.Company.name,
      shares: holding.quantity,
      currentPrice,
      currentValue,
    };
  });

  const cash = Number(portfolio.cash);
  const netWorth = cash + totalCurrentValue;

  // 2. Calculate Market Watch
  const marketWatch = markets.map((market) => {
    const currentPrice = Number(market.currentPrice);
    const previousPrice = Number(market.previousPrice);

    let changeDirection: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    if (currentPrice > previousPrice) {
      changeDirection = 'UP';
    } else if (currentPrice < previousPrice) {
      changeDirection = 'DOWN';
    }

    const changeAmount = Math.abs(currentPrice - previousPrice);
    let changePercentage = 0;
    
    // As verified, previousPrice is guaranteed > 0, so division by zero is avoided
    changePercentage = Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2));

    return {
      companyId: market.companyId,
      companyName: market.Company.name,
      sector: market.Company.sector,
      currentPrice,
      changeDirection,
      changeAmount,
      changePercentage,
      highestRecorded: Number(market.highPrice),
      lowestRecorded: Number(market.lowPrice),
    };
  });

  return {
    portfolio: {
      holdings,
      total: {
        shares: totalShares,
        currentValue: totalCurrentValue,
        cash,
        netWorth,
      },
    },
    marketWatch,
  };
};

export const usersService = {
  getDashboardData,
};
