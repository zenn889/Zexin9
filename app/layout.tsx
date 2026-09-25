import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '9Router Cloud - AI Gateway & Multi-Tier Fallback Proxy',
  description:
    'Serverless AI Router for Vercel and Netlify. Features multi-tier automatic fallback, RTK token compression, and unified OpenAI & Anthropic endpoints for Cursor, Cline, and Claude Code.',
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
