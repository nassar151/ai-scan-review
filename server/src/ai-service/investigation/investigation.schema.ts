import { z } from 'zod';
import { CONFIDENCE, DATA_FLOW_STEP_KIND, REACHABILITY, SEVERITY } from '@scan/shared';

const location = {
  path: z.string().nullable(),
  line: z.number().nullable(),
};

/**
 * The agent's final answer for one finding, in the order it must work: reachability, data flow, then the
 * new rating. Every field is required (nullable instead of optional) for OpenAI strict structured output.
 */
export const investigationSchema = z.object({
  reachability: z.object({
    status: z.enum([REACHABILITY.REACHABLE, REACHABILITY.NOT_REACHABLE, REACHABILITY.UNKNOWN]),
    explanation: z.string(),
  }),
  dataFlow: z.object({
    summary: z.string(),
    steps: z.array(
      z.object({
        kind: z.enum([DATA_FLOW_STEP_KIND.SOURCE, DATA_FLOW_STEP_KIND.PROPAGATION, DATA_FLOW_STEP_KIND.SINK]),
        description: z.string(),
        example: z.string().nullable(),
        ...location,
      }),
    ),
  }),
  rating: z.object({
    severity: z.enum([SEVERITY.CRITICAL, SEVERITY.HIGH, SEVERITY.MEDIUM, SEVERITY.LOW, SEVERITY.INFO]),
    riskScore: z.number(),
    severityReason: z.string(),
    changeReason: z.string(),
    riskScoreReason: z.string(),
  }),
  falsePositive: z.boolean(),
  confidence: z.enum([CONFIDENCE.HIGH, CONFIDENCE.MEDIUM, CONFIDENCE.LOW]),
  verdict: z.string(),
  whyItMatters: z.string(),
  attackScenario: z.string(),
  evidence: z.array(
    z.object({
      note: z.string(),
      ...location,
      searchPattern: z.string().nullable(),
    }),
  ),
  codeFix: z
    .object({
      path: z.string(),
      startLine: z.number(),
      endLine: z.number(),
      fixedCode: z.string(),
      explanation: z.string(),
    })
    .nullable(),
});

export type InvestigationOutput = z.infer<typeof investigationSchema>;

export const searchCodeArgs = z.object({
  pattern: z.string().min(1),
  isRegex: z.boolean(),
  pathPrefix: z.string().nullable(),
});

export const readFileArgs = z.object({
  path: z.string().min(1),
  startLine: z.number().nullable(),
  endLine: z.number().nullable(),
});

export const listFilesArgs = z.object({
  path: z.string().nullable(),
});
