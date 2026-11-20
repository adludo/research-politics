import type { Metadata } from 'next';
import Link from 'next/link';
import log from '../../data/verification-runs.json';
import type { VerificationLog, FindingStatus } from '../../data/verification-types';
import ExpandableSection from '../../components/ui/ExpandableSection';
import styles from './verification.module.css';

export const metadata: Metadata = {
  title: 'Wiki verification log',
  description: 'Dated, on-demand source audits, conflicts and verification gaps.',
  robots: { index: false, follow: false },
};

const registry = log as VerificationLog;
const runs = registry.runs;
const conflicts: FindingStatus[] = ['contradicted', 'partial', 'outdated'];

function timestamp(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Melbourne',
  }).format(new Date(value));
}

export default function VerificationLog() {
  return (
    <main id="main">
      <Link href="/">Back to the wiki</Link>
      <h1>Verification log</h1>
      <p>Source checks run only when requested for a specific page. This log preserves dated findings; it does not automatically correct or approve an article.</p>
      <p>Contradicted, partial and outdated claims are recorded as conflicts. Inaccessible sources, missing references and insufficient evidence are verification gaps. Historical findings remain visible after later runs.</p>
      {!runs.length ? (
        <section className={styles.empty}>
          <h2>No verification runs recorded</h2>
          <p>No page has been audited by this agent yet. An empty log does not mean the wiki has no conflicts or that its claims are verified.</p>
        </section>
      ) : [...runs].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map(run => {
        const conflictCount = run.findings.filter(f => conflicts.includes(f.status)).length;
        const supported = run.findings.filter(f => f.status === 'supported').length;
        const gaps = run.findings.length - supported - conflictCount;
        return (
          <section key={run.id} className={styles.run}>
            <ExpandableSection id={run.id} title={run.target}
              description={`${timestamp(run.completedAt)} Melbourne · ${run.status} · ${conflictCount} conflicts · ${gaps} gaps`}>
              <p>{run.summary}</p>
              <dl className={styles.metadata}>
                <dt>Run</dt><dd>{run.id}</dd>
                <dt>Started</dt><dd><time dateTime={run.startedAt}>{run.startedAt}</time></dd>
                <dt>Completed</dt><dd><time dateTime={run.completedAt}>{run.completedAt}</time></dd>
                <dt>Research as of</dt><dd>{run.researchAsOf}</dd>
                <dt>Revision</dt><dd><code>{run.revision}</code>{run.dirty ? ' (uncommitted changes included)' : ''}</dd>
                <dt>Results</dt><dd>{supported} supported / {run.findings.length} statements checked</dd>
                {run.supersedesRunId && <><dt>Follows</dt><dd><a href={`#${run.supersedesRunId}`}>{run.supersedesRunId}</a></dd></>}
              </dl>
              <details><summary>Reviewed files and SHA-256 hashes</summary><ul>{run.reviewedFiles.map(file => (
                <li key={file.path}><code>{file.path}: {file.sha256}</code></li>
              ))}</ul></details>
              {run.findings.map(finding => (
                <article key={finding.claimId} className={styles.finding}>
                  <h3>{finding.status.replaceAll('-', ' ')}: {finding.claimId}</h3>
                  <p><strong>Statement:</strong> {finding.statement}</p>
                  <p><strong>Location:</strong> <code>{finding.location}</code></p>
                  <p>{finding.explanation}</p>
                  {finding.suggestedCorrection && <p><strong>Suggested correction:</strong> {finding.suggestedCorrection}</p>}
                  <ul>{finding.sourceIds.map(id => {
                    const source = registry.sources[id];
                    return <li key={id}><a href={source.url}>{source.url}</a></li>;
                  })}</ul>
                  {finding.evidenceIds.map(id => {
                    const evidence = registry.evidence[id];
                    const source = registry.sources[evidence.sourceId];
                    return (
                      <div key={id} className={styles.evidence}>
                        <p><a href={source.url}>{source.title ?? source.url}</a> — {source.publisher ?? 'Publisher not established'}</p>
                        <p>Retrieved: <time dateTime={evidence.retrievedAt}>{evidence.retrievedAt}</time> · Method: {evidence.method}</p>
                        <p>Published: {source.publicationDate ?? 'Not shown'} · Updated: {source.updateDate ?? 'Not shown'} · Crawl date: {source.crawlDate ?? 'Not shown'}</p>
                        {evidence.quote && <blockquote>{evidence.quote}</blockquote>}
                        {evidence.locator && <p>Source location: {evidence.locator}</p>}
                        <p>{evidence.accessNote}</p>
                      </div>
                    );
                  })}
                </article>
              ))}
            </ExpandableSection>
          </section>
        );
      })}
    </main>
  );
}
