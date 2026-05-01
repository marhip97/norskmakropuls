import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDelta } from '@/lib/data'
import StatusTag from '@/components/StatusTag'

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
  const innslag = Object.entries(variabler)

  // Liten "punchlist" for synlige problemer.
  const varsler: { type: 'warning' | 'info'; melding: string }[] = []
  const utenStatus = innslag.filter(([, v]) => !v.status).map(([id]) => id)
  const utenAnker = innslag.filter(([, v]) => !v.anker_publikasjon && v.status === 'A_PROD').map(([id]) => id)
  if (utenStatus.length > 0) {
    varsler.push({ type: 'warning', melding: `${utenStatus.length} variabel(er) mangler status i datakatalogen: ${utenStatus.join(', ')}` })
  }
  if (utenAnker.length > 0 && utenAnker.length < innslag.length) {
    varsler.push({ type: 'info', melding: `${utenAnker.length} A_PROD-variabel(er) har ingen ankerbane (forventet for betingingsvariabler).` })
  }

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
          { label: 'Katalog oppdatert', verdi: pipeline_status.katalog_oppdatert ?? '–' },
        ].map(({ label, verdi }) => (
          <div key={label}>
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>{label}</BodyShort>
            <BodyShort weight="semibold">{verdi}</BodyShort>
          </div>
        ))}
      </div>

      {varsler.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a-spacing-2)', marginBottom: 'var(--a-spacing-4)' }}>
          {varsler.map((v, i) => (
            <Alert key={i} variant={v.type} size="small">{v.melding}</Alert>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Serie-ID', 'Navn', 'Kilde', 'Frekvens', 'Sist verifisert', 'Status', 'Antall rader', 'Siste verdi', 'News'].map((h) => (
                <th key={h} style={thStil}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {innslag.map(([id, v]) => (
              <tr key={id}>
                <td style={tdStil}>
                  <code style={{ fontSize: 12, background: 'var(--a-surface-subtle)', padding: '2px 4px', borderRadius: 3 }}>{id}</code>
                </td>
                <td style={tdStil}>{v.navn}</td>
                <td style={tdStil}>{v.kilde ?? '–'}</td>
                <td style={tdStil}>{v.frekvens ?? '–'}</td>
                <td style={tdStil}>{v.sist_verifisert ?? '–'}</td>
                <td style={tdStil}><StatusTag status={v.status} /></td>
                <td style={{ ...tdStil, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.antall_rader > 0 ? v.antall_rader.toLocaleString('nb-NO') : '–'}
                </td>
                <td style={{ ...tdStil, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.siste_verdi !== null ? `${v.siste_verdi} ${v.enhet}` : '–'}
                </td>
                <td style={{ ...tdStil, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.news !== null ? formaterDelta(v.news) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
