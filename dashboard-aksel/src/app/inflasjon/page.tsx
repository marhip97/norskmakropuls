import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import TidsserieGraf from '@/components/TidsserieGraf'

export default function InflasjonPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}
  const dekomp = data?.inflasjon_dekomposisjon ?? null

  const kpiHistorikk = variabler['kpi']?.historikk ?? []
  const kpiJaeHistorikk = variabler['kpi_jae']?.historikk ?? []

  const grafData = kpiHistorikk.map((p) => {
    const jaeMatch = kpiJaeHistorikk.find((j) => j.dato === p.dato)
    return {
      dato: p.dato.slice(0, 7),
      KPI: p.verdi,
      'KPI-JAE': jaeMatch?.verdi ?? null,
    }
  })

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Inflasjon
      </Heading>

      <div className="kortgrid">
        {['kpi', 'kpi_jae'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {grafData.length > 0 && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            KPI og KPI-JAE (% ar/ar)
          </Heading>
          <TidsserieGraf
            data={grafData.slice(-36)}
            xKey="dato"
            linjer={[
              { dataKey: 'KPI', farge: '#0067c5', navn: 'KPI' },
              { dataKey: 'KPI-JAE', farge: '#e35c00', navn: 'KPI-JAE' },
            ]}
            yEtikett="% ar/ar"
            hoyde={300}
          />
        </div>
      )}

      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">
          KPI-JAE-dekomposisjon
        </Heading>
        {dekomp ? (
          <>
            <BodyShort style={{ marginBottom: 'var(--a-spacing-3)' }}>
              Total overraskelse: <strong>
                {dekomp.total_surprise !== null
                  ? `${dekomp.total_surprise >= 0 ? '+' : ''}${dekomp.total_surprise?.toFixed(2)} pp`
                  : '–'}
              </strong>
              {dekomp.dominant_driver !== 'kpi_jae' && (
                <> · Hoveddrivar: <strong>{dekomp.dominant_driver}</strong></>
              )}
            </BodyShort>
            {dekomp.manglende_komponenter.length > 0 && (
              <Alert variant="info" size="small">
                Komponenter ikke i pipeline ennå: {dekomp.manglende_komponenter.join(', ')}
              </Alert>
            )}
          </>
        ) : (
          <Alert variant="info">Dekomposisjon ikke tilgjengelig.</Alert>
        )}
      </div>
    </>
  )
}
