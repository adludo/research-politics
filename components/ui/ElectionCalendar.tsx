import styles from './ElectionCalendar.module.css';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthFormat = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function getMonthWeeks(month: Date) {
  const firstWeekday = (month.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((firstWeekday + days) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => week * 7 + weekday - firstWeekday + 1)
      .map(day => day >= 1 && day <= days ? day : null),
  );
}

/** Shows the election month and the preceding two months for an ISO calendar date. */
export default function ElectionCalendar({ electionDate }: { electionDate: string }) {
  const election = new Date(electionDate);
  const months = [-2, -1, 0].map(offset =>
    new Date(Date.UTC(election.getUTCFullYear(), election.getUTCMonth() + offset, 1)),
  );

  return (
    <div className={styles.months}>
      {months.map(month => {
        const monthKey = month.toISOString().slice(0, 7);

        return (
          <table key={monthKey} className={styles.month}>
            <caption>{monthFormat.format(month)}</caption>
            <thead>
              <tr>
                {weekdays.map(day => <th key={day} scope="col" aria-label={day}>{day.slice(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {getMonthWeeks(month).map((week, index) => (
                <tr key={index}>
                  {week.map((day, weekday) => {
                    if (day === null) return <td key={weekday} />;
                    const date = `${monthKey}-${String(day).padStart(2, '0')}`;

                    return (
                      <td key={weekday}>
                        {date === electionDate ? (
                          <time dateTime={date} className={styles.electionDay}>
                            {day}<span>Election day</span>
                          </time>
                        ) : day}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
