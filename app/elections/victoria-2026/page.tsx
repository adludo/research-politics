import type { Metadata } from 'next';
import Link from 'next/link';
import comparison from '../../../data/victoria-2026.json';
import PolicyComparison from '../../../components/policies/PolicyComparison';
import SourceReference from '../../../components/policies/SourceReference';
import ExpandableSection from '../../../components/ui/ExpandableSection';

export const metadata: Metadata = {
  title: '2026 Victorian election policy comparison — draft',
  description: 'User-supplied policy comparison organised by topic. Independent source verification is pending.',
  robots: { index: false, follow: false },
};

type SourceId = keyof typeof comparison.sources;

function Reference({ sourceId }: { sourceId: SourceId }) {
  return <SourceReference source={comparison.sources[sourceId]} statusLabel="Verification pending" />;
}

export default function VictorianElection() {
  return (
    <main id="main">
      <Link href="/">Back to the wiki</Link>
      <h1>2026 Victorian state election: policy comparison</h1>
      <p><Link href="/verification/">Verification history and conflicts</Link></p>
      <div className="research-context">
        <ExpandableSection
          id="verification-heading"
          title="Draft — independent verification pending"
          variant="subtle"
        >
          <p>
            This page organises a user-supplied summary dated 18 November 2026.
            It has not been independently verified. All 34 supplied references were
            blocked by the research environment’s proxy (403) on that date.
            Links are supplied citations, not confirmation of their contents or validity.
          </p>
          <p>
            Policy wording, eligibility, costs, dates and relevance to this election
            require checking against the underlying documents. Do not rely on this
            draft as a verified voting guide. Announced expenditure, savings and
            outcomes are not independently validated costings or forecasts.
          </p>
        </ExpandableSection>
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
          <p><Reference sourceId="poll" /></p>
          <p><Reference sourceId="abc" /></p>
        </ExpandableSection>
      </div>
      <nav className="policy-contents" aria-label="Policy areas">
        <h2>Policy areas</h2>
        <ol>{comparison.sections.map(section => (
          <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
        ))}</ol>
      </nav>
      <PolicyComparison
        sections={comparison.sections}
        sources={comparison.sources}
        verificationNotice="Attributed to the supplied summary; verification pending."
        referenceStatus="Verification pending"
      />
      <section aria-labelledby="campaigns-heading">
        <h2 id="campaigns-heading">Supplied campaign pages</h2>
        <ul>{(['labor-plan', 'coalition-plan', 'greens-plan', 'one-plan'] as const).map(id => (
          <li key={id}><Reference sourceId={id} /></li>
        ))}</ul>
      </section>
      <section aria-labelledby="review-heading">
        <h2 id="review-heading">Reference review requirements</h2>
        <p>
          Before treating this as verified material, open each reference, record its
          actual title, publication or update date, access date and relevant section,
          and check every claim against the final wording. Confirm election relevance
          and distinguish new promises, standing platforms and existing programs.
          Seek independent corroboration for consequential or disputed claims.
        </p>
        <p>
          Reference labels were derived from the supplied URLs; document titles and
          publication dates have not been authenticated. No successful source access
          or verification date has been recorded. The underlying data retains the
          failed access attempts separately from verification status.
        </p>
      </section>
    </main>
  );
}
