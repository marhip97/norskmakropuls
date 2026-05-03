interface Props {
  generertTidspunkt?: string | null
}

export default function Footer({ generertTidspunkt }: Props) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div style={{ minWidth: 200 }}>
          <p className="footer-col-title">norskmakropuls</p>
          <p className="footer-col-text">Automatisert situasjonsbilde av norsk makroøkonomi.</p>
          {generertTidspunkt && (
            <p className="footer-col-text" style={{ marginTop: 4 }}>
              Sist oppdatert: {generertTidspunkt.slice(0, 10)}
            </p>
          )}
        </div>
        <div style={{ minWidth: 200 }}>
          <p className="footer-col-title">Datakilder</p>
          <p className="footer-col-text">SSB Statistikkbanken (NLOD-2.0)</p>
          <p className="footer-col-text">Norges Bank Data API</p>
          <p className="footer-col-text">FRED (St. Louis Fed)</p>
        </div>
        <div style={{ minWidth: 200 }}>
          <p className="footer-col-title">Metodikk</p>
          <p className="footer-col-text">
            Datakatalog og spesifikasjon i{' '}
            <a className="footer-link" href="https://github.com/marhip97/norskmakropuls/blob/main/docs/SPEC.md" target="_blank" rel="noopener">
              docs/SPEC.md
            </a>
          </p>
          <p className="footer-col-text">
            Lisens:{' '}
            <a className="footer-link" href="https://data.norge.no/nlod/no/2.0" target="_blank" rel="noopener">
              NLOD 2.0
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
