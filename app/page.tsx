import Link from 'next/link';
import comparison from '../data/victoria-2026.json';
import styles from './page.module.css';

const elections = [
  {
    name: 'Victorian state election',
    date: comparison.electionDateSupplied,
    href: '/elections/victoria-2026/',
  },
];

const electionDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function Home() {
  return (
    <main id="main" className={styles.home}>
      <h1>Elections</h1>
      <ul className={styles.elections}>
        {elections.map(({ name, date, href }) => (
          <li key={href}>
            <Link className={styles.tile} href={href}>
              <time dateTime={date}>{electionDate.format(new Date(date))}</time>
              <span className={styles.name}>{name}</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/budgets/victoria/" className={styles.budgetLink}>Victorian state budget</Link>
    </main>
  );
}
