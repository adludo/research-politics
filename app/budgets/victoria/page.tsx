import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import overview from '../../../data/victorian-budget/overview.json';
import styles from './budget.module.css';

export const metadata: Metadata = {
  title: 'Victorian state budget',
  description: 'Ten years of Victorian general government revenue, expenses, operating results and net debt.',
};

const amount = new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function VictorianBudget() {
  return (
    <main id="main" className="content-page">
      <Link href="/" className="back-link">Back to the wiki</Link>
      <h1>Victorian state budget</h1>
      <p>General government actuals from 2016–17 to 2025–26, in nominal Australian dollars.</p>
      <p>Net debt rose from $15.8 billion to $160.7 billion. The operating result was a deficit for six consecutive years from 2019–20 before returning to a $2.4 billion surplus in 2025–26.</p>

      <figure className={styles.figure}>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Budget chart">
          <Image
            src="/charts/victorian-budget-overview.svg"
            width={576}
            height={576}
            alt="Three panels track revenue and expenses, the net operating result, and June-end net debt. Annual values are in the table below."
            unoptimized
          />
        </div>
        <figcaption className={styles.caption}>Source: Victorian Department of Treasury and Finance, November 2026 financial aggregates.</figcaption>
      </figure>

      <section aria-labelledby="values-heading">
        <h2 id="values-heading">Annual figures</h2>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Annual budget figures">
          <table className={styles.table}>
            <caption>General government actuals (A$ billion)</caption>
            <thead>
              <tr><th scope="col">Financial year</th><th scope="col">Revenue</th><th scope="col">Expenses</th><th scope="col">Net operating result</th><th scope="col">Net debt</th></tr>
            </thead>
            <tbody>
              {overview.rows.map(row => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  <td>{amount.format(row.revenue)}</td>
                  <td>{amount.format(row.expenses)}</td>
                  <td>{amount.format(row.operatingResult)}</td>
                  <td>{amount.format(row.netDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading">Sources and definitions</h2>
        <p>The operating result is Treasury’s published net result from transactions. Net debt is measured at 30 June. The source workbooks document accounting changes and restatements.</p>
        <ul>
          {overview.sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}
          <li><a href="https://www.dtf.vic.gov.au/other-financial-aggregates">Treasury financial aggregates</a></li>
          <li><a href="https://www.dtf.vic.gov.au/previous-budgets">Previous Victorian budgets</a></li>
        </ul>
      </section>
    </main>
  );
}
