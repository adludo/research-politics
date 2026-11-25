import ExpandableSection from '../ui/ExpandableSection';
import PartyPolicyCard from './PartyPolicyCard';
import type { PolicyArea, PolicySources, PolicyVerification } from './types';
import styles from './PolicyComparison.module.css';

export interface PolicyComparisonProps {
  sections: readonly PolicyArea[];
  sources: PolicySources;
  verificationNotice: string;
  referenceStatus?: string;
  policyVerification?: ReadonlyMap<string, PolicyVerification>;
}

export default function PolicyComparison({
  sections, sources, verificationNotice, referenceStatus, policyVerification,
}: PolicyComparisonProps) {
  return (
    <div className={styles.comparison}>
      <p className={styles.hint}>Open a policy area, then a party to read its policies. You can keep multiple areas and parties open.</p>
      {sections.map((section, index) => (
        <ExpandableSection
          key={section.id}
          id={section.id}
          title={section.title}
          index={index + 1}
          description={`${section.parties.length} electoral groups · ${section.parties.reduce((total, party) => total + party.claims.length, 0)} policy groups`}
        >
          <p className={styles.notice}>{verificationNotice}</p>
          {section.note && <p className={styles.note}>{section.note}</p>}
          <div className={styles.parties}>
            {section.parties.map((party, partyIndex) => (
              <PartyPolicyCard key={party.name} id={`${section.id}-party-${partyIndex + 1}`} party={party} sources={sources} referenceStatus={referenceStatus}
                verification={policyVerification && party.claims.map((_, claimIndex) =>
                  policyVerification.get(`/sections/${index}/parties/${partyIndex}/claims/${claimIndex}`)
                )} />
            ))}
          </div>
        </ExpandableSection>
      ))}
    </div>
  );
}
