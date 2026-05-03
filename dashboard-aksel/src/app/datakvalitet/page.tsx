import { loadSituasjonsbilde, formaterDelta } from '@/lib/data'
import StatusTag from '@/components/StatusTag'

export default function DatakvalitetPage() {
  const data = loadSituasjonsbilde()

  if (!data) {
    return (
      <>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-4)' }}>
          Datakvalitet
        </h1>
        <div className="alert alert-warning">Ingen situasjonsdata tilgjengelig.</div>
      </>
    )
  }

  const { pipeline_status, variabler } = data
  const innslag = Object.entries(variabler)

  const varsler: { type: 'warning' | 'info'; melding: string }[] = []
  const utenStatus = innslag.filter(([, v]) => !v.status).map(([id]) => id)
  const utenAnker = innslag.filter(([, v]) => !v.anker_publikasjon && v.status === 'A_PROD').map(([id]) => id)
  if (utenStatus.length > 0) {
    varsler.push({ type: 'warning', melding: `${utenStatus.length} variabel(er) mangler status: ${utenStatus.join(', ')}` })
  }
  if (utenAnker.length > 0 && utenAnker.length < innslag.length) {
    varsler.push({ type: 'info', melding: `${utenAnker.length} A_PROD-variabel(er) har ingen ankerbane (forventet for betingingsvariabler).` })
  }

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Datakvalitet og pipelinestatus
      </h1>

      <div style={{ display: 'flex', gap: 'var(--s-6)', flexWrap: 'wrap', marginBottom: 'var(--s-6)' }}>
        {[
          { label: 'Siste kjoring',      verdi: pipeline_status.siste_kjoring },
          { label: 'Variabler hentet',   verdi: String(pipeline_status.variabler_hentet) },
          { label: 'Feil',               verdi: String(pipeline_status.variabler_feil) },
          { label: 'Anker-vintage',      verdi: data.anker_vintage ?? '–' },
          { label: 'Katalog oppdatert',  verdi: pipeline_status.katalog_oppdatert ?? '–' },
        ].map(({ label, verdi }) => (
          <div key={label}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</p>
            <p style={{ fontWeight: 600 }}>{verdi}</p>
          </div>
        ))}
      </div>

      {varsler.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
          {varsler.map((v, i) => (
            <div key={i} className={`alert alert-${v.type}`}>{v.melding}</div>
          ))}
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {['Serie-ID', 'Navn', 'Kilde', 'Frekvens', 'Sist verifisert', 'Status', 'Antall rader', 'Siste verdi', 'News'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {innslag.map(([id, v]) => (
              <tr key={id}>
                <td>
                  <code style={{ fontSize: 12, background: 'var(--surface-muted)', padding: '1px 5px', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-mono)' }}>
                    {id}
                  </code>
                </td>
                <td>{v.navn}</td>
                <td>{v.kilde ?? '–'}</td>
                <td>{v.frekvens ?? '–'}</td>
                <td>{v.sist_verifisert ?? '–'}</td>
                <td><StatusTag status={v.status} /></td>
                <td className="tr">{v.antall_rader > 0 ? v.antall_rader.toLocaleString('nb-NO') : '–'}</td>
                <td className="tr">{v.siste_verdi !== null ? `${v.siste_verdi} ${v.enhet}` : '–'}</td>
                <td className="tr">{v.news !== null ? formaterDelta(v.news) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
