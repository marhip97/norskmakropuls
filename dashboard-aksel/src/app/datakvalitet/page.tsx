import { Heading, BodyShort, Alert, Table, Tag } from '@navikt/ds-react'
import { loadSituasjonsbilde } from '@/lib/data'

export default function DatakvalitetPage() {
  const data = loadSituasjonsbilde()

  if (!data) {
    return (
      <>
        <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-4)' }}>
          Datakvalitet
        </Heading>
        <Alert variant="warning">Ingen situasjonsdata tilgjengelig.</Alert>
      </>
    )
  }

  const { pipeline_status, variabler } = data

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Datakvalitet og pipelinestatus
      </Heading>

      <div style={{ display: 'flex', gap: 'var(--a-spacing-6)', flexWrap: 'wrap', marginBottom: 'var(--a-spacing-6)' }}>
        <div>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>Siste kjoring</BodyShort>
          <BodyShort weight="semibold">{pipeline_status.siste_kjoring}</BodyShort>
        </div>
        <div>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>Variabler hentet</BodyShort>
          <BodyShort weight="semibold">{pipeline_status.variabler_hentet}</BodyShort>
        </div>
        <div>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>Feil</BodyShort>
          <BodyShort weight="semibold"
            style={{ color: pipeline_status.variabler_feil > 0 ? 'var(--a-text-danger)' : undefined }}>
            {pipeline_status.variabler_feil}
          </BodyShort>
        </div>
        <div>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>Anker-vintage</BodyShort>
          <BodyShort weight="semibold">{data.anker_vintage ?? '–'}</BodyShort>
        </div>
      </div>

      <Table size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Serie-ID</Table.HeaderCell>
            <Table.HeaderCell>Navn</Table.HeaderCell>
            <Table.HeaderCell>Siste verdi</Table.HeaderCell>
            <Table.HeaderCell>Siste dato</Table.HeaderCell>
            <Table.HeaderCell>News</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Object.entries(variabler).map(([id, v]) => (
            <Table.Row key={id}>
              <Table.DataCell>
                <code style={{ fontSize: 12 }}>{id}</code>
              </Table.DataCell>
              <Table.DataCell>{v.navn}</Table.DataCell>
              <Table.DataCell>
                {v.siste_verdi !== null ? `${v.siste_verdi} ${v.enhet}` : '–'}
              </Table.DataCell>
              <Table.DataCell>{v.siste_dato?.slice(0, 10) ?? '–'}</Table.DataCell>
              <Table.DataCell>
                {v.news !== null ? `${v.news >= 0 ? '+' : ''}${v.news?.toFixed(2)}` : '–'}
              </Table.DataCell>
              <Table.DataCell>
                <Tag variant="success" size="xsmall">A_PROD</Tag>
              </Table.DataCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </>
  )
}
