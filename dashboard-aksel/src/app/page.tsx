import {
  loadSituasjonsbilde,
  formaterDato,
  formaterVerdi,
  formaterDelta,
  trendPil,
  newsSignal,
} from '@/lib/data'
import VariabelKortInteraktiv from '@/components/VariabelKortInteraktiv'
import type { VariabelData } from '@/lib/types'

const GRUPPER: { id: string; label: string; serier: string[] }[] = [
  { id: 'inflasjon',     label: 'Inflasjon',                  serier: ['kpi', 'kpi_jae'] },
  { id: 'rente',         label: 'Rente og finansielle forhold',serier: ['styringsrente', 'nowa', 'eurnok', 'usd_nok', 'gov_yield_3y_no', 'gov_yield_10y_no'] },
  { id: 'aktivitet',     label: 'Aktivitet',                   serier: ['bnp_fastland', 'boligprisvekst', 'k2_kredittvekst'] },
  { id: 'arbeidsmarked', label: 'Arbeidsmarked',               serier: ['ledighet_aku', 'lonnsvekst'] },
  { id: 'internasjonal', label: 'Internasjonal',               serier: ['oljepris', 'ecb_rente', 'handelspartnervekst', 'fed_funds', 'us_10y_yield', 'us_cpi'] },
]

const NOKKELSERIER = ['kpi_jae', 'styringsrente', 'bnp_fastland', 'ledighet_aku']

const GRUPPE_TIL_LENKE: Record<string, string> = {
  inflasjon: '/inflasjon', rente: '/rente', aktivitet: '/aktivitet',
  arbeidsmarked: '/arbeidsmarked', internasjonal: '/internasjonal',
}

function BannerElement({ navn, verdi, enhet, news, standardisert, ankerNavn }: {
  navn: string; verdi: number | null; enhet: string
  news: number | null; standardisert: number | null; ankerNavn: string | null
}) {
  const pil = trendPil(news, standardisert)
  const signal = newsSignal(standardisert)
  const aksent =
    signal === 'positiv' ? 'var(--signal-pos)' :
    signal === 'negativ' ? 'var(--signal-neg)' :
    'var(--text-faint)'

  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 2 }}>{navn}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          {formaterVerdi(verdi, enhet)}
        </span>
        {pil && <span aria-hidden="true" style={{ fontSize: 18, color: aksent, fontWeight: 700 }}>{pil}</span>}
      </div>
      {news !== null && !isNaN(news) && (
        <p style={{ fontSize: '0.8125rem', color: aksent, marginTop: 2 }}>
          {formaterDelta(news, enhet)}{ankerNavn ? ` vs ${ankerNavn}` : ' vs anker'}
        </p>
      )}
    </div>
  )
}

interface Avvik { serieId: string; data: VariabelData; std: number }

function ToppTreAvvik({ variabler }: { variabler: Record<string, VariabelData> }) {
  const kandidater: Avvik[] = Object.entries(variabler)
    .filter(([, v]) => v.standardisert_news !== null && !isNaN(v.standardisert_news))
    .map(([id, v]) => ({ serieId: id, data: v, std: Math.abs(v.standardisert_news!) }))
    .sort((a, b) => b.std - a.std)
    .slice(0, 3)

  if (kandidater.length === 0) {
    return (
      <div className="alert alert-info">
        Ingen standardiserte avvik er beregnet ennå — siste observasjoner kan være fra før gjeldende
        ankerbane ble publisert.
      </div>
    )
  }

  return (
    <div className="kortgrid">
      {kandidater.map(({ serieId, data }) => {
        const lenke = GRUPPE_TIL_LENKE[data.gruppe] ?? '/'
        const sig = newsSignal(data.standardisert_news)
        const aksent =
          sig === 'positiv' ? 'var(--signal-pos)' :
          sig === 'negativ' ? 'var(--signal-neg)' :
          'var(--text-faint)'
        const barBredde = Math.min(Math.abs(data.standardisert_news ?? 0) / 2, 1) * 100

        return (
          <a
            key={serieId}
            href={lenke}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: 'var(--surface)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--s-4)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${aksent}`,
              display: 'block',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)'
              el.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = 'var(--shadow-sm)'
              el.style.transform = 'none'
            }}
          >
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 2 }}>{data.navn}</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
              {formaterVerdi(data.siste_verdi, data.enhet)}
            </p>
            <p style={{ fontSize: '0.8125rem', color: aksent, marginBottom: 'var(--s-2)' }}>
              {formaterDelta(data.news, data.enhet)} ·{' '}
              {data.standardisert_news !== null ? `${formaterDelta(data.standardisert_news)} std` : '—'}
            </p>
            <div style={{ background: 'var(--border)', borderRadius: 2, height: 3, overflow: 'hidden' }}>
              <div style={{ width: `${barBredde}%`, height: '100%', background: aksent, borderRadius: 2, transition: 'width 0.3s' }} />
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-4)' }}>Makropuls</h1>
        <div className="alert alert-warning">
          Ingen situasjonsdata tilgjengelig ennå. Kjør scripts/generate_cache.py for å generere data.
        </div>
      </>
    )
  }

  const nokkeldata = NOKKELSERIER.filter((s) => data.variabler[s]).map((s) => ({ id: s, ...data.variabler[s] }))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>Makropuls</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Oppdatert {formaterDato(data.generert)}
          {data.anker_vintage && ` · Anker: PPR ${formaterDato(data.anker_vintage)}`}
        </p>
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
        <h2 className="seksjon-tittel">Største avvik fra anker</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-3)' }}>
          Standardiserte overraskelser siden siste offisielle ankerbane. Klikk for å gå til detaljsiden.
        </p>
        <ToppTreAvvik variabler={data.variabler} />
        <details className="readmore" style={{ marginTop: 'var(--s-3)' }}>
          <summary>Hva betyr standardisert avvik?</summary>
          <div className="readmore-body">
            Standardisert avvik er overraskelsen (faktisk – anker) delt på det rullende standardavviket
            til seriens egne overraskelser. En verdi over ±0,5 regnes som meningsfull, og over ±1 som stor.
            Dette gjør avvikene sammenlignbare på tvers av serier med ulik volatilitet.
          </div>
        </details>
      </div>

      {GRUPPER.map(({ id, label, serier }) => {
        const tilgjengelige = serier.filter((s) => data.variabler[s])
        if (tilgjengelige.length === 0) return null
        return (
          <div key={id} className={`seksjon-${id}`}>
            <h2 className="seksjon-tittel">
              <a href={GRUPPE_TIL_LENKE[id] ?? '/'} style={{ textDecoration: 'none', color: 'inherit' }}>
                {label} →
              </a>
            </h2>
            <div className="kortgrid">
              {tilgjengelige.map((serieId) => (
                <VariabelKortInteraktiv key={serieId} serieId={serieId} data={data.variabler[serieId]} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
