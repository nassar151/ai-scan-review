import type { BadgeProps } from '@forgedevstack/bear';

export type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface TokenMeta {
  label: string;
  /** Hex colour, e.g. "#ef4444". */
  color: string;
}
