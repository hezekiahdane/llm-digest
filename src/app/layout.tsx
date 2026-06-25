import type { Metadata } from 'next';
import { Analytics, SpeedInsights } from '@/lib/monitoring';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI Intelligence Dashboard',
    template: '%s | AI Intelligence Dashboard',
  },
  description:
    'Live AI model comparison — status, benchmarks, pricing, and releases across OpenAI, Anthropic, Google, and Meta.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
