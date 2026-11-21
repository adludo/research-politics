'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './ExpandableSection.module.css';

export interface ExpandableSectionProps {
  id: string;
  title: string;
  description?: string;
  index?: number;
  headingLevel?: 2 | 3 | 4;
  variant?: 'default' | 'compact' | 'subtle';
  children: ReactNode;
}

/** Independent native disclosures keep content accessible without JavaScript. */
export default function ExpandableSection({
  id, title, description, index, headingLevel = 2, variant = 'default', children,
}: ExpandableSectionProps) {
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const revealLinkedSection = () => {
      const details = panel.current;
      if (!details || !window.location.hash) return;

      let target: HTMLElement | null;
      try {
        target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      } catch {
        return;
      }
      if (!target || target.closest('details') !== details) return;

      details.open = true;
      let ancestor = details.parentElement?.closest('details');
      while (ancestor) {
        ancestor.open = true;
        ancestor = ancestor.parentElement?.closest('details');
      }
      target.scrollIntoView({ block: 'start' });
    };
    revealLinkedSection();
    window.addEventListener('hashchange', revealLinkedSection);
    return () => window.removeEventListener('hashchange', revealLinkedSection);
  }, []);

  return (
    <details ref={panel} id={id} className={`${styles.panel} ${variant === 'default' ? '' : styles[variant]}`}>
      <summary className={styles.summary}>
        {index !== undefined && <span className={styles.index} aria-hidden="true">{String(index).padStart(2, '0')}</span>}
        <span className={styles.label}>
          <span className={styles.title} role="heading" aria-level={headingLevel}>{title}</span>
          {description && <span className={styles.description}>{description}</span>}
        </span>
        <span className={styles.indicator} aria-hidden="true" />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
