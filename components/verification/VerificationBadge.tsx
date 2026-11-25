import type { FindingStatus } from '../../data/verification-types';
import { issueKinds } from '../../data/verification-status';
import styles from './VerificationBadge.module.css';

export default function VerificationBadge({ status, href }: {
  status: FindingStatus | 'pending';
  href?: string;
}) {
  const kind = status === 'pending' ? 'pending' : issueKinds[status] ?? 'supported';
  const label = kind === 'conflict' || kind === 'gap'
    ? `${kind === 'conflict' ? 'Conflict' : 'Gap'} · ${status.replaceAll('-', ' ')}`
    : kind === 'pending' ? 'Verification pending' : 'Supported';
  const className = `${styles.badge} ${styles[kind]}`;

  return href
    ? <a href={href} className={className} aria-label={`${label}. View verification finding`}>{label}</a>
    : <span className={className}>{label}</span>;
}
