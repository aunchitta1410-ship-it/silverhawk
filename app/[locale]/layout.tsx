import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Navbar from '../components/Navbar';

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar />
      {children}
    </NextIntlClientProvider>
  );
}