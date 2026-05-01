import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import TidsserieGrafKlient from '@/components/TidsserieGrafKlient'
import VariabelKort from '@/components/VariabelKort'

const thStil: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--a-spacing-2) var(--a-spacing-3)',
  color: 'var(--a-text-subtle)',
  fontWeight: 600,
  borderBottom: '2px solid var(--a-border-subtle)',
}
const tdStil: React.CSSProperties = {
  padding: 'var(--a-spacing-2) var(--a-spacing-3)',
  borderBottom: '1px solid var(--a-border-subtle)',
}

export default function RentePage() {
  const data = loadSituasjonsbilde()
  const skygge = data?.skyggerentebane ?? null
  const variabler = data?.variabler ?? {}
  const renteSerier = ['styringsrente', 'nowa', 'gov_yield_3y_no', 'gov_yield_10y_no']

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
            <TidsserieGrafKlient
              data={skygge.bane.map(p => ({ periode: p.periode.slice(0,7), Anker: p.anker, Skygge: p.skygge, Ovre: p.over, Nedre: p.under }))}
              xKey="periode"
              linjer={[
                { dataKey: 'Anker', farge: '#0067c5', navn: 'PPR-anker', stiplet: true },
                { dataKey: 'Skygge', farge: '#23262a', navn: 'Skyggerentebane' },
                { dataKey: 'Ovre', farge: '#a3b8cc', navn: 'Ovre band', stiplet: true },
                { dataKey: 'Nedre', farge: '#a3b8cc', navn: 'Nedre band', stiplet: true },
              ]}
              yEtikett="%" hoyde={320}
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 'var(--a-spacing-6)' }}>
                <thead>
                  <tr>
                    <th style={thStil}>Periode</th>
                    <th style={{ ...thStil, textAlign: 'right' }}>Anker</th>
                    <th style={{ ...thStil, textAlign: 'right' }}>Skygge</th>
                    <th style={{ ...thStil, textAlign: 'right' }}>Revisjon</th>
                  </tr>
                </thead>
                <tbody>
                  {skygge.bane.map(p => {
                    const rev = p.skygge - p.anker
                    return (
                      <tr key={p.periode}>
                        <td style={tdStil}>{p.periode.slice(0,7)}</td>
                        <td style={{ ...tdStil, textAlign: 'right' }}>{p.anker.toFixed(2)}</td>
                        <td style={{ ...tdStil, textAlign: 'right' }}>{p.skygge.toFixed(2)}</td>
                        <td style={{ ...tdStil, textAlign: 'right', color: rev > 0 ? 'var(--a-text-danger)' : rev < 0 ? 'var(--a-text-success)' : undefined }}>
                          {rev >= 0 ? '+' : ''}{rev.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
