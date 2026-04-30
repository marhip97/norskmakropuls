import { Heading } from '@navikt/ds-react'
import { loadSituasjonsbilde } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'

export default function ArbeidsmarkedPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const akuHistorikk = variabler['ledighet_aku']?.historikk ?? []

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Arbeidsmarked
      </Heading>

      <div className="kortgrid">
        {['ledighet_aku', 'lonnsvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {akuHistorikk.length > 0 && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            AKU-ledighet (%)
          </Heading>
          <TidsserieGrafKlient
            data={akuHistorikk.slice(-48).map((p) => ({
              dato: p.dato.slice(0, 7),
              'AKU-ledighet': p.verdi,
            }))}
            xKey="dato"
            linjer={[{ dataKey: 'AKU-ledighet', farge: '#0067c5', navn: 'AKU-ledighet' }]}
            yEtikett="%"
            hoyde={280}
          />
        </div>
      )}
    </>
  )
}
