import { Space_Grotesk, DM_Mono, Syne } from 'next/font/google';
import './globals.css';

// 1. Fonts को Next.js के तरीके से कॉन्फ़िगर करें
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata = {
  title: "Bilbax — Instagram DM Automation",
  description: "Turn Instagram comments into automatic DMs. Capture leads, reply instantly, and grow without code.",
};

export default function RootLayout({ children }) {
  return (
    // 2. Next.js के जनरेट किए गए फॉन्ट वेरिएबल्स को HTML टैग में पास करें
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
