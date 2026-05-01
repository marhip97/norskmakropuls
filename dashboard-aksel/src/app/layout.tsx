import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { loadSituasjonsbilde } from '@/lib/data'

export const metadata: Metadata = {
  title: 'norskmakropuls',
  description: 'Automatisert situasjonsbilde av norsk økonomi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const data = loadSituasjonsbilde()
  return (
    <html lang="nb" data-theme="light">
      <body>
        <NavBar />
        <main className="innhold">{children}</main>
        <Footer generertTidspunkt={data?.generert ?? null} />
      </body>
    </html>
  )
}
