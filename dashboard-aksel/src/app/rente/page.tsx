import { Heading, BodyShort, Alert, Table } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import TidsserieGraf from '@/components/TidsserieGraf'
import VariabelKort from '@/components/VariabelKort'

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
        {renteSerier
          .filter((s) => variabler[s])
          .map((s) => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
      </div>

      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">
          Skyggerentebane
        </Heading>
        {skygge ? (
          <>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-4)' }}>
              Anker: PPR {formaterDato(skygge.anker_publikasjon)}
            </BodyShort>
            <TidsserieGraf
              data={skygge.bane.map((p) => ({
                periode: p.periode.slice(0, 7),
                Anker: p.anker,
                Skygge: p.skygge,
                'Ovre band': p.over,
                'Nedre band': p.under,
              }))}
              xKey="periode"
              linjer={[
                { dataKey: 'Anker', farge: '#0067c5', navn: 'PPR-anker', stiplet: true },
                { dataKey: 'Skygge', farge: '#23262a', navn: 'Skyggerentebane' },
                { dataKey: 'Ovre band', farge: '#a3b8cc', navn: 'Ovre band', stiplet: true },
                { dataKey: 'Nedre band', farge: '#a3b8cc', navn: 'Nedre band', stiplet: true },
              ]}
              yEtikett="%"
              hoyde={320}
            />

            <Table style={{ marginTop: 'var(--a-spacing-6)' }} size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Periode</Table.HeaderCell>
                  <Table.HeaderCell align="right">Anker</Table.HeaderCell>
                  <Table.HeaderCell align="right">Skygge</Table.HeaderCell>
                  <Table.HeaderCell align="right">Revisjon</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {skygge.bane.map((p) => (
                  <Table.Row key={p.periode}>
                    <Table.DataCell>{p.periode.slice(0, 7)}</Table.DataCell>
                    <Table.DataCell align="right">{p.anker.toFixed(2)}</Table.DataCell>
                    <Table.DataCell align="right">{p.skygge.toFixed(2)}</Table.DataCell>
                    <Table.DataCell align="right">
                      {(p.skygge - p.anker) >= 0 ? '+' : ''}{(p.skygge - p.anker).toFixed(2)}
                    </Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </>
        ) : (
          <Alert variant="info">
            Skyggerentebane ikke tilgjengelig. Kjor scripts/generate_cache.py for a generere.
          </Alert>
        )}
      </div>

      <div className="seksjon">
        <Heading size="medium" level="2" className="seksjon-tittel">
          Valutakurser
        </Heading>
        <div className="kortgrid">
          {['eurnok', 'usd_nok', 'i44'].filter((s) => variabler[s]).map((s) => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
        </div>
      </div>
    </>
  )
}
