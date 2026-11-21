import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="content-page">
      <h1>Page not found</h1>
      <p>This page does not exist.</p>
      <Link href="/" className="back-link">Return to the wiki</Link>
    </main>
  );
}
