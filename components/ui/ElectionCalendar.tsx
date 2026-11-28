'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import AnnouncementDayButton from './AnnouncementDayButton';
import CalendarAnnouncementPanel, { type CalendarAnnouncement } from './CalendarAnnouncementPanel';
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
export default function ElectionCalendar({ electionDate, earlyVotingDate, announcementsByDate }: {
  electionDate: string;
  earlyVotingDate?: string;
  announcementsByDate: Readonly<Record<string, readonly CalendarAnnouncement[]>>;
}) {
  const [selection, setSelection] = useState<{ date: string; button: HTMLButtonElement } | null>(null);
  const panelId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function closePanel() {
    selection?.button.focus();
    setSelection(null);
  }

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const panel = panelRef.current;
    if (!grid || !panel || !selection) return;

    const positionPanel = () => {
      panel.style.top = `${selection.button.getBoundingClientRect().bottom - grid.getBoundingClientRect().top}px`;
    };

    positionPanel();
    headingRef.current?.focus();
    const observer = new ResizeObserver(positionPanel);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [selection]);

  const election = new Date(electionDate);
  const milestones = new Map([[electionDate, 'Election day']]);
  if (earlyVotingDate) milestones.set(earlyVotingDate, 'Early voting opens');
  const months = [-2, -1, 0].map(offset =>
    new Date(Date.UTC(election.getUTCFullYear(), election.getUTCMonth() + offset, 1)),
  );

  return (
    <div className={styles.calendar} onKeyDown={event => {
      if (event.key === 'Escape' && selection) closePanel();
    }}>
      <div ref={gridRef} className={styles.months}>
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
                      const milestone = milestones.get(date);

                      return (
                        <td key={weekday}>
                          {announcementsByDate[date] ? (
                            <AnnouncementDayButton
                              date={date}
                              parties={announcementsByDate[date].map(announcement => announcement.party)}
                              milestone={milestone}
                              expanded={selection?.date === date}
                              panelId={panelId}
                              onClick={event => {
                                if (selection?.date === date) closePanel();
                                else setSelection({ date, button: event.currentTarget });
                              }}
                            />
                          ) : milestone ? (
                            <time dateTime={date} className={styles.votingDay}>
                              {day}<span>{milestone}</span>
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
      {selection && (
        <CalendarAnnouncementPanel
          id={panelId}
          date={selection.date}
          announcements={announcementsByDate[selection.date]}
          onClose={closePanel}
          panelRef={panelRef}
          headingRef={headingRef}
        />
      )}
    </div>
  );
}
