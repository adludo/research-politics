import ExpandableSection from '../ui/ExpandableSection';
import VerificationBadge from '../verification/VerificationBadge';
import SourceReference from './SourceReference';
import type { PartyPolicies, PolicySources, PolicyVerification } from './types';
import styles from './PolicyComparison.module.css';

const policyDateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export interface PartyPolicyCardProps {
  id: string;
  party: PartyPolicies;
  headingLevel?: 3 | 4;
  sources: PolicySources;
  referenceStatus?: string;
  verification?: readonly (PolicyVerification | undefined)[];
}

export default function PartyPolicyCard({ id, party, sources, referenceStatus, verification, headingLevel = 3 }: PartyPolicyCardProps) {
  return (
    <article>
      <ExpandableSection
        id={id}
        title={party.name}
        description={`${party.claims.length} policy ${party.claims.length === 1 ? 'group' : 'groups'}`}
        headingLevel={headingLevel}
        variant="compact"
      >
        {party.claims.length ? (
          <ul className={styles.claims}>
            {party.claims.map((claim, index) => {
              const source = sources[claim.source];
              if (!source) throw new Error(`Missing policy source: ${claim.source}`);
              const finding = verification?.[index];
              return (
                <li key={`${claim.source}-${index}`}>
                  {claim.date && (
                    <div className={styles.policyDate}>
                      {claim.date.isAnnouncement ? 'Announced' : 'Earliest reference found'}{' '}
                      <a href={claim.date.url}>
                        <time dateTime={claim.date.value}>{policyDateFormat.format(new Date(claim.date.value))}</time>
                      </a>
                    </div>
                  )}
                  <p>
                    {claim.text}
                    {verification && <VerificationBadge status={finding?.status ?? 'pending'} href={finding?.href} />}
                  </p>
                  <SourceReference source={source} statusLabel={referenceStatus} />
                </li>
              );
            })}
          </ul>
        ) : <p className={styles.empty}>No policies listed in this summary.</p>}
      </ExpandableSection>
    </article>
  );
}
