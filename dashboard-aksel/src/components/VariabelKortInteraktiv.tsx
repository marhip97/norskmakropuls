'use client'

import { useState } from 'react'
import { Heading, BodyShort, HelpText, Button } from '@navikt/ds-react'
import type { VariabelData } from '@/lib/types'
import { newsSignal, trendPil, formaterVerdi, formaterDato, formaterDelta } from '@/lib/utils'
import SparklineKlient from './SparklineKlient'
import AnkerVsFaktiskGrafKlient from './AnkerVsFaktiskGrafKlient'

interface Props {
  serieId: string
  data: VariabelData
}

const DOMENE_FARGE: Record<string, string> = {
  inflasjon:     'var(--a-orange-500)',
  rente:         'var(--a-deepblue-500)',
  arbeidsmarked: 'var(--a-green-500)',
  aktivitet:     'var(--a-blue-500)',
  internasjonal: 'var(--a-purple-500)',
}

function vinduSisteForFrekvens(frekvens: string | null): number {
  if (frekvens === 'daily') return 260
  if (frekvens === 'quarterly') return 16
  return 36
}

export default function VariabelKortInteraktiv({ serieId, data }: Props) {
  const [ekspandert, setEkspandert] = useState(false)

  const signal = newsSignal(data.standardisert_news)
  const pil = trendPil(data.news, data.standardisert_news)
  const harSignal = signal === 'positiv' || signal === 'negativ'

  const domeneFarge = DOMENE_FARGE[data.gruppe] ?? 'var(--a-deepblue-500)'
  const toppFarge = harSignal
    ? signal === 'positiv' ? 'var(--a-deepblue-500)' : 'var(--a-purple-500)'
    : domeneFarge

  const kortBakgrunn = harSignal
    ? signal === 'positiv'
      ? 'linear-gradient(to bottom, var(--a-deepblue-50) 0%, var(--a-surface-default) 60%)'
      : 'linear-gradient(to bottom, var(--a-purple-50) 0%, var(--a-surface-default) 60%)'
    : 'var(--a-surface-default)'

  const pilFarge = signal === 'positiv'
    ? 'var(--a-deepblue-600)'
    : signal === 'negativ'
      ? 'var(--a-purple-600)'
      : 'var(--a-text-subtle)'

  const sparkFarge = harSignal
    ? signal === 'positiv' ? 'var(--a-deepblue-500)' : 'var(--a-purple-500)'
    : domeneFarge

  const sparkData = data.historikk.slice(-36)
  const newsStr = data.news !== null && !isNaN(data.news)
    ? formaterDelta(data.news, data.enhet)
    : null

  return (
    <div
      className="variabelkort-container"
      style={{
        background: kortBakgrunn,
        borderRadius: 'var(--a-border-radius-xlarge)',
        padding: 'var(--a-spacing-4)',
        boxShadow: 'var(--a-shadow-small)',
        borderTop: `4px solid ${toppFarge}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Navn + beskrivelse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--a-spacing-1)' }}>
        <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', flex: 1 }}>
          {data.navn}
        </BodyShort>
        {data.beskrivelse && (
          <HelpText title="Om indikatoren" placement="top" style={{ flexShrink: 0 }}>
            {data.beskrivelse}
          </HelpText>
        )}
      </div>

      {/* Hoved-verdi + trend-pil */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 'var(--a-spacing-1)' }}>
        <Heading size="large" level="3">
          {formaterVerdi(data.siste_verdi, data.enhet)}
        </Heading>
        {pil && (
          <span aria-hidden="true" style={{ fontSize: 20, color: pilFarge, fontWeight: 700 }}>
            {pil}
          </span>
        )}
      </div>

      {/* Dato + avvik fra anker */}
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-2)' }}>
        {formaterDato(data.siste_dato)}
        {newsStr && (
          <span style={{ color: pilFarge, marginLeft: 6 }}>
            {newsStr}
          </span>
        )}
      </BodyShort>

      {/* Sparkline når ikke ekspandert */}
      {!ekspandert && sparkData.length >= 3 && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--a-spacing-1)' }}>
          <SparklineKlient id={serieId} data={sparkData} farge={sparkFarge} />
        </div>
      )}

      {/* Ekspandert mini-graf */}
      {ekspandert && (
        <div style={{ marginTop: 'var(--a-spacing-2)', borderTop: '1px solid var(--a-border-subtle)', paddingTop: 'var(--a-spacing-3)' }}>
          <AnkerVsFaktiskGrafKlient
            historikk={data.historikk}
            ankerBane={data.anker_bane}
            enhet={data.enhet}
            navn={data.navn}
            hoyde={160}
            vinduSiste={vinduSisteForFrekvens(data.frekvens)}
          />
          {data.beskrivelse && (
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginTop: 'var(--a-spacing-2)' }}>
              {data.beskrivelse}
            </BodyShort>
          )}
        </div>
      )}

      {/* Vis/skjul historikk */}
      <div style={{ marginTop: 'var(--a-spacing-2)', paddingTop: 'var(--a-spacing-1)', borderTop: '1px solid var(--a-border-subtle)' }}>
        <Button
          size="xsmall"
          variant="tertiary"
          onClick={() => setEkspandert(!ekspandert)}
          style={{ padding: 0, height: 'auto', color: 'var(--a-text-subtle)', fontSize: 12 }}
        >
          {ekspandert ? '▲ Skjul' : '▼ Vis historikk'}
        </Button>
      </div>
    </div>
  )
}
