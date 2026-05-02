import { Heading, BodyShort, Alert } from '@navikt/ds-react'
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
        <div className="seksjon-arbeidsmarked">
          <Heading size="medium" level="2" className="seksjon-tittel">
            AKU-ledighet: faktisk vs ankerbane
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-2)' }}>
            {aku.anker_bane
              ? `Anker: PPR ${formaterDato(aku.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </BodyShort>
          {aku.anker_bane && (
            <Alert variant="info" size="small" style={{ marginBottom: 'var(--a-spacing-3)' }}>
              Lavere ledighet enn anker indikerer strammere arbeidsmarked enn Norges Bank la til grunn
              i PPR {aku.anker_bane.publikasjon.slice(0, 7)}, noe som typisk gir press oppover på lønn og inflasjon.
            </Alert>
          )}
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
