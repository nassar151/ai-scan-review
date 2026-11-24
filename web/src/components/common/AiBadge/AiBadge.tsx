import { Pill } from '../Pill/Pill';
import { AI_BADGE_LABEL } from './AiBadge.consts';

/** Marks a finding the AI agent re-checked in the code. */
export const AiBadge = () => <Pill variant="info">{AI_BADGE_LABEL}</Pill>;
