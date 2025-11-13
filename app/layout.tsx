import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Almond',
  description: 'Mindful Cuiff',
  other: {
    'theme-color': '#FAF9F5',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} antialiased bg-[#FAF9F5]`}>
        <div className='w-3 h-screen bg-amber-200 fixed' />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
