import { Heading, BodyShort } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function ArbeidsmarkedPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const aku = variabler['ledighet_aku']

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Arbeidsmarked
      </Heading>

      <div className="kortgrid">
        {['ledighet_aku', 'lonnsvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {aku && (
        <div className="seksjon">
          <Heading size="medium" level="2" className="seksjon-tittel">
            AKU-ledighet: faktisk vs ankerbane
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-3)' }}>
            {aku.anker_bane
              ? `Anker: PPR ${formaterDato(aku.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </BodyShort>
          <AnkerVsFaktiskMedVelger
            historikk={aku.historikk}
            ankerBane={aku.anker_bane}
            enhet="%"
            navn="AKU-ledighet"
            vinduer={VINDU_PRESETS.monthly}
            initielt="5 år"
          />
        </div>
      )}
    </>
  )
}
