import type { FindingStatus } from '../../data/verification-types';
import { issueKinds } from '../../data/verification-status';
import styles from './VerificationBadge.module.css';

type BadgeProps =
  | { status: FindingStatus | 'pending'; href?: string }
  | { kind: 'conflict' | 'gap'; count: number };

export default function VerificationBadge(props: BadgeProps) {
  if ('count' in props) {
    const { kind, count } = props;
    return <span className={`${styles.badge} ${styles[kind]}`}>{count} {kind}{count === 1 ? '' : 's'}</span>;
  }

  const { status, href } = props;
  const kind = status === 'pending' ? 'pending' : issueKinds[status] ?? 'supported';
  const label = kind === 'conflict' || kind === 'gap'
    ? `${kind === 'conflict' ? 'Conflict' : 'Gap'} · ${status.replaceAll('-', ' ')}`
    : kind === 'pending' ? 'Verification pending' : 'Verified';
  const className = `${styles.badge} ${styles[kind]}`;

  return href
    ? <a href={href} className={className} aria-label={`${label}. View verification finding`}>{label}</a>
    : <span className={className}>{label}</span>;
}
