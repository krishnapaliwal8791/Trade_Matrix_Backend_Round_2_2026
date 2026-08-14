import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { Round1ExportData, round1ExportDataSchema } from '../types/round1';
import { importRepository } from '../repositories/import.repository';

export const importRound1 = async () => {
  let round1Data: Round1ExportData;

  const response = await fetch(`${env.ROUND1_API_URL}/internal/export-data`);

  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch (e) {
      throw new AppError(
        `Failed to fetch Round 1 data. Status: ${response.status}`,
        response.status,
        'ROUND1_API_ERROR'
      );
    }
    
    throw new AppError(
      errorPayload.message || 'Round 1 API error',
      response.status,
      errorPayload.code || 'ROUND1_API_ERROR',
      true,
      errorPayload.reason,
      errorPayload.suggestedFix
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    throw new AppError('Invalid JSON response from Round 1 API', 502, 'ROUND1_API_ERROR');
  }

  if (!payload.success || !payload.data) {
    throw new AppError('Unexpected response format from Round 1 API', 502, 'ROUND1_API_ERROR');
  }

  try {
    round1Data = round1ExportDataSchema.parse(payload.data);
  } catch (e: any) {
    throw new AppError(
      'Validation failed for Round 1 API payload', 
      502, 
      'ROUND1_API_VALIDATION_ERROR', 
      true, 
      e.message, 
      'Check if the Round 1 API payload matches the required export schema'
    );
  }

  // Defensive Payload Validations
  const companyIds = new Set<string>();
  for (const company of round1Data.companies) {
    if (companyIds.has(company.id)) {
      throw new AppError(`Duplicate company ID found in payload: ${company.id}`, 422, 'DUPLICATE_COMPANY_ID');
    }
    companyIds.add(company.id);
  }

  const teamIds = new Set<string>();
  for (const team of round1Data.teams) {
    if (teamIds.has(team.id)) {
      throw new AppError(`Duplicate team ID found in payload: ${team.id}`, 422, 'DUPLICATE_TEAM_ID');
    }
    teamIds.add(team.id);

    const holdingCompanyIds = new Set<string>();
    for (const holding of team.holdings) {
      if (holdingCompanyIds.has(holding.companyId)) {
        throw new AppError(`Team ${team.id} has duplicate holdings for company: ${holding.companyId}`, 422, 'DUPLICATE_HOLDING');
      }
      holdingCompanyIds.add(holding.companyId);
    }
  }

  // The repository handles the full atomic transaction including database checks
  const result = await importRepository.executeImportTransaction(round1Data);

  return result;
};

export const importService = {
  importRound1,
};
