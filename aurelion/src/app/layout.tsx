import type { Metadata } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'AURELION R1 — Inside the Machine',
  description: 'An interactive exploration of the AURELION R1. Discover every curve, component, and connection of an original performance machine.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}

