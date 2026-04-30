import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'

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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--a-spacing-2)' }}>
        <Heading size="xlarge" level="1">Makropuls</Heading>
        <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
          Oppdatert {formaterDato(data.generert)}
          {data.anker_vintage && ` · Anker: PPR ${formaterDato(data.anker_vintage)}`}
        </BodyShort>
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
