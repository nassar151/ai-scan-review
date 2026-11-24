import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  SHORT_SHA_LENGTH,
  UNDER_A_SECOND,
} from './format.consts';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, DATE_TIME_FORMAT);
const dateFormatter = new Intl.DateTimeFormat(undefined, DATE_FORMAT);
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const numberFormatter = new Intl.NumberFormat();

export const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.round(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

export const durationBetween = (start?: string, end?: string) => {
  if (!start || !end) return undefined;
  const ms = Date.parse(end) - Date.parse(start);
  return ms < MS_PER_SECOND / 2 ? UNDER_A_SECOND : formatDuration(ms);
};

export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export const formatRelativeTime = (iso: string, now = Date.now()) => {
  const seconds = Math.round((Date.parse(iso) - now) / MS_PER_SECOND);
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (Math.abs(seconds) < SECONDS_PER_MINUTE) return relativeFormatter.format(seconds, 'second');
  if (Math.abs(minutes) < MINUTES_PER_HOUR) return relativeFormatter.format(minutes, 'minute');
  return Math.abs(hours) < HOURS_PER_DAY
    ? relativeFormatter.format(hours, 'hour')
    : relativeFormatter.format(Math.round(hours / HOURS_PER_DAY), 'day');
};

export const formatNumber = (value: number) => numberFormatter.format(value);

export const shortSha = (sha: string) => sha.slice(0, SHORT_SHA_LENGTH);

export const formatLocation = (path: string, line?: number) => (line ? `${path}:${line}` : path);
