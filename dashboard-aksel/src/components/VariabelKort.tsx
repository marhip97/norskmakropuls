import { Heading, BodyShort } from '@navikt/ds-react'
import type { VariabelData } from '@/lib/types'
import { newsSignal, trendPil, formaterVerdi, formaterDato } from '@/lib/data'

interface Props {
  serieId: string
  data: VariabelData
}

const SIGNALFARGER: Record<ReturnType<typeof newsSignal>, string> = {
  noytralt: 'var(--a-green-400)',
  positiv:  'var(--a-red-400)',
  negativ:  'var(--a-blue-500)',
  ukjent:   'var(--a-border-subtle)',
}

export default function VariabelKort({ serieId: _, data }: Props) {
  const signal = newsSignal(data.standardisert_news)
  const pil = trendPil(data.news, data.standardisert_news)

  const kortStil: React.CSSProperties = {
    background: 'var(--a-surface-default)',
    borderRadius: 'var(--a-border-radius-xlarge)',
    padding: 'var(--a-spacing-4)',
    boxShadow: 'var(--a-shadow-small)',
    borderTop: `3px solid ${SIGNALFARGER[signal]}`,
  }

  const newsStr = data.news !== null && !isNaN(data.news)
    ? ` · ${data.news >= 0 ? '+' : ''}${data.news.toFixed(2)} ${data.enhet}`
    : ''

  return (
    <div style={kortStil}>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-1)' }}>
        {data.navn}
      </BodyShort>
      <Heading size="large" level="3" style={{ marginBottom: 'var(--a-spacing-1)' }}>
        {formaterVerdi(data.siste_verdi, data.enhet)}{pil ? ` ${pil}` : ''}
      </Heading>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
        {formaterDato(data.siste_dato)}{newsStr}
      </BodyShort>
    </div>
  )
}
