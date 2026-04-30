import { Heading } from '@navikt/ds-react'
import { loadSituasjonsbilde } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'

export default function AktivitetPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const bnpHistorikk = variabler['bnp_fastland']?.historikk ?? []

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Aktivitet
      </Heading>

      <div className="kortgrid">
        {['bnp_fastland', 'boligprisvekst', 'k2_kredittvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {bnpHistorikk.length > 0 && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            BNP Fastlands-Norge (% ar/ar)
          </Heading>
          <TidsserieGrafKlient
            data={bnpHistorikk.slice(-20).map((p) => ({
              kvartal: p.dato.slice(0, 7),
              'BNP Fastlands-Norge': p.verdi,
            }))}
            xKey="kvartal"
            linjer={[{ dataKey: 'BNP Fastlands-Norge', farge: '#0067c5', navn: 'BNP Fastlands-Norge' }]}
            yEtikett="% ar/ar"
            hoyde={280}
          />
        </div>
      )}
    </>
  )
}
