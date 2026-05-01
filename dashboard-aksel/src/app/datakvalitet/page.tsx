import { Heading, BodyShort, Alert, Tag } from '@navikt/ds-react'
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
        {[
          { label: 'Siste kjoring', verdi: pipeline_status.siste_kjoring },
          { label: 'Variabler hentet', verdi: String(pipeline_status.variabler_hentet) },
          { label: 'Feil', verdi: String(pipeline_status.variabler_feil) },
          { label: 'Anker-vintage', verdi: data.anker_vintage ?? '–' },
        ].map(({ label, verdi }) => (
          <div key={label}>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>{label}</BodyShort>
            <BodyShort weight="semibold">{verdi}</BodyShort>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--a-border-subtle)' }}>
              {['Serie-ID', 'Navn', 'Siste verdi', 'Siste dato', 'News', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 'var(--a-spacing-2) var(--a-spacing-3)', color: 'var(--a-text-subtle)', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(variabler).map(([id, v]) => (
              <tr key={id} style={{ borderBottom: '1px solid var(--a-border-subtle)' }}>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>
                  <code style={{ fontSize: 12, background: 'var(--a-surface-subtle)', padding: '2px 4px', borderRadius: 3 }}>{id}</code>
                </td>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>{v.navn}</td>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>
                  {v.siste_verdi !== null ? `${v.siste_verdi} ${v.enhet}` : '–'}
                </td>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>
                  {v.siste_dato?.slice(0, 10) ?? '–'}
                </td>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>
                  {v.news !== null ? `${v.news >= 0 ? '+' : ''}${v.news?.toFixed(2)}` : '–'}
                </td>
                <td style={{ padding: 'var(--a-spacing-2) var(--a-spacing-3)' }}>
                  <Tag variant="success" size="small">A_PROD</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
