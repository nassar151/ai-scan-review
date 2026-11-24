import { z } from 'zod';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The only values the backend may fill in for the model: "nothing" for a nullable field, "none" for a list. */
const emptyValueFor = (schema: z.ZodType): unknown => {
  if (schema instanceof z.ZodNullable) return null;
  if (schema instanceof z.ZodArray) return [];
  return undefined;
};

/**
 * Models sometimes drop a field whose honest answer is empty (`codeFix: null`, `advisories: []`) or wrap the
 * object in a one-item array. This adds those empty values and unwraps the array, nothing else, so a missing
 * real field (a reason, a severity) still fails validation.
 */
export const fillEmptyFields = (schema: z.ZodType, value: unknown): unknown => {
  if (schema instanceof z.ZodNullable) return value === null ? null : fillEmptyFields(schema.unwrap() as z.ZodType, value);
  if (schema instanceof z.ZodArray) {
    return Array.isArray(value) ? value.map((item) => fillEmptyFields(schema.element as z.ZodType, item)) : value;
  }
  if (!(schema instanceof z.ZodObject)) return value;
  const object = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!isRecord(object)) return object;
  const shape = schema.shape as Record<string, z.ZodType>;
  return Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [key, object[key] === undefined ? emptyValueFor(field) : fillEmptyFields(field, object[key])]),
  );
};
