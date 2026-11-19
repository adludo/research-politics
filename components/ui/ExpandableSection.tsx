'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './ExpandableSection.module.css';

export interface ExpandableSectionProps {
  id: string;
  title: string;
  description?: string;
  index?: number;
  children: ReactNode;
}

/** Independent native disclosures keep content accessible without JavaScript. */
export default function ExpandableSection({
  id, title, description, index, children,
}: ExpandableSectionProps) {
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const revealLinkedSection = () => {
      if (window.location.hash !== `#${id}` || !panel.current) return;
      panel.current.open = true;
      panel.current.scrollIntoView({ block: 'start' });
    };
    revealLinkedSection();
    window.addEventListener('hashchange', revealLinkedSection);
    return () => window.removeEventListener('hashchange', revealLinkedSection);
  }, [id]);

  return (
    <details ref={panel} id={id} className={styles.panel}>
      <summary className={styles.summary}>
        {index !== undefined && <span className={styles.index} aria-hidden="true">{String(index).padStart(2, '0')}</span>}
        <span className={styles.label}>
          <span className={styles.title} role="heading" aria-level={2}>{title}</span>
          {description && <span className={styles.description}>{description}</span>}
        </span>
        <span className={styles.indicator} aria-hidden="true" />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
