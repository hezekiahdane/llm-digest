import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import '@/app/globals.css';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`font-body flex min-h-screen flex-col`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* Navbar here */}
          <main className="flex-1">{children}</main>
          {/* Footer here */}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
