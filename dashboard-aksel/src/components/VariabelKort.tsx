import { Heading, BodyShort } from '@navikt/ds-react'
import type { VariabelData } from '@/lib/types'
import { newsSignal, trendPil, formaterVerdi, formaterDato } from '@/lib/data'

interface Props {
  serieId: string
  data: VariabelData
}

// Retningsnoytral fargeskala. Pil og fortegn baerer retningssemantikken;
// fargen indikerer kun *at* observasjonen avviker meningsfullt fra ankeret.
// Vi bruker IKKE roed/groenn — ingen variabel har en universell god/daarlig-
// tolkning paa tvers av brukere (KPI over anker er "ille" for inflasjons-
// politikk, men "bra" for nominal vekst).
const SIGNALFARGER: Record<ReturnType<typeof newsSignal>, string> = {
  positiv: 'var(--a-deepblue-500)',  // observert > anker
  negativ: 'var(--a-purple-500)',    // observert < anker
  noytralt: 'transparent',           // ingen meningsfull avvik
  ukjent: 'transparent',             // mangler anker eller standardavvik
}

export default function VariabelKort({ serieId: _, data }: Props) {
  const signal = newsSignal(data.standardisert_news)
  const pil = trendPil(data.news, data.standardisert_news)
  const aksent = SIGNALFARGER[signal]

  const kortStil: React.CSSProperties = {
    background: 'var(--a-surface-default)',
    borderRadius: 'var(--a-border-radius-xlarge)',
    padding: 'var(--a-spacing-4)',
    boxShadow: 'var(--a-shadow-small)',
    // Topp-aksent vises kun naar signalet faktisk er meningsfullt.
    // Tidligere fikk alle kort 3px farget kant — det fjernet selve poenget
    // med visuell signalisering.
    borderTop: `3px solid ${aksent}`,
  }

  const newsStr = data.news !== null && !isNaN(data.news)
    ? ` · ${data.news >= 0 ? '+' : ''}${data.news.toFixed(2)} ${data.enhet}`
    : ''

  const pilFarge = signal === 'positiv'
    ? 'var(--a-deepblue-600)'
    : signal === 'negativ'
      ? 'var(--a-purple-600)'
      : 'var(--a-text-subtle)'

  return (
    <div style={kortStil}>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-1)' }}>
        {data.navn}
      </BodyShort>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 'var(--a-spacing-1)' }}>
        <Heading size="large" level="3">
          {formaterVerdi(data.siste_verdi, data.enhet)}
        </Heading>
        {pil && (
          <span aria-hidden="true" style={{ fontSize: 18, color: pilFarge, fontWeight: 600 }}>
            {pil}
          </span>
        )}
      </div>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
        {formaterDato(data.siste_dato)}{newsStr}
      </BodyShort>
    </div>
  )
}
