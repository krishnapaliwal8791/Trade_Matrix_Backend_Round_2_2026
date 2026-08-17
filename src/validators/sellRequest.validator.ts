import { z } from 'zod';

export const createSellRequestSchema = z.object({
  body: z.object({
    buyerTeamId: z.string().uuid('Invalid buyerTeamId format.'),
    companyId: z.string().uuid('Invalid companyId format.'),
    quantity: z.number().int('Quantity must be an integer.').positive('Quantity must be greater than 0.'),
    pricePerShare: z.number().positive('Price per share must be positive.'),
  }),
});

export const acceptSellRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid SellRequest ID format.'),
  }),
});

export const rejectSellRequestSchema = acceptSellRequestSchema;
export const getSellRequestSchema = acceptSellRequestSchema;
export const approveSellRequestSchema = acceptSellRequestSchema;
