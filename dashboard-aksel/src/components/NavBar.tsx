'use client'

import { InternalHeader } from '@navikt/ds-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LENKER = [
  { href: '/', label: 'Makropuls' },
  { href: '/rente', label: 'Rente' },
  { href: '/inflasjon', label: 'Inflasjon' },
  { href: '/arbeidsmarked', label: 'Arbeidsmarked' },
  { href: '/aktivitet', label: 'Aktivitet' },
  { href: '/internasjonal', label: 'Internasjonal' },
  { href: '/datakvalitet', label: 'Datakvalitet' },
]

const navLenkestil = (aktiv: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 var(--a-spacing-3)',
  color: aktiv ? 'var(--a-text-default)' : 'var(--a-text-subtle)',
  textDecoration: 'none',
  fontWeight: aktiv ? 600 : 400,
  fontSize: 16,
  borderBottom: aktiv ? '2px solid var(--a-text-default)' : '2px solid transparent',
})

export default function NavBar() {
  const pathname = usePathname()

  return (
    <InternalHeader>
      <InternalHeader.Title>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          norskmakropuls
        </Link>
      </InternalHeader.Title>
      {LENKER.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={navLenkestil(pathname === href)}
        >
          {label}
        </Link>
      ))}
    </InternalHeader>
  )
}
