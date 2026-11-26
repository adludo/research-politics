import type { FindingStatus } from './verification-types';

export const issueKinds = {
  supported: null,
  contradicted: 'conflict',
  partial: 'conflict',
  outdated: 'conflict',
  'missing-reference': 'gap',
  inaccessible: 'gap',
  unverifiable: 'gap',
} as const satisfies Record<FindingStatus, 'conflict' | 'gap' | null>;

export function findingAnchor(runId: string, claimId: string) {
  return `statement-${runId}:${claimId}`;
}

export function verificationRunHref(runId: string) {
  return `/verification/${encodeURIComponent(runId)}/`;
}
