'use client'

import { newsSignal, trendPil, formaterVerdi, formaterDato, formaterDelta } from '@/lib/utils'
import type { VariabelData } from '@/lib/types'
import SparklineKlient from './SparklineKlient'

interface Props {
  serieId: string
  data: VariabelData
}

const DOMENE_FARGE: Record<string, string> = {
  inflasjon:     'var(--inflasjon)',
  rente:         'var(--rente)',
  arbeidsmarked: 'var(--arbeidsmarked)',
  aktivitet:     'var(--aktivitet)',
  internasjonal: 'var(--internasjonal)',
}

export default function VariabelKort({ serieId, data }: Props) {
  const signal = newsSignal(data.standardisert_news)
  const pil = trendPil(data.news, data.standardisert_news)
  const harSignal = signal === 'positiv' || signal === 'negativ'

  const domeneFarge = DOMENE_FARGE[data.gruppe] ?? 'var(--rente)'
  const toppFarge = harSignal
    ? signal === 'positiv' ? 'var(--signal-pos)' : 'var(--signal-neg)'
    : domeneFarge

  const kortBakgrunn = harSignal
    ? signal === 'positiv'
      ? 'linear-gradient(to bottom, var(--signal-pos-bg) 0%, var(--surface) 60%)'
      : 'linear-gradient(to bottom, var(--signal-neg-bg) 0%, var(--surface) 60%)'
    : 'var(--surface)'

  const pilFarge = signal === 'positiv'
    ? 'var(--signal-pos)'
    : signal === 'negativ'
      ? 'var(--signal-neg)'
      : 'var(--text-faint)'

  const sparkFarge = harSignal
    ? signal === 'positiv' ? 'var(--signal-pos)' : 'var(--signal-neg)'
    : domeneFarge

  const sparkData = data.historikk.slice(-36)
  const newsStr = data.news !== null && !isNaN(data.news)
    ? formaterDelta(data.news, data.enhet)
    : null

  return (
    <div
      className="variabelkort-container"
      style={{ background: kortBakgrunn, borderTop: `3px solid ${toppFarge}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--s-1)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', flex: 1, lineHeight: 1.3 }}>
          {data.navn}
        </p>
        {data.beskrivelse && (
          <span className="helptip" style={{ flexShrink: 0 }}>
            <span className="helptip-icon">?</span>
            <span className="helptip-popup">{data.beskrivelse}</span>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 'var(--s-1)' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)' }}>
          {formaterVerdi(data.siste_verdi, data.enhet)}
        </span>
        {pil && (
          <span aria-hidden="true" style={{ fontSize: 18, color: pilFarge, fontWeight: 700 }}>
            {pil}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
        {formaterDato(data.siste_dato)}
        {newsStr && <span style={{ color: pilFarge, marginLeft: 6 }}>{newsStr}</span>}
      </p>

      {sparkData.length >= 3 && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--s-1)' }}>
          <SparklineKlient id={serieId} data={sparkData} farge={sparkFarge} />
        </div>
      )}
    </div>
  )
}
