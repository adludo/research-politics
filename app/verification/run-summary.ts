import type { VerificationFinding } from '../../data/verification-types';
import { issueKinds } from '../../data/verification-status';

export function countIssues(findings: VerificationFinding[]) {
  const counts = { conflict: 0, gap: 0 };
  for (const { status } of findings) {
    const kind = issueKinds[status];
    if (kind) counts[kind]++;
  }
  return counts;
}

export function timestamp(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Melbourne',
  }).format(new Date(value));
}
