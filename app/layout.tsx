import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Research Politics',
    template: '%s · Research Politics',
  },
  description: 'A wiki for political research and interactive infographics.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header><Link href="/">Research Politics</Link></header>
        {children}
      </body>
    </html>
  );
}
