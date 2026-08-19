import { Role } from '@prisma/client';
import { portfolioRepository } from '../repositories/portfolio.repository';
import { marketRepository } from '../repositories/market.repository';
import { teamRepository } from '../repositories/team.repository';
import { companyRepository } from '../repositories/company.repository';
import { eventService } from './event.service';
import { portfolioService } from './portfolio.service';
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

const getLeaderboard = async () => {
  const event = await eventService.getEvent();
  if (!event.leaderboardVisible) {
    throw new AppError('Leaderboard is hidden', 403, 'BUSINESS_RULE_ERROR');
  }

  const teams = await teamRepository.getAllTeamsWithPortfolios();

  const mappedTeams = teams.map((team) => {
    const { netWorth } = portfolioService.calculateFinancials(team.Portfolio);

    return {
      teamId: team.id,
      teamName: team.name,
      netWorth
    };
  });

  // Sort descending by netWorth
  mappedTeams.sort((a, b) => b.netWorth - a.netWorth);

  // Apply competition ranking
  const results = [];
  let currentRank = 1;
  
  for (let i = 0; i < mappedTeams.length; i++) {
    if (i > 0 && mappedTeams[i].netWorth < mappedTeams[i - 1].netWorth) {
      currentRank = i + 1;
    }
    results.push({
      rank: currentRank,
      ...mappedTeams[i]
    });
  }

  return results;
};

const getTeam = async (teamId: string) => {
  const team = await teamRepository.findByIdWithUsers(teamId);
  if (!team) {
    throw new AppError('Team not found', 404, 'NOT_FOUND_ERROR');
  }

  let captain = null;
  const members: { id: string; name: string }[] = [];

  for (const user of team.Users) {
    if (user.role === Role.TEAM_CAPTAIN) {
      captain = { id: user.id, name: user.name };
    } else if (user.role === Role.PARTICIPANT) {
      members.push({ id: user.id, name: user.name });
    }
  }

  return {
    id: team.id,
    name: team.name,
    captain,
    members,
  };
};

const getCompanies = async () => {
  const companies = await companyRepository.findAllWithCurrentPrice();
  
  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    sector: company.sector,
    description: company.description,
    logo: company.logo,
    currentPrice: company.Market ? Number(company.Market.currentPrice) : 0,
  }));
};

export const usersService = {
  getDashboardData,
  getLeaderboard,
  getTeam,
  getCompanies,
};
