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
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Inflasjon
      </h1>

      <div className="kortgrid">
        {['kpi', 'kpi_jae'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {kpiJae && (
        <div className="seksjon-inflasjon">
          <h2 className="seksjon-tittel">KPI-JAE: faktisk vs ankerbane</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
            {kpiJae.anker_bane
              ? `Anker: PPR ${formaterDato(kpiJae.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </p>
          {kpiJae.anker_bane && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--s-3)' }}>
              Når den blå flaten ligger over den stiplede oransje linjen, er inflasjonen høyere enn
              Norges Bank anslo i PPR {kpiJae.anker_bane.publikasjon.slice(0, 7)}.
            </div>
          )}
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
        <div className="seksjon-inflasjon">
          <h2 className="seksjon-tittel">KPI: faktisk vs ankerbane</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
            {kpi.anker_bane
              ? `Anker: PPR ${formaterDato(kpi.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </p>
          {kpi.anker_bane && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--s-3)' }}>
              KPI inkluderer energi og avgifter. KPI-JAE er den renere kjerneinflasjons-indikatoren
              Norges Bank vektlegger i pengepolitikken.
            </div>
          )}
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

      <div className="seksjon-inflasjon">
        <h2 className="seksjon-tittel">KPI-JAE-dekomposisjon</h2>
        {dekomp ? (
          <>
            <p style={{ marginBottom: 'var(--s-3)' }}>
              Total overraskelse:{' '}
              <strong>
                {dekomp.total_surprise !== null
                  ? `${formaterDelta(dekomp.total_surprise)} pp`
                  : '–'}
              </strong>
              {dekomp.dominant_driver !== 'kpi_jae' && (
                <> · Hoveddriver: <strong>{dekomp.dominant_driver}</strong></>
              )}
            </p>
            <InflasjonDekomposisjonGrafKlient
              bidrag={dekomp.bidrag_liste}
              manglende={dekomp.manglende_komponenter}
              totalSurprise={dekomp.total_surprise}
            />
            {dekomp.manglende_komponenter.length > 0 && (
              <div className="alert alert-info" style={{ marginTop: 'var(--s-3)' }}>
                Komponenter ikke i pipeline ennå: {dekomp.manglende_komponenter.join(', ')}.
                Plassholdere er vist stiplet i diagrammet.
              </div>
            )}
            <details className="readmore" style={{ marginTop: 'var(--s-3)' }}>
              <summary>Hva betyr dekomposisjonen?</summary>
              <div className="readmore-body">
                Hver komponent (tjenester, importerte varer, mat, husleie, energi) bidrar til total
                KPI-JAE-overraskelse vektet med kurvandelen. Bidraget = (faktisk – anker) × kurvvekt.
                Når en komponent mangler i pipelinen, vises den som plassholder slik at det er tydelig
                hvilke deler av nedbrytingen som er utestående. Total overraskelse oppgis i
                prosentpoeng (pp).
              </div>
            </details>
          </>
        ) : (
          <div className="alert alert-info">Dekomposisjon ikke tilgjengelig.</div>
        )}
      </div>
    </>
  )
}
