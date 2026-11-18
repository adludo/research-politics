import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Polity — A field guide to politics', template: '%s · Polity' }, description: 'An open field guide to political ideas, institutions and systems. Explore illustrated explainers and interactive models.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><header className="header"><Link className="brand" href="/" aria-label="Polity home"><span className="brand-symbol">p.</span> polity<span className="brand-caption">THE POLITICS FIELD GUIDE</span></Link><nav aria-label="Main navigation"><Link href="/#library">Explore the wiki <span>↗</span></Link><Link href="/#lab">Interactive lab <span>↗</span></Link></nav><span className="edition">AN OPEN NOTEBOOK <i /> VOL. 001</span></header>{children}<footer><Link className="brand" href="/">polity.</Link><p>Make sense of the systems that shape us.</p><span>Open questions. Clearer thinking.</span></footer></body></html>;
}
