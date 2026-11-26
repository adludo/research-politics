import log from './verification-runs.json';
import type { VerificationEvidence, VerificationFinding, VerificationRun, VerificationSource } from './verification-types';

type Claim = Pick<VerificationFinding, 'claimId' | 'location' | 'statement'>;
type Outcome = Pick<VerificationFinding, 'status' | 'explanation' | 'suggestedCorrection'>;
type StoredFinding = Pick<VerificationFinding, 'sourceIds' | 'evidenceIds'> & { claim: string; outcome: string };

interface StoredLog {
  schemaVersion: 3;
  sources: Record<string, VerificationSource>;
  retrievals: Record<string, Omit<VerificationEvidence, 'quote' | 'locator'>>;
  passages: Record<string, Pick<VerificationEvidence, 'quote' | 'locator'>>;
  evidence: Record<string, readonly [retrieval: string, passage: string]>;
  claims: Record<string, Claim>;
  outcomes: Record<string, Outcome>;
  runs: (Omit<VerificationRun, 'findings'> & { findings: StoredFinding[] })[];
}

// The archive validator checks reference IDs and the two-element evidence tuples.
const archive = log as unknown as StoredLog;

function expandRun({ findings, ...run }: StoredLog['runs'][number]): VerificationRun {
  return {
    ...run,
    findings: findings.map(({ claim, outcome, ...references }) => ({
      ...archive.claims[claim],
      ...archive.outcomes[outcome],
      ...references,
    })),
  };
}

export const verificationRunIds = archive.runs.map(run => run.id);

export function getVerificationRuns() {
  return archive.runs.map(expandRun);
}

export function getVerificationRun(id: string) {
  const run = archive.runs.find(run => run.id === id);
  return run && expandRun(run);
}

export function getVerificationSource(id: string) {
  return archive.sources[id];
}

export function getVerificationEvidence(id: string): VerificationEvidence {
  const [retrieval, passage] = archive.evidence[id];
  return { ...archive.retrievals[retrieval], ...archive.passages[passage] };
}
