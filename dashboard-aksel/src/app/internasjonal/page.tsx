import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function InternasjonalPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const olje = variabler['oljepris']

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Internasjonal
      </Heading>

      <div className="kortgrid">
        {['oljepris', 'ecb_rente', 'fed_funds', 'handelspartnervekst', 'us_10y_yield', 'us_cpi']
          .filter((s) => variabler[s])
          .map((s) => (
            <VariabelKort key={s} serieId={s} data={variabler[s]} />
          ))}
      </div>

      {olje && (
        <div className="seksjon-internasjonal">
          <Heading size="medium" level="2" className="seksjon-tittel">
            Oljepris Brent (USD/fat)
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-2)' }}>
            Daglige observasjoner siden {formaterDato(olje.historikk[0]?.dato ?? null)}.
          </BodyShort>
          <Alert variant="info" size="small" style={{ marginBottom: 'var(--a-spending-3)' }}>
            Oljepris er en eksogen variabel i Norges Banks PPR — det vil si at den brukes som
            teknisk forutsetning, ikke som en variabel Norges Bank prognoseser. Ingen ankerbane vises.
          </Alert>
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
