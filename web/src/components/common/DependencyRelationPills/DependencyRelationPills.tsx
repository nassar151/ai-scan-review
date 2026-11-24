import { Pill } from '../Pill/Pill';
import { relationPills } from './DependencyRelationPills.helpers';
import type { DependencyRelationPillsProps } from './DependencyRelationPills.types';

export const DependencyRelationPills = ({ dependency }: DependencyRelationPillsProps) => (
  <>
    {relationPills(dependency).map((pill) => (
      <span key={pill.label} title={pill.hint}>
        <Pill variant={pill.variant}>{pill.label}</Pill>
      </span>
    ))}
  </>
);
