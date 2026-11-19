import SourceReference from './SourceReference';
import type { PartyPolicies, PolicySources } from './types';
import styles from './PolicyComparison.module.css';

export interface PartyPolicyCardProps {
  party: PartyPolicies;
  sources: PolicySources;
  referenceStatus: string;
}

export default function PartyPolicyCard({ party, sources, referenceStatus }: PartyPolicyCardProps) {
  return (
    <article className={styles.party}>
      <h3 className={styles.partyName}>{party.name}</h3>
      {party.claims.length ? (
        <ul className={styles.claims}>
          {party.claims.map((claim, index) => {
            const source = sources[claim.source];
            if (!source) throw new Error(`Missing policy source: ${claim.source}`);
            return (
              <li key={`${claim.source}-${index}`}>
                <p>{claim.text}</p>
                <SourceReference source={source} statusLabel={referenceStatus} />
              </li>
            );
          })}
        </ul>
      ) : <p className={styles.empty}>No policies listed in this summary.</p>}
    </article>
  );
}
