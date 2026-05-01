import { Heading, BodyShort } from '@navikt/ds-react'
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
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            Oljepris Brent (USD/fat)
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
            Eksogen variabel — ankerbanen for oljepris er en teknisk forutsetning i Norges Banks PPR
            og inngår ikke som egen ankerserie i dette dashbordet.
          </BodyShort>
          <AnkerVsFaktiskMedVelger
            historikk={olje.historikk}
            ankerBane={null}
            enhet="USD/fat"
            navn="Oljepris Brent"
            vinduer={VINDU_PRESETS.daily}
            initielt="1 år"
          />
          {olje.anker_publikasjon && (
            <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginTop: 'var(--a-spacing-2)' }}>
              Sist sammenlignet mot anker fra {formaterDato(olje.anker_publikasjon)}.
            </BodyShort>
          )}
        </div>
      )}
    </>
  )
}
