import { Heading, BodyShort, Alert, ReadMore } from '@navikt/ds-react'
import {
  loadSituasjonsbilde,
  formaterDato,
  formaterVerdi,
  formaterDelta,
  trendPil,
  newsSignal,
} from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import VariabelKortInteraktiv from '@/components/VariabelKortInteraktiv'
import type { VariabelData } from '@/lib/types'

const GRUPPER: { id: string; label: string; serier: string[] }[] = [
  {
    id: 'inflasjon',
    label: 'Inflasjon',
    serier: ['kpi', 'kpi_jae'],
  },
  {
    id: 'rente',
    label: 'Rente og finansielle forhold',
    serier: ['styringsrente', 'nowa', 'eurnok', 'usd_nok', 'gov_yield_3y_no', 'gov_yield_10y_no'],
  },
  {
    id: 'aktivitet',
    label: 'Aktivitet',
    serier: ['bnp_fastland', 'boligprisvekst', 'k2_kredittvekst'],
  },
  {
    id: 'arbeidsmarked',
    label: 'Arbeidsmarked',
    serier: ['ledighet_aku', 'lonnsvekst'],
  },
  {
    id: 'internasjonal',
    label: 'Internasjonal',
    serier: ['oljepris', 'ecb_rente', 'handelspartnervekst', 'fed_funds', 'us_10y_yield', 'us_cpi'],
  },
]

const NOKKELSERIER = ['kpi_jae', 'styringsrente', 'bnp_fastland', 'ledighet_aku']

const GRUPPE_TIL_LENKE: Record<string, string> = {
  inflasjon: '/inflasjon',
  rente: '/rente',
  aktivitet: '/aktivitet',
  arbeidsmarked: '/arbeidsmarked',
  internasjonal: '/internasjonal',
}

function BannerElement({
  navn,
  verdi,
  enhet,
  news,
  standardisert,
  ankerNavn,
}: {
  navn: string
  verdi: number | null
  enhet: string
  news: number | null
  standardisert: number | null
  ankerNavn: string | null
}) {
  const pil = trendPil(news, standardisert)
  const signal = newsSignal(standardisert)
  const aksent =
    signal === 'positiv' ? 'var(--a-deepblue-600)' :
    signal === 'negativ' ? 'var(--a-purple-600)' :
    'var(--a-text-subtle)'

  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 2 }}>
        {navn}
      </BodyShort>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <Heading size="medium" level="2">
          {formaterVerdi(verdi, enhet)}
        </Heading>
        {pil && (
          <span aria-hidden="true" style={{ fontSize: 20, color: aksent, fontWeight: 700 }}>
            {pil}
          </span>
        )}
      </div>
      {news !== null && !isNaN(news) && (
        <BodyShort size="small" style={{ color: aksent, marginTop: 2 }}>
          {formaterDelta(news, enhet)}
          {ankerNavn ? ` vs ${ankerNavn}` : ' vs anker'}
        </BodyShort>
      )}
    </div>
  )
}

interface Avvik {
  serieId: string
  data: VariabelData
  std: number
}

