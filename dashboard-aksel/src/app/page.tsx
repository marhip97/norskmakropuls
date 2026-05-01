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

// Banner reflekterer fire-piler-rammeverket: en hovedindikator per domene
// (inflasjon, rente, aktivitet, arbeidsmarked). Internasjonale variabler
// horer hjemme paa egen side, ikke i hovedoversikten.
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
    <div style={{ minWidth: 0 }}>
      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 2 }}>
        {navn}
      </BodyShort>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <Heading size="medium" level="2">
          {formaterVerdi(verdi, enhet)}
        </Heading>
        {pil && (
          <span aria-hidden="true" style={{ fontSize: 18, color: aksent, fontWeight: 600 }}>
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
              borderLeft: `3px solid ${aksent}`,
              display: 'block',
            }}
          >
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 2 }}>
              {data.navn}
            </BodyShort>
            <Heading size="small" level="3" style={{ marginBottom: 4 }}>
              {formaterVerdi(data.siste_verdi, data.enhet)}
            </Heading>
            <BodyShort size="small" style={{ color: aksent }}>
              {formaterDelta(data.news, data.enhet)} ·{' '}
              {data.standardisert_news !== null
                ? `${formaterDelta(data.standardisert_news)} std`
                : '—'}
            </BodyShort>
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
          Ingen situasjonsdata tilgjengelig ennå. Kjor scripts/generate_cache.py for a generere data.
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

      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">
          Største avvik fra anker
        </Heading>
        <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
          Toppen av de standardiserte overraskelsene siden siste offisielle ankerbane ble publisert.
          Klikk en kort for å gå til detaljsiden.
        </BodyShort>
        <ToppTreAvvik variabler={data.variabler} />
        <ReadMore header="Hva betyr standardisert avvik?" size="small" defaultOpen={false} style={{ marginTop: 'var(--a-spacing-3)' }}>
          Standardisert avvik er overraskelsen (faktisk – anker) delt på den rullende standardavviket
          til seriens egne overraskelser. En verdi over ±0.5 regnes som meningsfull, og over ±1 som stor.
          Dette gjør avvikene sammenlignbare på tvers av serier med ulik volatilitet.
        </ReadMore>
      </div>

      {GRUPPER.map(({ id, label, serier }) => {
        const tilgjengelige = serier.filter((s) => data.variabler[s])
        if (tilgjengelige.length === 0) return null
        return (
          <div key={id} className="seksjon">
            <Heading size="small" level="2" className="seksjon-tittel">
              {label}
            </Heading>
            <div className="kortgrid">
              {tilgjengelige.map((serieId) => (
                <VariabelKort
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
