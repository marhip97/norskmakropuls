import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'
import VariabelKort from '@/components/VariabelKort'
import SkyggeTabell from '@/components/SkyggeTabell'
import type { SkyggerentePunkt } from '@/lib/types'

export default function RentePage() {
  const data = loadSituasjonsbilde()
  const skygge = data?.skyggerentebane ?? null
  const variabler = data?.variabler ?? {}
  const renteSerier = ['styringsrente', 'nowa', 'gov_yield_3y_no', 'gov_yield_10y_no']

  let aktiveRader: SkyggerentePunkt[] = []
  let alleRader: SkyggerentePunkt[] = []
  if (skygge) {
    alleRader = skygge.bane
    const ankerPub = skygge.anker_publikasjon
    aktiveRader = skygge.bane.filter((p) => {
      const harRevisjon = Math.abs(p.skygge - p.anker) > 1e-4
      const erFremtidig = p.periode > ankerPub
      return harRevisjon || erFremtidig
    }).slice(0, 16)
  }

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Rente og finansielle forhold
      </h1>

      <div className="kortgrid">
        {renteSerier.filter(s => variabler[s]).map(s => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      <div className="seksjon-rente">
        <h2 className="seksjon-tittel">Skyggerentebane</h2>
        {skygge ? (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-3)' }}>
              Anker: PPR {formaterDato(skygge.anker_publikasjon)} · Shaded område viser 50 % konfidensintervall
            </p>
            <figure aria-label={`Skyggerentebane mot anker fra ${skygge.anker_publikasjon}`} style={{ margin: 0 }}>
              <div className="graf-panel" style={{ marginTop: 0 }}>
                <TidsserieGrafKlient
                  data={skygge.bane.map(p => ({
                    periode: p.periode.slice(0, 7),
                    Anker: p.anker,
                    Skygge: p.skygge,
                    Ovre: p.over,
                    Nedre: p.under,
                  }))}
                  xKey="periode"
                  linjer={[
                    { dataKey: 'Anker', farge: '#f97316', navn: 'PPR-anker', stiplet: true },
                    { dataKey: 'Skygge', farge: '#1d4ed8', navn: 'Skyggerentebane' },
                  ]}
                  omraade={{ dataKeyOver: 'Ovre', dataKeyUnder: 'Nedre', farge: '#93c5fd' }}
                  yEtikett="%"
                  hoyde={320}
                />
              </div>
            </figure>

            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 'var(--s-6)', marginBottom: 'var(--s-2)' }}>
              Reviderte perioder
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-3)' }}>
              Kun perioder med revisjon eller etter publikasjonsdato. Historiske nullrevisjoner er skjult.
            </p>
            <SkyggeTabell rader={aktiveRader} />

            {alleRader.length > aktiveRader.length && (
              <details className="readmore" style={{ marginTop: 'var(--s-3)' }}>
                <summary>Vis hele banen ({alleRader.length} perioder)</summary>
                <div className="readmore-body">
                  <SkyggeTabell rader={alleRader} />
                </div>
              </details>
            )}

            <details className="readmore" style={{ marginTop: 'var(--s-3)' }}>
              <summary>Hva er en skyggerentebane?</summary>
              <div className="readmore-body">
                Skyggerentebanen tar utgangspunkt i Norges Banks publiserte rentebane (anker) og legger
                på en modellert revisjon basert på nyhetene siden publikasjonen — overraskelser i KPI,
                KPI-JAE, ledighet, valutakurs og oljepris. Revisjonen demper seg eksponentielt utover
                horisonten. Historiske perioder revideres ikke. Det shaded området viser et 50 %
                konfidensintervall rundt skyggebanen.
              </div>
            </details>
          </>
        ) : (
          <div className="alert alert-info">Skyggerentebane ikke tilgjengelig. Kjør scripts/generate_cache.py.</div>
        )}
      </div>

      <div className="seksjon-rente">
        <h2 className="seksjon-tittel">Valutakurser</h2>
        <div className="kortgrid">
          {['eurnok', 'usd_nok', 'i44'].filter(s => variabler[s]).map(s => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
        </div>
      </div>
    </>
  )
}
