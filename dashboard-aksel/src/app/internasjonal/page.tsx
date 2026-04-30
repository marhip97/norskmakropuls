import { Heading } from '@navikt/ds-react'
import { loadSituasjonsbilde } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'

export default function InternasjonalPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const oljeHistorikk = variabler['oljepris']?.historikk ?? []

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Internasjonal
      </Heading>

      <div className="kortgrid">
        {['oljepris', 'ecb_rente', 'fed_funds', 'handelspartnervekst', 'us_10y_yield', 'us_cpi']
          .filter((s) => variabler[s])
          .map((s) => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
      </div>

      {oljeHistorikk.length > 0 && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            Oljepris Brent (USD/fat)
          </Heading>
          <TidsserieGrafKlient
            data={oljeHistorikk.slice(-180).map((p) => ({
              dato: p.dato.slice(0, 10),
              Oljepris: p.verdi,
            }))}
            xKey="dato"
            linjer={[{ dataKey: 'Oljepris', farge: '#e35c00', navn: 'Brent (USD/fat)' }]}
            yEtikett="USD"
            hoyde={280}
          />
        </div>
      )}
    </>
  )
}
