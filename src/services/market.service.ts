import { marketRepository } from '../repositories/market.repository';

const getMarkets = async () => {
  return await marketRepository.getMarkets();
};

const applyPrices = async () => {
  await marketRepository.executeApplyPricesTransaction();
};

export const marketService = {
  getMarkets,
  applyPrices,
};
