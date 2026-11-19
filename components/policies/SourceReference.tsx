import type { PolicySource } from './types';

export interface SourceReferenceProps {
  source: PolicySource;
  statusLabel: string;
  prefix?: string;
}

export default function SourceReference({
  source, statusLabel, prefix = 'Supplied reference',
}: SourceReferenceProps) {
  return (
    <small className="policy-reference">
      {prefix}: <a href={source.url}>{source.publisher} — {source.title}</a>
      {statusLabel && ` · ${statusLabel}`}
    </small>
  );
}
