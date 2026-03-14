// Minimal root layout required by Next.js App Router.
// All real layout work (html, body, providers) happens in [locale]/layout.tsx.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
