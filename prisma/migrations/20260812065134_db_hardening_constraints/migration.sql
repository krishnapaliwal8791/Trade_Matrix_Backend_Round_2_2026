-- DropForeignKey
ALTER TABLE "SellRequest" DROP CONSTRAINT "SellRequest_buyerTeamId_fkey";

-- DropForeignKey
ALTER TABLE "SellRequest" DROP CONSTRAINT "SellRequest_sellerTeamId_fkey";

-- AddForeignKey
ALTER TABLE "SellRequest" ADD CONSTRAINT "SellRequest_sellerTeamId_fkey" FOREIGN KEY ("sellerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellRequest" ADD CONSTRAINT "SellRequest_buyerTeamId_fkey" FOREIGN KEY ("buyerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Portfolio constraints
ALTER TABLE "Portfolio" ADD CONSTRAINT "portfolio_cash_positive" CHECK ("cash" >= 0);
ALTER TABLE "Portfolio" ADD CONSTRAINT "portfolio_reserved_cash_positive" CHECK ("reservedCash" >= 0);
ALTER TABLE "Portfolio" ADD CONSTRAINT "portfolio_reserved_cash_limit" CHECK ("reservedCash" <= "cash");

-- Holding constraints
ALTER TABLE "Holding" ADD CONSTRAINT "holding_quantity_positive" CHECK ("quantity" >= 0);
ALTER TABLE "Holding" ADD CONSTRAINT "holding_reserved_qty_positive" CHECK ("reservedQuantity" >= 0);
ALTER TABLE "Holding" ADD CONSTRAINT "holding_reserved_qty_limit" CHECK ("reservedQuantity" <= "quantity");

-- SellRequest constraints
ALTER TABLE "SellRequest" ADD CONSTRAINT "sellreq_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "SellRequest" ADD CONSTRAINT "sellreq_price_positive" CHECK ("pricePerShare" > 0);
ALTER TABLE "SellRequest" ADD CONSTRAINT "sellreq_reserved_shares_pos" CHECK ("reservedShares" >= 0);
ALTER TABLE "SellRequest" ADD CONSTRAINT "sellreq_reserved_cash_pos" CHECK ("reservedCash" >= 0);

-- Trade constraints
ALTER TABLE "Trade" ADD CONSTRAINT "trade_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Trade" ADD CONSTRAINT "trade_price_positive" CHECK ("pricePerShare" > 0);

-- Market constraints
ALTER TABLE "Market" ADD CONSTRAINT "market_current_price_positive" CHECK ("currentPrice" > 0);
ALTER TABLE "Market" ADD CONSTRAINT "market_previous_price_positive" CHECK ("previousPrice" > 0);
ALTER TABLE "Market" ADD CONSTRAINT "market_high_price_limit" CHECK ("highPrice" >= "currentPrice");
ALTER TABLE "Market" ADD CONSTRAINT "market_low_price_limit" CHECK ("lowPrice" <= "currentPrice");
ALTER TABLE "Market" ADD CONSTRAINT "market_high_low_limit" CHECK ("highPrice" >= "lowPrice");
