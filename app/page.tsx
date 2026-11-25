import Link from 'next/link';
import comparison from '../data/victoria-2026.json';
import styles from './page.module.css';

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const groups = new Set(comparison.sections.flatMap(section => section.parties.map(party => party.name))).size;
  const researchDate = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(comparison.researchDate));

  return (
    <main id="main" className={styles.home}>
      <section className={styles.hero} aria-labelledby="intro-heading">
        <p className={styles.eyebrow}><span className={styles.dot} /> A wiki for political research</p>
        <h1 id="intro-heading">Understand the policies.<br /><span>Follow the sources.</span></h1>
        <p className={styles.intro}>Explore policy commitments, compare the details and follow the evidence behind each claim.</p>
      </section>

      <section aria-labelledby="articles-heading">
        <div className={styles.sectionHeading}>
          <h2 id="articles-heading">Explore the wiki</h2>
          <span>Election research</span>
        </div>
        <article className={styles.article}>
          <div className={styles.cover} aria-hidden="true">
            <span>VICTORIA</span>
            <strong>2026<span className={styles.coverDot}>.</span></strong>
            <span>STATE ELECTION</span>
          </div>
          <div className={styles.articleBody}>
            <span className={styles.badge}><span /> Draft · verification pending</span>
            <h3><Link href="/elections/victoria-2026/">Victorian election<br className={styles.desktopBreak} /> policy comparison</Link></h3>
            <p>Compare the supplied policy commitments by area, with party-by-party summaries and references alongside the details.</p>
            <ul className={styles.metadata} aria-label="Article coverage">
              <li>{comparison.sections.length} policy areas</li>
              <li>{groups} electoral groups</li>
              <li>{Object.keys(comparison.sources).length} references</li>
            </ul>
            <div className={styles.articleFooter}>
              <Link className={styles.primary} href="/elections/victoria-2026/">Read the comparison <Arrow /></Link>
              <span>Research snapshot<br /><time dateTime={comparison.researchDate}>{researchDate}</time></span>
            </div>
          </div>
        </article>
        <section className={styles.verification} aria-labelledby="budget-heading">
          <div className={styles.verificationCopy}>
            <h2 id="budget-heading">Victorian state budget</h2>
            <p>Ten years of general government revenue, expenses and net debt.</p>
          </div>
          <Link href="/budgets/victoria/" className={styles.secondary}>View budget trends <Arrow /></Link>
        </section>
      </section>

      <section className={styles.verification} aria-labelledby="verification-heading">
        <div className={styles.verificationIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="m8 12 3 3 5-6M12 3l8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className={styles.verificationCopy}>
          <h2 id="verification-heading">Keep the evidence in view.</h2>
          <p>View dated source checks, conflicts and evidence gaps when a page is audited.</p>
        </div>
        <Link href="/verification/" className={styles.secondary}>Verification history <Arrow diagonal /></Link>
      </section>
    </main>
  );
}
