import type { Ref } from 'react';
import styles from './ElectionCalendar.module.css';

export interface CalendarAnnouncement {
  party: string;
  area: string;
  text: string;
  sourceUrl: string;
}

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'UTC' });

export default function CalendarAnnouncementPanel({ id, date, announcements, onClose, panelRef, headingRef }: {
  id: string;
  date: string;
  announcements: readonly CalendarAnnouncement[];
  onClose: () => void;
  panelRef: Ref<HTMLElement>;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const headingId = `${id}-title`;

  return (
    <section ref={panelRef} id={id} className={styles.announcementPanel} aria-labelledby={headingId}>
      <header className={styles.panelHeader}>
        <h3 ref={headingRef} id={headingId} tabIndex={-1}>
          Announcements on {dateFormat.format(new Date(date))}
        </h3>
        <button type="button" className={styles.closePanel} onClick={onClose}>Close</button>
      </header>
      <ul className={styles.announcementList}>
        {announcements.map(({ party, area, text, sourceUrl }, index) => (
          <li key={index}>
            <strong>{party} · {area}</strong>
            <p>{text}</p>
            <a href={sourceUrl}>Announcement source</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
