import type { MouseEventHandler } from 'react';
import styles from './ElectionCalendar.module.css';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'UTC' });
const calendarParties = [
  { name: 'Labor', label: 'Labor', marker: styles.labor },
  { name: 'Liberal–National Coalition', label: 'LNP', marker: styles.coalition },
  { name: 'Greens', label: 'Greens', marker: styles.greens },
  { name: 'One Nation', label: 'One Nation', marker: styles.oneNation },
];

export function CalendarPartyLegend() {
  return (
    <ul className={styles.partyLegend} aria-label="Party colours">
      {calendarParties.map(party => (
        <li key={party.name}>
          <span className={`${styles.partyDot} ${party.marker}`} aria-hidden="true" />
          {party.label}
        </li>
      ))}
    </ul>
  );
}

export default function AnnouncementDayButton({ date, parties, isElectionDay, expanded, panelId, onClick }: {
  date: string;
  parties: readonly string[];
  isElectionDay: boolean;
  expanded: boolean;
  panelId: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  const day = new Date(date);
  const partyNames = [...new Set(parties)];
  const markers = calendarParties.filter(party => partyNames.includes(party.name));
  const label = `${dateFormat.format(day)}, policy announcements from ${partyNames.join(', ')}${isElectionDay ? ', election day' : ''}`;

  return (
    <button
      type="button"
      className={styles.announcementDay}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={expanded ? panelId : undefined}
      onClick={onClick}
    >
      <time dateTime={date} className={isElectionDay ? styles.electionDay : undefined}>
        {day.getUTCDate()}{isElectionDay && <span>Election day</span>}
      </time>
      {markers.length > 0 && (
        <span className={styles.partyDots} aria-hidden="true">
          {markers.map(party => <span key={party.name} className={`${styles.partyDot} ${party.marker}`} />)}
        </span>
      )}
    </button>
  );
}
