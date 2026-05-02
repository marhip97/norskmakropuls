'use client'

import { useState } from 'react'
import { Chips, BodyShort } from '@navikt/ds-react'
import AnkerVsFaktiskGrafKlient from './AnkerVsFaktiskGrafKlient'
import type { AnkerBane, Historikkpunkt } from '@/lib/types'

interface Props {
  historikk: Historikkpunkt[]
  ankerBane: AnkerBane | null
  enhet?: string
  navn: string
  hoyde?: number
  vinduer?: { label: string; verdi: number | null }[]
  initielt?: string
}

const STANDARD_VINDUER_MAANEDLIG = [
  { label: '1 år',  verdi: 12 },
  { label: '3 år',  verdi: 36 },
  { label: '5 år',  verdi: 60 },
  { label: '10 år', verdi: 120 },
  { label: 'Hele',  verdi: null },
]

export const VINDU_PRESETS = {
  monthly: STANDARD_VINDUER_MAANEDLIG,
  quarterly: [
    { label: '1 år',  verdi: 4 },
    { label: '3 år',  verdi: 12 },
    { label: '5 år',  verdi: 20 },
    { label: '10 år', verdi: 40 },
    { label: 'Hele',  verdi: null },
  ],
  daily: [
    { label: '1 mnd',  verdi: 22 },
    { label: '6 mnd',  verdi: 130 },
    { label: '1 år',   verdi: 260 },
    { label: '5 år',   verdi: 1300 },
    { label: 'Hele',   verdi: null },
  ],
  annual: [
    { label: '5 år',  verdi: 5 },
    { label: '10 år', verdi: 10 },
    { label: 'Hele',  verdi: null },
  ],
}

export default function AnkerVsFaktiskMedVelger({
  historikk,
  ankerBane,
  enhet,
  navn,
  hoyde,
  vinduer = STANDARD_VINDUER_MAANEDLIG,
  initielt = '3 år',
}: Props) {
  const [valgt, setValgt] = useState(initielt)
  const aktiv = vinduer.find((v) => v.label === valgt) ?? vinduer[0]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--a-spacing-4)', flexWrap: 'wrap', marginBottom: 'var(--a-spacing-1)' }}>
        <Chips>
          {vinduer.map((v) => (
            <Chips.Toggle
              key={v.label}
              selected={v.label === valgt}
              onClick={() => setValgt(v.label)}
            >
              {v.label}
            </Chips.Toggle>
          ))}
        </Chips>
      </div>
      <BodyShort
        size="small"
        style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}
      >
        {aktiv.verdi ? `Viser siste ${aktiv.verdi} observasjoner` : 'Viser hele tidsserien'}
        {ankerBane ? ` · Anker: PPR ${ankerBane.publikasjon.slice(0, 7)}` : ''}
      </BodyShort>
      <div className="graf-panel" style={{ marginTop: 0 }}>
        <AnkerVsFaktiskGrafKlient
          historikk={historikk}
          ankerBane={ankerBane}
          enhet={enhet}
          navn={navn}
          hoyde={hoyde}
          vinduSiste={aktiv.verdi ?? undefined}
        />
      </div>
    </>
  )
}
