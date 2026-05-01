import { BodyShort, Link as AkselLink } from '@navikt/ds-react'

interface Props {
  generertTidspunkt?: string | null
}

export default function Footer({ generertTidspunkt }: Props) {
  return (
    <footer
      style={{
        marginTop: 'var(--a-spacing-16)',
        padding: 'var(--a-spacing-6)',
        borderTop: '1px solid var(--a-border-subtle)',
        background: 'var(--a-surface-subtle)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'var(--a-spacing-6)', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 220 }}>
          <BodyShort weight="semibold" size="small">norskmakropuls</BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
            Automatisert situasjonsbilde av norsk makroøkonomi.
          </BodyShort>
          {generertTidspunkt && (
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginTop: 'var(--a-spacing-1)' }}>
              Sist oppdatert: {generertTidspunkt.slice(0, 10)}
            </BodyShort>
          )}
        </div>

        <div style={{ minWidth: 220 }}>
          <BodyShort weight="semibold" size="small">Datakilder</BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>SSB Statistikkbanken (NLOD-2.0)</BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>Norges Bank Data API</BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>FRED (St. Louis Fed)</BodyShort>
        </div>

        <div style={{ minWidth: 220 }}>
          <BodyShort weight="semibold" size="small">Metodikk</BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
            Datakatalog og spesifikasjon i{' '}
            <AkselLink href="https://github.com/marhip97/norskmakropuls/blob/main/docs/SPEC.md" target="_blank" rel="noopener">
              docs/SPEC.md
            </AkselLink>
          </BodyShort>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)' }}>
            Lisens:{' '}
            <AkselLink href="https://data.norge.no/nlod/no/2.0" target="_blank" rel="noopener">
              NLOD 2.0
            </AkselLink>
          </BodyShort>
        </div>
      </div>
    </footer>
  )
}
