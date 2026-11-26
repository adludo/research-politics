import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVerificationEvidence, getVerificationRun, getVerificationSource, verificationRunIds } from '../../../data/verification-log';
import { countIssues, timestamp } from '../run-summary';
import comparison from '../../../data/victoria-2026.json';
import type { VerificationRun, VerificationFinding } from '../../../data/verification-types';
import { findingAnchor, issueKinds, verificationRunHref } from '../../../data/verification-status';
import BackToTop from '../../../components/ui/BackToTop';
import VerificationBadge from '../../../components/verification/VerificationBadge';
import ExpandableSection from '../../../components/ui/ExpandableSection';
import styles from '../verification.module.css';

export const metadata: Metadata = {
  title: 'Wiki verification run',
  description: 'Dated, on-demand source audits, conflicts and verification gaps.',
  robots: { index: false, follow: false },
};

const policyAreas = new Map(comparison.sections.map(({ id, title }) => [id, title]));

interface FindingEntry {
  finding: VerificationFinding;
  party?: string;
  id: string;
}

interface FindingArea {
  id: string;
  title: string;
  entries: FindingEntry[];
}

function groupFindings(run: VerificationRun) {
  const areas = new Map<string, FindingArea>();
  for (const finding of run.findings) {
    const location = /^data\/victoria-2026\.json#\/sections\/\d+\/parties\/\d+\/claims\/\d+ \(assertion \d+; (.+)\)$/.exec(finding.location);
    const policyId = location && /^(.+)-\d+-\d+-\d+$/.exec(finding.claimId)?.[1];
    const areaId = policyId || (finding.claimId.startsWith('page-') ? 'page-context' : 'other');
    const title = policyAreas.get(areaId) ?? (policyId || (areaId === 'page-context' ? 'Page context' : 'Other statements'));
    const area = areas.get(areaId) ?? { id: areaId, title, entries: [] };
    area.entries.push({ finding, party: location?.[1], id: findingAnchor(run.id, finding.claimId) });
    areas.set(areaId, area);
  }
  return [...areas.values()];
}

function Finding({ finding, party, id }: FindingEntry) {
  return (
    <article id={id} className={styles.finding} tabIndex={-1}>
      <h3><code>{finding.claimId}</code>{party && ` · ${party}`}</h3>
      <p>
        <strong>Status:</strong>{' '}
        <VerificationBadge status={finding.status} />
      </p>
      <p><strong>Statement:</strong> {finding.statement}</p>
      <p>{finding.explanation.replace(/^HTTP 200[.;]\s*/i, '')}</p>
      {finding.suggestedCorrection && <p><strong>Suggested correction:</strong> {finding.suggestedCorrection}</p>}
      <ul>{finding.sourceIds.map(id => {
        const source = getVerificationSource(id);
        return <li key={id}><a href={source.url}>{source.url}</a></li>;
      })}</ul>
      {finding.evidenceIds.map(id => {
        const evidence = getVerificationEvidence(id);
        const source = getVerificationSource(evidence.sourceId);
        const httpStatus = /(?:\bHTTP(?: status)?\s+|Tunnel connection failed:\s*)([1-5]\d{2})\b/i.exec(evidence.accessNote)?.[1];
        return (
          <div key={id} className={styles.evidence}>
            <p><a href={source.url}>{source.title ?? source.url}</a> — {source.publisher ?? 'Publisher not established'}</p>
            <p>Retrieved: <time dateTime={evidence.retrievedAt}>{evidence.retrievedAt}</time></p>
            <p>Published: {source.publicationDate ?? 'Not shown'} · Updated: {source.updateDate ?? 'Not shown'}</p>
            {evidence.quote && <blockquote>{evidence.quote}</blockquote>}
            {httpStatus && httpStatus !== '200' && <p>{evidence.accessNote}</p>}
          </div>
        );
      })}
    </article>
  );
}

interface FindingAreaProps {
  runId: string;
  areas: FindingArea[];
}

function StatementContents({ runId, areas }: FindingAreaProps) {
  if (!areas.length) return null;

  return (
    <nav id={`${runId}-contents`} className={`surface-card ${styles.contents}`} aria-label="Statement contents">
      <h2>Statement contents</h2>
      <p>Open a policy area to jump to a statement. For policy IDs, the three numbers identify the party, policy group and statement in that order.</p>
      {areas.map(area => {
        const counts = countIssues(area.entries.map(({ finding }) => finding));
        return (
          <details key={area.id}>
            <summary>
              {area.title} ({area.entries.length})
              {counts.conflict > 0 && <VerificationBadge kind="conflict" count={counts.conflict} />}
              {counts.gap > 0 && <VerificationBadge kind="gap" count={counts.gap} />}
            </summary>
            <ul>
              {area.entries.map(({ finding, party, id }) => (
                <li key={id}>
                  <a href={`#${encodeURIComponent(id)}`} aria-describedby={`contents-${id}`}>
                    <code>{finding.claimId}</code>{party && ` · ${party}`}
                  </a>
                  {issueKinds[finding.status] && <VerificationBadge status={finding.status} />}
                  <span id={`contents-${id}`} className={styles.statement}>{finding.statement}</span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}

function FindingAreas({ runId, areas }: FindingAreaProps) {
  return areas.map(area => (
    <ExpandableSection key={area.id} id={`${runId}-area-${area.id}`} title={area.title}
      headingLevel={2} description={`${area.entries.length} statements`}>
      {area.entries.map(({ finding, party, id }) => (
        <Finding key={id} finding={finding} party={party} id={id} />
      ))}
      <p><a href={`#${runId}-contents`}>Back to statement contents</a></p>
    </ExpandableSection>
  ));
}

export function generateStaticParams() {
  return verificationRunIds.map(runId => ({ runId }));
}

export default async function VerificationRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getVerificationRun(runId);
  if (!run) notFound();

  const { conflict, gap } = countIssues(run.findings);
  const areas = groupFindings(run);
  const supported = run.findings.length - conflict - gap;

  return (
    <main id="main" className="content-page" tabIndex={-1}>
      <Link href="/verification/" className="back-link">Back to the verification log</Link>
      <h1>Verification run</h1>
      <p id={run.id}>{run.target} · {timestamp(run.completedAt)} Melbourne · {run.status} · {conflict} conflicts · {gap} gaps</p>
      <p>{run.summary}</p>
      <StatementContents runId={run.id} areas={areas} />
      <dl className={styles.metadata}>
        <dt>Run</dt><dd>{run.id}</dd>
        <dt>Started</dt><dd><time dateTime={run.startedAt}>{run.startedAt}</time></dd>
        <dt>Completed</dt><dd><time dateTime={run.completedAt}>{run.completedAt}</time></dd>
        <dt>Research as of</dt><dd>{run.researchAsOf}</dd>
        <dt>Revision</dt><dd><code>{run.revision}</code>{run.dirty ? ' (uncommitted changes included)' : ''}</dd>
        <dt>Results</dt><dd>{supported} supported / {run.findings.length} statements checked</dd>
        {run.supersedesRunId && <><dt>Follows</dt><dd><Link href={verificationRunHref(run.supersedesRunId)}>{run.supersedesRunId}</Link></dd></>}
      </dl>
      <details><summary>Reviewed files and SHA-256 hashes</summary><ul>{run.reviewedFiles.map(file => (
        <li key={file.path}><code>{file.path}: {file.sha256}</code></li>
      ))}</ul></details>
      <FindingAreas runId={run.id} areas={areas} />
      <BackToTop />
    </main>
  );
}
