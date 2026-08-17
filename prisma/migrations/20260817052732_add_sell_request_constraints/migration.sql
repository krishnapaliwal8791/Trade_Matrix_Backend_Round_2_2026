-- Add CHECK constraints for Portfolio
ALTER TABLE "Portfolio" ADD CONSTRAINT "cash_positive" CHECK (cash >= 0);
ALTER TABLE "Portfolio" ADD CONSTRAINT "reserved_cash_valid" CHECK ("reservedCash" >= 0 AND "reservedCash" <= cash);

-- Add CHECK constraints for Holding
ALTER TABLE "Holding" ADD CONSTRAINT "quantity_positive" CHECK (quantity >= 0);
ALTER TABLE "Holding" ADD CONSTRAINT "reserved_quantity_valid" CHECK ("reservedQuantity" >= 0 AND "reservedQuantity" <= quantity);

-- Add CHECK constraint for SellRequest distinct teams
ALTER TABLE "SellRequest" ADD CONSTRAINT "distinct_teams" CHECK ("sellerTeamId" != "buyerTeamId");
