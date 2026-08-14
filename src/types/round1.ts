import { z } from 'zod';

export const round1CompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string(),
  description: z.string(),
  logo: z.string().nullable(),
  initialPrice: z.number().min(0, "initialPrice must be >= 0"),
});

export const round1HoldingSchema = z.object({
  companyId: z.string(),
  quantity: z.number().min(0, "quantity must be >= 0"),
});

export const round1TeamSchema = z.object({
  id: z.string(),
  remainingCash: z.number().min(0, "remainingCash must be >= 0"),
  holdings: z.array(round1HoldingSchema),
});

export const round1ExportDataSchema = z.object({
  eventStatus: z.string(),
  companies: z.array(round1CompanySchema),
  teams: z.array(round1TeamSchema),
});

export type Round1Company = z.infer<typeof round1CompanySchema>;
export type Round1Holding = z.infer<typeof round1HoldingSchema>;
export type Round1Team = z.infer<typeof round1TeamSchema>;
export type Round1ExportData = z.infer<typeof round1ExportDataSchema>;

