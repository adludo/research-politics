'use client';

import { useEffect } from 'react';
import { verificationRunHref } from '../../data/verification-status';

export default function LegacyVerificationLink({ runIds }: { runIds: readonly string[] }) {
  useEffect(() => {
    function followFragment() {
      const hash = window.location.hash;
      let id: string;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        return;
      }
      const statementRun = /^(?:contents-)?statement-([^:]+):/.exec(id)?.[1];
      const runId = statementRun ?? runIds
        .filter(run => id === run || id === `${run}-contents` || id.startsWith(`${run}-area-`))
        .sort((a, b) => b.length - a.length)[0];

      if (runId && runIds.includes(runId)) {
        window.location.replace(verificationRunHref(runId) + hash);
      }
    }

    followFragment();
    window.addEventListener('hashchange', followFragment);
    return () => window.removeEventListener('hashchange', followFragment);
  }, [runIds]);

  return null;
}
