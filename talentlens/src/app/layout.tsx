import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TalentLens',
  description: 'HR-Tech платформа психометрической оценки кандидатов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
