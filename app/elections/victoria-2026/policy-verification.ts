import { getVerificationRuns } from '../../../data/verification-log';
import { findingAnchor, issueKinds, verificationRunHref } from '../../../data/verification-status';
import type { PolicyVerification } from '../../../components/policies/types';

export function getPolicyVerification() {
  const target = '/elections/victoria-2026';
  const runs = getVerificationRuns()
    .filter(run => [target, `${target}/`, 'app/elections/victoria-2026/page.tsx'].includes(run.target))
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const policies = new Map<string, PolicyVerification>();
  const seen = new Set<string>();
  const priority = { conflict: 2, gap: 1, supported: 0 };

  for (const run of runs) {
    for (const finding of run.findings) {
      const location = /^data\/victoria-2026\.json#(\/sections\/\d+\/parties\/\d+\/claims\/\d+)(?: |$)/.exec(finding.location);
      if (!location || seen.has(finding.claimId)) continue;
      seen.add(finding.claimId);

      const policy = location[1];
      const current = policies.get(policy);
      const kind = issueKinds[finding.status] ?? 'supported';
      if (current && priority[issueKinds[current.status] ?? 'supported'] >= priority[kind]) continue;

      policies.set(policy, {
        status: finding.status,
        href: `${verificationRunHref(run.id)}#${encodeURIComponent(findingAnchor(run.id, finding.claimId))}`,
      });
    }
  }

  return policies;
}
