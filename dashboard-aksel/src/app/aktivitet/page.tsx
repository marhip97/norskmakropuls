import { Heading, BodyShort, Alert } from '@navikt/ds-react'
import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function AktivitetPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}

  const bnp = variabler['bnp_fastland']

  return (
    <>
      <Heading size="xlarge" level="1" style={{ marginBottom: 'var(--a-spacing-6)' }}>
        Aktivitet
      </Heading>

      <div className="kortgrid">
        {['bnp_fastland', 'boligprisvekst', 'k2_kredittvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {bnp && (
        <div className="seksjon-aktivitet">
          <Heading size="medium" level="2" className="seksjon-tittel">
            BNP Fastlands-Norge: faktisk vs ankerbane
          </Heading>
          <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginBottom: 'var(--a-spacing-2)' }}>
            {bnp.anker_bane
              ? `Anker: PPR ${formaterDato(bnp.anker_bane.publikasjon)}`
              : 'Ankerbane for BNP er ikke i pipelinen ennå — viser kun faktisk observerte verdier.'}
          </BodyShort>
          {!bnp.anker_bane && (
            <Alert variant="info" size="small" style={{ marginBottom: 'var(--a-spacing-3)' }}>
              BNP Fastlands-Norge er ikke blant ankerserienes i gjeldende PPR-seed. Grafen viser
              historisk utvikling uten sammenligning mot prognose.
            </Alert>
          )}
          <AnkerVsFaktiskMedVelger
            historikk={bnp.historikk}
            ankerBane={bnp.anker_bane}
            enhet="% år/år"
            navn="BNP Fastlands-Norge"
            vinduer={VINDU_PRESETS.quarterly}
            initielt="5 år"
          />
        </div>
      )}
    </>
  )
}
