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

export default function NavBar() {
  const pathname = usePathname()

  return (
    <InternalHeader>
      <InternalHeader.Title as={Link} href="/">
        norskmakropuls
      </InternalHeader.Title>
      {LENKER.map(({ href, label }) => (
        <InternalHeader.Button
          key={href}
          as={Link}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </InternalHeader.Button>
      ))}
    </InternalHeader>
  )
}
