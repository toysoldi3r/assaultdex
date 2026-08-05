import { z } from "zod";

const percentSchema = z.number().finite().min(0).max(100);

export const teammateUsageSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  pct: percentSchema,
});

export const monUsageSchema = z.object({
  name: z.string().min(1),
  usage: percentSchema,
  winRate: percentSchema,
  teams: z.number().int().min(0).optional().default(0),
  teammates: z.array(teammateUsageSchema),
});

export const teamRankSchema = z.object({
  members: z.array(z.string().min(1)).min(1).max(6),
  battles: z.number().int().min(0),
  winRate: percentSchema,
  count: z.number().int().min(0).optional().default(0),
});

export const coreEntrySchema = z.object({
  members: z.array(z.string().min(1)).min(2).max(4),
  size: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  battles: z.number().int().min(0),
  winRate: percentSchema,
}).superRefine((value, ctx) => {
  if (value.members.length !== value.size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "core member count must match size",
      path: ["members"],
    });
  }
});

export const usageDataSchema = z.object({
  format: z.string().min(1),
  totalBattles: z.number().int().min(0),
  mons: z.record(monUsageSchema),
  topTeams: z.array(teamRankSchema).optional(),
  cores: z.array(coreEntrySchema).optional(),
});

export type UsageDataInput = z.input<typeof usageDataSchema>;
export type UsageDataOutput = z.output<typeof usageDataSchema>;
