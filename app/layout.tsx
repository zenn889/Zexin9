import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zexin9 - Next-Gen Multi-Provider AI Gateway & Proxy',
  description:
    'High-Availability AI Gateway for Cursor, Cline, and Claude Code. Features multi-tier automatic fallback, RTK token compression, and native MongoDB & Supabase persistence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100">{children}</body>
    </html>
  );
}
