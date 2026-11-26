import type { Metadata } from 'next';
import Link from 'next/link';
import { getVerificationRuns, verificationRunIds } from '../../data/verification-log';
import { verificationRunHref } from '../../data/verification-status';
import BackToTop from '../../components/ui/BackToTop';
import LegacyVerificationLink from './LegacyVerificationLink';
import { countIssues, timestamp } from './run-summary';
import styles from './verification.module.css';

export const metadata: Metadata = {
  title: 'Wiki verification log',
  description: 'Dated, on-demand source audits, conflicts and verification gaps.',
  robots: { index: false, follow: false },
};

export default function VerificationLog() {
  const runs = getVerificationRuns().sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  return (
    <main id="main" className="content-page" tabIndex={-1}>
      <Link href="/" className="back-link">Back to the wiki</Link>
      <h1>Verification log</h1>
      <p>Contradicted, partial and outdated claims are recorded as conflicts. Inaccessible sources, missing references and insufficient evidence are verification gaps.</p>
      {runs.length ? (
        <ul className={styles.runs}>
          {runs.map(run => {
            const { conflict, gap } = countIssues(run.findings);
            return (
              <li key={run.id} id={run.id} className="surface-card">
                <h2><Link href={verificationRunHref(run.id)}>{run.target} · {timestamp(run.completedAt)} Melbourne</Link></h2>
                <p>{run.status} · {run.findings.length} statements · {conflict} conflicts · {gap} gaps</p>
                <p>{run.summary}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="surface-card">
          <h2>No verification runs recorded</h2>
          <p>No page has been audited by this agent yet. An empty log does not mean the wiki has no conflicts or that its claims are verified.</p>
        </section>
      )}
      <LegacyVerificationLink runIds={verificationRunIds} />
      <BackToTop />
    </main>
  );
}