function ToppTreAvvik({ variabler }: { variabler: Record<string, VariabelData> }) {
  const kandidater: Avvik[] = Object.entries(variabler)
    .filter(([, v]) => v.standardisert_news !== null && !isNaN(v.standardisert_news))
    .map(([id, v]) => ({ serieId: id, data: v, std: Math.abs(v.standardisert_news!) }))
    .sort((a, b) => b.std - a.std)
    .slice(0, 3)

  if (kandidater.length === 0) {
    return (
      <Alert variant="info" size="small">
        Ingen standardiserte avvik er beregnet ennå — siste observasjoner kan være fra før gjeldende
        ankerbane ble publisert.
      </Alert>
    )
  }

  return (
    <div className="kortgrid">
      {kandidater.map(({ serieId, data }) => {
        const lenke = GRUPPE_TIL_LENKE[data.gruppe] ?? '/'
        const sig = newsSignal(data.standardisert_news)
        const aksent =
          sig === 'positiv' ? 'var(--a-deepblue-600)' :
          sig === 'negativ' ? 'var(--a-purple-600)' :
          'var(--a-text-subtle)'
        const std = data.standardisert_news ?? 0
        const barBredde = Math.min(Math.abs(std) / 2, 1) * 100

        return (
          <a
            key={serieId}
            href={lenke}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: 'var(--a-surface-default)',
              borderRadius: 'var(--a-border-radius-xlarge)',
              padding: 'var(--a-spacing-4)',
              boxShadow: 'var(--a-shadow-small)',
              borderLeft: `4px solid ${aksent}`,
              display: 'block',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = 'var(--a-shadow-medium)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = 'var(--a-shadow-small)'
              el.style.transform = 'none'
            }}
          >
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 2 }}>
              {data.navn}
            </BodyShort>
            <Heading size="small" level="3" style={{ marginBottom: 4 }}>
              {formaterVerdi(data.siste_verdi, data.enhet)}
            </Heading>
            <BodyShort size="small" style={{ color: aksent, marginBottom: 'var(--a-spacing-2)' }}>
              {formaterDelta(data.news, data.enhet)} ·{' '}
              {data.standardisert_news !== null
                ? `${formaterDelta(data.standardisert_news)} std`
                : '—'}
            </BodyShort>
            {/* Visuell avvik-bar */}
            <div style={{ background: 'var(--a-border-subtle)', borderRadius: 2, height: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${barBredde}%`,
                  height: '100%',
                  background: aksent,
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </a>
        )
      })}
    </div>
  )
}

export default function MakropulsPage() {
  const data = loadSituasjonsbilde()

  if (!data) {
    return (
      <>
        <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-4)' }}>
          Makropuls
        </Heading>
        <Alert variant="warning">
          Ingen situasjonsdata tilgjengelig ennå. Kjør scripts/generate_cache.py for å generere data.
        </Alert>
      </>
    )
  }

  const nokkeldata = NOKKELSERIER
    .filter((s) => data.variabler[s])
    .map((s) => ({ id: s, ...data.variabler[s] }))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--a-spacing-2)', marginBottom: 'var(--a-spacing-4)' }}>
        <Heading size="xlarge" level="1">Makropuls</Heading>
        <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
          Oppdatert {formaterDato(data.generert)}
          {data.anker_vintage && ` · Anker: PPR ${formaterDato(data.anker_vintage)}`}
        </BodyShort>
      </div>

      {/* Situasjonsbanner: fire-piler-rammeverket */}
      {nokkeldata.length > 0 && (
        <div className="situasjonsbanner">
          {nokkeldata.map((v) => (
            <BannerElement
              key={v.id}
              navn={v.navn}
              verdi={v.siste_verdi}
              enhet={v.enhet}
              news={v.news}
              standardisert={v.standardisert_news}
              ankerNavn={v.anker_publikasjon ? `PPR ${v.anker_publikasjon.slice(0, 7)}` : null}
            />
          ))}
        </div>
      )}

      {/* Topp-tre avvik fra anker */}
      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">
          Største avvik fra anker
        </Heading>
        <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
          Standardiserte overraskelser siden siste offisielle ankerbane. Klikk for å gå til detaljsiden.
        </BodyShort>
        <ToppTreAvvik variabler={data.variabler} />
        <ReadMore header="Hva betyr standardisert avvik?" size="small" defaultOpen={false} style={{ marginTop: 'var(--a-spacing-3)' }}>
          Standardisert avvik er overraskelsen (faktisk – anker) delt på det rullende standardavviket
          til seriens egne overraskelser. En verdi over ±0,5 regnes som meningsfull, og over ±1 som stor.
          Dette gjør avvikene sammenlignbare på tvers av serier med ulik volatilitet.
        </ReadMore>
      </div>

      {/* Domeneseksjoner — bruker domenespesifikke CSS-klasser for farger */}
      {GRUPPER.map(({ id, label, serier }) => {
        const tilgjengelige = serier.filter((s) => data.variabler[s])
        if (tilgjengelige.length === 0) return null
        return (
          <div key={id} className={`seksjon-${id}`}>
            <Heading size="small" level="2" className="seksjon-tittel">
              <a href={GRUPPE_TIL_LENKE[id] ?? '/'} style={{ color: 'inherit', textDecoration: 'none' }}>
                {label} →
              </a>
            </Heading>
            <div className="kortgrid">
              {tilgjengelige.map((serieId) => (
                <VariabelKortInteraktiv
                  key={serieId}
                  serieId={serieId}
                  data={data.variabler[serieId]}
                />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
