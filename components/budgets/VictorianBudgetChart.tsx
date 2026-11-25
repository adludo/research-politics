import Image from 'next/image';
import styles from './VictorianBudgetChart.module.css';

export default function VictorianBudgetChart() {
  return (
    <figure className={styles.figure}>
      <div tabIndex={0} role="region" aria-label="Budget chart">
        <Image
          src="/charts/victorian-budget-overview.svg"
          width={576}
          height={576}
          alt="Three panels track revenue and expenses, the net operating result, and June-end net debt."
          unoptimized
        />
      </div>
      <figcaption className={styles.caption}>Source: Victorian Department of Treasury and Finance, November 2026 financial aggregates.</figcaption>
    </figure>
  );
}
