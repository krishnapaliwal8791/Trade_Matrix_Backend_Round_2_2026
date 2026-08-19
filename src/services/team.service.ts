import { teamRepository } from '../repositories/team.repository';
import { portfolioService } from './portfolio.service';

const getOrganizerTeams = async () => {
  const teams = await teamRepository.getAllTeamsWithPortfolios();

  const results = teams.map((team) => {
    const { cash, currentValue, netWorth } = portfolioService.calculateFinancials(team.Portfolio);

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

const getTradingTeams = async (excludeTeamId: string) => {
  return await teamRepository.findAvailableTradingTeams(excludeTeamId);
};

export const teamService = {
  getOrganizerTeams,
  getTradingTeams,
};
