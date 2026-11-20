export type FindingStatus = 'supported' | 'contradicted' | 'partial' | 'outdated' |
  'missing-reference' | 'inaccessible' | 'unverifiable';

export interface VerificationEvidence {
  url: string;
  publisher: string | null;
  title: string | null;
  retrievedAt: string;
  method: 'direct-http' | 'extracted-page' | 'search-snippet' | 'supplied-document';
  publicationDate: string | null;
  updateDate: string | null;
  crawlDate: string | null;
  quote: string | null;
  locator: string | null;
  accessNote: string;
}

export interface VerificationFinding {
  claimId: string;
  location: string;
  statement: string;
  sourceUrls: string[];
  status: FindingStatus;
  explanation: string;
  suggestedCorrection: string | null;
  evidence: VerificationEvidence[];
}

export interface VerificationRun {
  id: string;
  target: string;
  startedAt: string;
  completedAt: string;
  researchAsOf: string;
  revision: string;
  dirty: boolean;
  reviewedFiles: { path: string; sha256: string }[];
  status: 'complete' | 'incomplete';
  supersedesRunId: string | null;
  summary: string;
  findings: VerificationFinding[];
}
