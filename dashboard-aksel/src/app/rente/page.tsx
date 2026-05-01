import { Heading, BodyShort, Alert, ReadMore } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato, formaterDelta } from '@/lib/data'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'
import VariabelKort from '@/components/VariabelKort'
import type { SkyggerentePunkt } from '@/lib/types'

const thStil: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--a-spacing-2) var(--a-spacing-3)',
  color: 'var(--a-text-subtle)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--a-border-subtle)',
}
const tdStil: React.CSSProperties = {
  padding: 'var(--a-spacing-2) var(--a-spacing-3)',
  borderBottom: '1px solid var(--a-border-subtle)',
}

function SkyggeTabell({ rader }: { rader: SkyggerentePunkt[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={thStil}>Periode</th>
            <th style={{ ...thStil, textAlign: 'right' }}>Anker</th>
            <th style={{ ...thStil, textAlign: 'right' }}>Skygge</th>
            <th style={{ ...thStil, textAlign: 'right' }}>Revisjon</th>
          </tr>
        </thead>
        <tbody>
          {rader.map((p) => {
            const rev = p.skygge - p.anker
            const aksent =
              Math.abs(rev) < 1e-4 ? undefined :
              rev > 0 ? 'var(--a-deepblue-600)' : 'var(--a-purple-600)'
            return (
              <tr key={p.periode}>
                <td style={tdStil}>{p.periode.slice(0, 7)}</td>
                <td style={{ ...tdStil, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.anker.toFixed(2)}</td>
                <td style={{ ...tdStil, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.skygge.toFixed(2)}</td>
                <td style={{ ...tdStil, textAlign: 'right', color: aksent, fontVariantNumeric: 'tabular-nums' }}>
                  {Math.abs(rev) < 1e-4 ? '0.00' : formaterDelta(rev)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function RentePage() {
  const data = loadSituasjonsbilde()
  const skygge = data?.skyggerentebane ?? null
  const variabler = data?.variabler ?? {}
  const renteSerier = ['styringsrente', 'nowa', 'gov_yield_3y_no', 'gov_yield_10y_no']

  // Filtrer skyggetabellen til perioder som faktisk endres av modellen,
  // pluss noen kontekst-perioder rundt publikasjonsdato. Hele banen er
  // tilgjengelig via ReadMore.
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

      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">Skyggerentebane</Heading>
        {skygge ? (
          <>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-4)' }}>
              Anker: PPR {formaterDato(skygge.anker_publikasjon)}
            </BodyShort>
            <figure aria-label={`Skyggerentebane mot anker fra ${skygge.anker_publikasjon}`} style={{ margin: 0 }}>
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
                  { dataKey: 'Anker', farge: 'var(--a-blue-500)', navn: 'PPR-anker', stiplet: true },
                  { dataKey: 'Skygge', farge: 'var(--a-deepblue-700)', navn: 'Skyggerentebane' },
                  { dataKey: 'Ovre', farge: 'var(--a-border-strong)', navn: 'Øvre band', stiplet: true },
                  { dataKey: 'Nedre', farge: 'var(--a-border-strong)', navn: 'Nedre band', stiplet: true },
                ]}
                yEtikett="%"
                hoyde={320}
              />
            </figure>

            <Heading size="xsmall" level="3" style={{ marginTop: 'var(--a-spacing-6)', marginBottom: 'var(--a-spacing-2)' }}>
              Reviderte perioder
            </Heading>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
              Tabellen viser kun perioder hvor skyggen avviker fra ankeret eller ligger etter publikasjonsdatoen.
              Historiske perioder med nullrevisjon er skjult.
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
              Skyggerentebanen tar utgangspunkt i Norges Banks publiserte rentebane (anker) og legger på
              en modellert revisjon basert på nyhetene siden publikasjonen — overraskelser i KPI, KPI-JAE,
              ledighet, valutakurs og oljepris. Revisjonen demper seg eksponentielt utover horisonten.
              Historiske perioder revideres ikke, fordi de allerede er observert.
            </ReadMore>
          </>
        ) : (
          <Alert variant="info">Skyggerentebane ikke tilgjengelig. Kjor scripts/generate_cache.py.</Alert>
        )}
      </div>

      <div className="seksjon">
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
