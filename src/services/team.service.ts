import { teamRepository } from '../repositories/team.repository';
import { AppError } from '../utils/AppError';

const getOrganizerTeams = async () => {
  const teams = await teamRepository.getAllTeamsWithPortfolios();

  const results = teams.map((team) => {
    let cash = 0;
    let currentValue = 0;

    if (team.Portfolio) {
      cash = Number(team.Portfolio.cash);
      currentValue = team.Portfolio.Holdings.reduce((sum, holding) => {
        const market = holding.Company.Market;
        if (!market) {
          throw new AppError(`Data inconsistency: Market missing for company ${holding.companyId}`, 500, 'SYSTEM_ERROR');
        }
        const price = Number(market.currentPrice);
        return sum + (holding.quantity * price);
      }, 0);
    }

    const netWorth = cash + currentValue;

    return {
      id: team.id,
      name: team.name,
      cash,
      currentValue,
      netWorth
    };
  });

  return results.sort((a, b) => a.name.localeCompare(b.name));
};

export const teamService = {
  getOrganizerTeams,
};
