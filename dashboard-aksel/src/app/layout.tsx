import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'norskmakropuls',
  description: 'Automatisert situasjonsbilde av norsk økonomi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" data-theme="light">
      <body>
        <NavBar />
        <main className="innhold">{children}</main>
      </body>
    </html>
  )
}
