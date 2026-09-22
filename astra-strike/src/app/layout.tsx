import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ASTRA STRIKE — Adapt. Outplay. Survive.',
  description: 'An original tactical FPS. Infiltrate Sector Zero, arm the Core, and outplay defenders that learn your strategy. Play free in your browser.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
