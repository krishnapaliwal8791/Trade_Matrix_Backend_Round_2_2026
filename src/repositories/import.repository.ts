import { prisma } from '../lib/prisma';
import { Round1ExportData } from '../types/round1';
import { AppError } from '../utils/AppError';

export const executeImportTransaction = async (round1Data: Round1ExportData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Validate Event Status
    const event = await tx.event.findUnique({ where: { isSingleton: true } });
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    if (event.status !== 'WAITING') {
      throw new AppError('Event is not in WAITING state', 409, 'INVALID_EVENT_STATE');
    }

    // 2. Validate Round 1 Status
    if (round1Data.eventStatus !== 'IPO_COMPLETED') {
      throw new AppError('Round 1 event status is not IPO_COMPLETED', 409, 'INVALID_ROUND1_STATE');
    }

    // 3. Validate tables are empty
    const companyCount = await tx.company.count();
    const marketCount = await tx.market.count();
    const portfolioCount = await tx.portfolio.count();
    const holdingCount = await tx.holding.count();

    if (companyCount > 0 || marketCount > 0 || portfolioCount > 0 || holdingCount > 0) {
      const nonEmptyTables = [];
      if (companyCount > 0) nonEmptyTables.push('Company');
      if (marketCount > 0) nonEmptyTables.push('Market');
      if (portfolioCount > 0) nonEmptyTables.push('Portfolio');
      if (holdingCount > 0) nonEmptyTables.push('Holding');

      throw new AppError(
        `Database is not empty. The following tables contain data: ${nonEmptyTables.join(', ')}`,
        409,
        'DB_NOT_EMPTY',
        true,
        'Import cannot proceed because the database already contains trade or portfolio data.',
        'Please clear the existing data or truncate the relevant tables before running the import.'
      );
    }

    // 4. Validate Team Parity & Roles
    const round2Teams = await tx.team.findMany({
      include: {
        Users: true,
      },
    });

    const round1TeamIds = new Set(round1Data.teams.map((t) => t.id));
    const round2TeamIds = new Set(round2Teams.map((t) => t.id));

    // Detect teams present in Round1 but missing in Round2
    for (const r1TeamId of round1TeamIds) {
      if (!round2TeamIds.has(r1TeamId)) {
        throw new AppError(`Team ${r1TeamId} is present in Round 1 but missing in Round 2`, 422, 'MISSING_IN_ROUND2');
      }
    }

    // Detect teams present in Round2 but missing in Round1
    for (const r2TeamId of round2TeamIds) {
      if (!round1TeamIds.has(r2TeamId)) {
        throw new AppError(`Team ${r2TeamId} is present in Round 2 but missing in Round 1`, 422, 'MISSING_IN_ROUND1');
      }
    }

    // Validate 1 TEAM_CAPTAIN and 3 PARTICIPANT per team
    for (const team of round2Teams) {
      const captains = team.Users.filter((u) => u.role === 'TEAM_CAPTAIN');
      const participants = team.Users.filter((u) => u.role === 'PARTICIPANT');

      if (captains.length !== 1 || participants.length !== 3) {
        throw new AppError(
          `Team ${team.id} does not have exactly 1 TEAM_CAPTAIN and 3 PARTICIPANTs. Found ${captains.length} captains and ${participants.length} participants.`,
          422,
          'INVALID_TEAM_ROLES'
        );
      }
    }

    // Validate holding.companyId references
    const round1CompanyIds = new Set(round1Data.companies.map((c) => c.id));
    for (const team of round1Data.teams) {
      for (const holding of team.holdings) {
        if (!round1CompanyIds.has(holding.companyId)) {
          throw new AppError(`Holding references company ${holding.companyId} which is not included in round1Data.companies`, 422, 'INVALID_COMPANY_REFERENCE');
        }
      }
    }

    // --- Import Execution ---

    let importedCompanies = 0;
    let importedPortfolios = 0;
    let importedHoldings = 0;

    // A. Create Companies and Markets
    for (const company of round1Data.companies) {
      await tx.company.create({
        data: {
          id: company.id,
          name: company.name,
          sector: company.sector,
          description: company.description,
          logo: company.logo,
          Market: {
            create: {
              previousPrice: company.initialPrice,
              currentPrice: company.initialPrice,
              highPrice: company.initialPrice,
              lowPrice: company.initialPrice,
            },
          },
        },
      });
      importedCompanies++;
    }

    // B. Create Portfolios and Holdings
    for (const team of round1Data.teams) {
      // Find the created portfolio to attach holdings
      const portfolio = await tx.portfolio.create({
        data: {
          teamId: team.id,
          cash: team.remainingCash,
          reservedCash: 0,
        },
      });
      importedPortfolios++;

      for (const holding of team.holdings) {
        await tx.holding.create({
          data: {
            portfolioId: portfolio.id,
            companyId: holding.companyId,
            quantity: holding.quantity,
            reservedQuantity: 0,
          },
        });
        importedHoldings++;
      }
    }

    // C. Update Event Status
    await tx.event.update({
      where: { id: event.id },
      data: { status: 'DATA_IMPORTED' },
    });

    return {
      importedCompanies,
      importedTeams: round1Data.teams.length,
      importedPortfolios,
      importedHoldings,
      eventStatus: 'DATA_IMPORTED',
    };
  }, {
    // Optional: increase timeout if this is expected to take a while
    timeout: 10000,
  });
};

export const importRepository = {
  executeImportTransaction,
};
