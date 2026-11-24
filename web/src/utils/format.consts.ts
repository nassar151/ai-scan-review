export const MS_PER_SECOND = 1000;
/** Shown for stages that finish in under half a second, so they don't read as "0s". */
export const UNDER_A_SECOND = '<1s';
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const SHORT_SHA_LENGTH = 7;

export const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

export const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };
