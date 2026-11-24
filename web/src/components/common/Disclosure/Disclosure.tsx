import { Button } from '@forgedevstack/bear';
import { useState } from 'react';
import { CLOSED_ICON, OPEN_ICON } from './Disclosure.consts';
import type { DisclosureProps } from './Disclosure.types';

/** Show/hide toggle; Bear's Accordion has no dark-mode surface styles. */
export const Disclosure = ({ label, children, defaultOpen = false }: DisclosureProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bear-flex bear-flex-col bear-gap-2">
      <div>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
          {isOpen ? OPEN_ICON : CLOSED_ICON} {label}
        </Button>
      </div>
      {isOpen && children}
    </div>
  );
};
