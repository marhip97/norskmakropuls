import { Heading, BodyShort, Alert, ReadMore } from '@navikt/ds-react'
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
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Rente og finansielle forhold
      </Heading>

      <div className="kortgrid">
        {renteSerier.filter(s => variabler[s]).map(s => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      <div className="seksjon-rente">
        <Heading size="medium" level="2" className="seksjon-tittel">Skyggerentebane</Heading>
        {skygge ? (
          <>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
              Anker: PPR {formaterDato(skygge.anker_publikasjon)} · Shaded område viser 50 % konfidensintervall
            </BodyShort>
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
                    { dataKey: 'Anker', farge: 'var(--a-orange-500)', navn: 'PPR-anker', stiplet: true },
                    { dataKey: 'Skygge', farge: 'var(--a-deepblue-700)', navn: 'Skyggerentebane' },
                  ]}
                  omraade={{ dataKeyOver: 'Ovre', dataKeyUnder: 'Nedre', farge: 'var(--a-blue-400)' }}
                  yEtikett="%"
                  hoyde={320}
                />
              </div>
            </figure>

            <Heading size="xsmall" level="3" style={{ marginTop: 'var(--a-spacing-6)', marginBottom: 'var(--a-spacing-2)' }}>
              Reviderte perioder
            </Heading>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
              Kun perioder med revisjon eller etter publikasjonsdato. Historiske nullrevisjoner er skjult.
            </BodyShort>
            <SkyggeTabell rader={aktiveRader} />

            {alleRader.length > aktiveRader.length && (
              <ReadMore
                header={`Vis hele banen (${alleRader.length} perioder)`}
                size="small"
                defaultOpen={false}
                style={{ marginTop: 'var(--a-spacing-3)' }}
              >
                <SkyggeTabell rader={alleRader} />
              </ReadMore>
            )}

            <ReadMore header="Hva er en skyggerentebane?" size="small" defaultOpen={false} style={{ marginTop: 'var(--a-spacing-3)' }}>
              Skyggerentebanen tar utgangspunkt i Norges Banks publiserte rentebane (anker) og legger
              på en modellert revisjon basert på nyhetene siden publikasjonen — overraskelser i KPI,
              KPI-JAE, ledighet, valutakurs og oljepris. Revisjonen demper seg eksponentielt utover
              horisonten. Historiske perioder revideres ikke. Det shaded området viser et 50 %
              konfidensintervall rundt skyggebanen.
            </ReadMore>
          </>
        ) : (
          <Alert variant="info">Skyggerentebane ikke tilgjengelig. Kjør scripts/generate_cache.py.</Alert>
        )}
      </div>

      <div className="seksjon-rente">
        <Heading size="medium" level="2" className="seksjon-tittel">Valutakurser</Heading>
        <div className="kortgrid">
          {['eurnok', 'usd_nok', 'i44'].filter(s => variabler[s]).map(s => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
        </div>
      </div>
    </>
  )
}
