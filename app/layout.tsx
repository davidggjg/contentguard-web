import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContentGuard – הגנת תוכן',
  description: 'פלטפורמה לניהול חסימת תוכן',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-slate-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
