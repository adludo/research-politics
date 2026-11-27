import type { Metadata } from 'next';
import Link from 'next/link';
import comparison from '../../../data/victoria-2026.json';
import VictorianBudgetChart from '../../../components/budgets/VictorianBudgetChart';
import PolicyComparison from '../../../components/policies/PolicyComparison';
import SourceReference from '../../../components/policies/SourceReference';
import BackToTop from '../../../components/ui/BackToTop';
import ExpandableSection from '../../../components/ui/ExpandableSection';

import { getPolicyVerification } from './policy-verification';
import styles from './election.module.css';

export const metadata: Metadata = {
  title: '2026 Victorian state election',
  description: 'Party policies, verification findings and Victorian state budget figures for the 2026 state election.',
  robots: { index: false, follow: false },
};

type SourceId = keyof typeof comparison.sources;

function Reference({ sourceId }: { sourceId: SourceId }) {
  return <SourceReference source={comparison.sources[sourceId]} statusLabel="Verification pending" />;
}

function ScopeAndContext() {
  return (
    <div className={styles.context}>
      <ExpandableSection id="scope-heading" title="Scope and context" variant="subtle">
        <p>
          The supplied summary gives an election date of 28 November 2026 and covers
          Labor, the Liberal–National Coalition, the Greens and One Nation. It groups
          the Liberals and Nationals as a joint campaign platform. This selection
          and grouping are supplied by the contributor; neither a ranking of the
          leading groups nor current participation has been independently confirmed.
        </p>
        <p>
          The summary describes these as 2026 commitments, including existing
          policies being defended or continued. These classifications still need
          source review. All monetary amounts are Australian dollars.
        </p>
      </ExpandableSection>
    </div>
  );
}

function ElectionPolicies() {
  return (
    <PolicyComparison
      headingLevel={3}
      sections={comparison.sections}
      sources={comparison.sources}
      verificationNotice="Status badges link to the recorded findings for each policy."
      policyVerification={getPolicyVerification()}
    />
  );
}

function SourceReview() {
  return (
    <>
      <p>
        This comparison draws on a contributor’s 18 November 2026 summary.
        The <a href="https://github.com/adludo/research-politics/blob/d5fb30e8e3c43b6e1e7f8d15fbdfd7d00912883c/data/victoria-2026.json#L5-L346">wiki dataset</a> records
        proxy HTTP 403 errors on 18 November 2026 for all 34 sources checked at the time.
        Citation labels came from the supplied URLs. See the <Link href="/verification/">verification log</Link> for
        later findings and remaining gaps.
      </p>
      <p>
        Before relying on this comparison as a voting guide, check policy wording,
        eligibility, costs, dates and election relevance against the original sources.
        Record each source’s title, publication or update date, access date and relevant section.
        Distinguish new promises from standing platforms and existing programs,
        and independently check announced spending, savings, forecasts and disputed claims.
      </p>
    </>
  );
}

function SuppliedReferences() {
  const sources = ['poll', 'abc', 'labor-plan', 'coalition-plan', 'greens-plan', 'one-plan'] as const;
  return (
    <ul id="campaigns-heading">
      {sources.map(sourceId => <li key={sourceId}><Reference sourceId={sourceId} /></li>)}
    </ul>
  );
}

function StateBudget() {
  return (
    <>
      <p>Victorian general government revenue, expenses, operating results and net debt from 2016–17 to 2025–26.</p>
      <p><Link href="/budgets/victoria/">View annual budget figures and sources</Link></p>
      <VictorianBudgetChart />
    </>
  );
}

const sections = [
  { id: 'policies', title: 'Policies', Content: ElectionPolicies, topics: comparison.sections },
  { id: 'state-budget', title: 'State budget', Content: StateBudget },
  { id: 'verification-heading', title: 'Verification and source review', Content: SourceReview, headingId: 'review-heading' },
  { id: 'supplied-references', title: 'Supplied references', Content: SuppliedReferences },
];

export default function VictorianElection() {
  return (
    <main id="main" className="content-page" tabIndex={-1}>
      <Link href="/" className="back-link">Back to the wiki</Link>
      <h1>2026 Victorian state election</h1>
      <ScopeAndContext />
      <nav className="surface-card" aria-labelledby="contents-heading">
        <h2 id="contents-heading">Contents</h2>
        <ul className={styles.sectionLinks}>
          {sections.map(({ id, title, topics }) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
              {topics && (
                <details className={styles.topics}>
                  <summary>Policy areas</summary>
                  <ul>
                    {topics.map(topic => (
                      <li key={topic.id}><a href={`#${topic.id}`}>{topic.title}</a></li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {sections.map(({ id, title, Content, headingId = `${id}-heading` }) => (
        <section key={id} id={id} className={styles.detailSection} aria-labelledby={headingId}>
          <h2 id={headingId}>{title}</h2>
          <Content />
        </section>
      ))}
      <BackToTop />
    </main>
  );
}
