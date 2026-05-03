import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function AktivitetPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}
  const bnp = variabler['bnp_fastland']

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Aktivitet
      </h1>

      <div className="kortgrid">
        {['bnp_fastland', 'boligprisvekst', 'k2_kredittvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {bnp && (
        <div className="seksjon-aktivitet">
          <h2 className="seksjon-tittel">BNP Fastlands-Norge: faktisk vs ankerbane</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
            {bnp.anker_bane
              ? `Anker: PPR ${formaterDato(bnp.anker_bane.publikasjon)}`
              : 'Ankerbane for BNP er ikke i pipelinen ennå — viser kun faktisk observerte verdier.'}
          </p>
          {!bnp.anker_bane && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--s-3)' }}>
              BNP Fastlands-Norge er ikke blant ankerseriene i gjeldende PPR-seed. Grafen viser
              historisk utvikling uten sammenligning mot prognose.
            </div>
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
