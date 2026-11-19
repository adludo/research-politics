import ExpandableSection from '../ui/ExpandableSection';
import PartyPolicyCard from './PartyPolicyCard';
import type { PolicyArea, PolicySources } from './types';
import styles from './PolicyComparison.module.css';

export interface PolicyComparisonProps {
  sections: readonly PolicyArea[];
  sources: PolicySources;
  verificationNotice: string;
  referenceStatus: string;
}

export default function PolicyComparison({
  sections, sources, verificationNotice, referenceStatus,
}: PolicyComparisonProps) {
  return (
    <div className={styles.comparison}>
      <p className={styles.hint}>Open a policy area to compare the parties. You can keep multiple areas open.</p>
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
            {section.parties.map(party => (
              <PartyPolicyCard key={party.name} party={party} sources={sources} referenceStatus={referenceStatus} />
            ))}
          </div>
        </ExpandableSection>
      ))}
    </div>
  );
}
