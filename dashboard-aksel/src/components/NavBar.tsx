'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LENKER = [
  { href: '/',              label: 'Makropuls' },
  { href: '/rente',         label: 'Rente' },
  { href: '/inflasjon',     label: 'Inflasjon' },
  { href: '/arbeidsmarked', label: 'Arbeidsmarked' },
  { href: '/aktivitet',     label: 'Aktivitet' },
  { href: '/internasjonal', label: 'Internasjonal' },
]

export default function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">norskmakropuls</Link>
      <div className="navbar-links">
        {LENKER.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`navbar-link${pathname === href ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
