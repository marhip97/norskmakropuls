import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function InternasjonalPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}
  const olje = variabler['oljepris']

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Internasjonal
      </h1>

      <div className="kortgrid">
        {['oljepris', 'ecb_rente', 'fed_funds', 'handelspartnervekst', 'us_10y_yield', 'us_cpi']
          .filter((s) => variabler[s])
          .map((s) => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
      </div>

      {olje && (
        <div className="seksjon-internasjonal">
          <h2 className="seksjon-tittel">Oljepris Brent (USD/fat)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
            Daglige observasjoner siden {formaterDato(olje.historikk[0]?.dato ?? null)}.
          </p>
          <div className="alert alert-info" style={{ marginBottom: 'var(--s-3)' }}>
            Oljepris er en eksogen variabel i Norges Banks PPR — det vil si at den brukes som
            teknisk forutsetning, ikke som en variabel Norges Bank prognoserer. Ingen ankerbane vises.
          </div>
          <AnkerVsFaktiskMedVelger
            historikk={olje.historikk}
            ankerBane={null}
            enhet="USD/fat"
            navn="Oljepris Brent"
            vinduer={VINDU_PRESETS.daily}
            initielt="1 år"
          />
        </div>
      )}
    </>
  )
}
