import { z } from "zod";

const optionalInt = z
  .string()
  .optional()
  .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
  .pipe(z.number().int().positive().optional());

export const cutoffsQuerySchema = z.object({
  exam_type: z.string().optional(),
  year: optionalInt,
  round: optionalInt,
  institute_type: z.string().optional(),
  institute: z.string().optional(),
  institute_values: z.string().optional(),
  program: z.string().optional(),
  program_values: z.string().optional(),
  state: z.string().optional(),
  quota: z.string().optional(),
  seat_type: z.string().optional(),
  gender: z.string().optional(),
  opening_min: optionalInt,
  opening_max: optionalInt,
  rank_min: optionalInt,
  rank_max: optionalInt,
  page: optionalInt.default(1),
  page_size: optionalInt.default(25),
  sort: z
    .enum(["closing_rank", "opening_rank", "institute", "program", "year", "round", "-closing_rank", "-opening_rank", "-year", "-round"])
    .optional()
    .default("closing_rank")
});

export const predictQuerySchema = z.object({
  rank: z.string().transform((value) => Number.parseInt(value, 10)).pipe(z.number().int().positive()),
  exam_type: z.enum(["JEE Main", "JEE Advanced"]),
  year: optionalInt,
  round: optionalInt,
  institute_type: z.string().optional(),
  institute_values: z.string().optional(),
  state: z.string().optional(),
  quota: z.string().optional(),
  seat_type: z.string().optional(),
  gender: z.string().optional(),
  branch: z.string().optional()
});
