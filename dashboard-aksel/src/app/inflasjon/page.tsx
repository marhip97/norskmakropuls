import { Heading, BodyShort, Alert, ReadMore } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDelta, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'
import InflasjonDekomposisjonGrafKlient from '@/components/InflasjonDekomposisjonGrafKlient'

export default function InflasjonPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}
  const dekomp = data?.inflasjon_dekomposisjon ?? null

  const kpi = variabler['kpi']
  const kpiJae = variabler['kpi_jae']

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

      {kpiJae && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            KPI-JAE: faktisk vs ankerbane
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
            {kpiJae.anker_bane
              ? `Anker: PPR ${formaterDato(kpiJae.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </BodyShort>
          <AnkerVsFaktiskMedVelger
            historikk={kpiJae.historikk}
            ankerBane={kpiJae.anker_bane}
            enhet="% år/år"
            navn="KPI-JAE"
            vinduer={VINDU_PRESETS.monthly}
            initielt="3 år"
          />
        </div>
      )}

      {kpi && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            KPI: faktisk vs ankerbane
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
            {kpi.anker_bane
              ? `Anker: PPR ${formaterDato(kpi.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </BodyShort>
          <AnkerVsFaktiskMedVelger
            historikk={kpi.historikk}
            ankerBane={kpi.anker_bane}
            enhet="% år/år"
            navn="KPI"
            vinduer={VINDU_PRESETS.monthly}
            initielt="3 år"
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
              Total overraskelse:{' '}
              <strong>
                {dekomp.total_surprise !== null
                  ? `${formaterDelta(dekomp.total_surprise)} pp`
                  : '–'}
              </strong>
              {dekomp.dominant_driver !== 'kpi_jae' && (
                <> · Hoveddriver: <strong>{dekomp.dominant_driver}</strong></>
              )}
            </BodyShort>
            <InflasjonDekomposisjonGrafKlient
              bidrag={dekomp.bidrag_liste}
              manglende={dekomp.manglende_komponenter}
              totalSurprise={dekomp.total_surprise}
            />
            {dekomp.manglende_komponenter.length > 0 && (
              <Alert variant="info" size="small" style={{ marginTop: 'var(--a-spacing-3)' }}>
                Komponenter ikke i pipeline ennå: {dekomp.manglende_komponenter.join(', ')}.
                Plassholdere er vist stiplet i diagrammet.
              </Alert>
            )}
            <ReadMore header="Hva betyr dekomposisjonen?" size="small" defaultOpen={false}>
              Hver komponent (tjenester, importerte varer, mat, husleie, energi) bidrar til total
              KPI-JAE-overraskelse vektet med kurvandelen. Bidraget = (faktisk – anker) × kurvvekt.
              Når en komponent mangler i pipelinen, vises den som plassholder slik at det er tydelig
              hvilke deler av nedbrytingen som er utestaaende. Total overraskelse oppgis i
              prosentpoeng (pp).
            </ReadMore>
          </>
        ) : (
          <Alert variant="info">Dekomposisjon ikke tilgjengelig.</Alert>
        )}
      </div>
    </>
  )
}
