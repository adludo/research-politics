import type { Metadata } from 'next';
import SiteNavigation from '../components/layout/SiteNavigation';
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
        <SiteNavigation />
        {children}
        <footer className="site-footer">
          <span>Research Politics</span>
          <a href="https://github.com/adludo/research-politics">View the source</a>
        </footer>
      </body>
    </html>
  );
}
