import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main">
      <h1>Page not found</h1>
      <p>This page does not exist.</p>
      <Link href="/">Return to the wiki</Link>
    </main>
  );
}
