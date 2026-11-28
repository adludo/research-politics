import styles from './ElectionCalendar.module.css';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'UTC' });

export default function AnnouncementDayButton({ date, isElectionDay }: {
  date: string;
  isElectionDay: boolean;
}) {
  const day = new Date(date);
  const label = `${dateFormat.format(day)}, policy announcements${isElectionDay ? ', election day' : ''}`;

  return (
    <button type="button" className={styles.announcementDay} aria-label={label}>
      <time dateTime={date} className={isElectionDay ? styles.electionDay : undefined}>
        {day.getUTCDate()}{isElectionDay && <span>Election day</span>}
      </time>
    </button>
  );
}
