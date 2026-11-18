import Link from 'next/link';

export default function Home() {
  return (
    <main id="main">
      <h1>Research Politics</h1>
      <p>A wiki for political research and interactive infographics.</p>
      <section aria-labelledby="articles-heading">
        <h2 id="articles-heading">Articles</h2>
        <ul>
          <li>
            <Link href="/elections/victoria-2026/">2026 Victorian election policy comparison</Link>
            <p>User-supplied research across nine policy areas. Draft — independent verification pending.</p>
          </li>
        </ul>
      </section>
    </main>
  );
}
