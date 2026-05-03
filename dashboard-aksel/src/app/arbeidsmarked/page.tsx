import { loadSituasjonsbilde, formaterDato } from '@/lib/data'
import VariabelKort from '@/components/VariabelKort'
import AnkerVsFaktiskMedVelger, { VINDU_PRESETS } from '@/components/AnkerVsFaktiskMedVelger'

export default function ArbeidsmarkedPage() {
  const data = loadSituasjonsbilde()
  const variabler = data?.variabler ?? {}
  const aku = variabler['ledighet_aku']

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
        Arbeidsmarked
      </h1>

      <div className="kortgrid">
        {['ledighet_aku', 'lonnsvekst'].filter((s) => variabler[s]).map((s) => (
          <VariabelKort key={s} serieId={s} data={variabler[s]} />
        ))}
      </div>

      {aku && (
        <div className="seksjon-arbeidsmarked">
          <h2 className="seksjon-tittel">AKU-ledighet: faktisk vs ankerbane</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--s-2)' }}>
            {aku.anker_bane
              ? `Anker: PPR ${formaterDato(aku.anker_bane.publikasjon)}`
              : 'Ankerbane mangler — viser kun faktisk observerte verdier.'}
          </p>
          {aku.anker_bane && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--s-3)' }}>
              Lavere ledighet enn anker indikerer strammere arbeidsmarked enn Norges Bank la til grunn
              i PPR {aku.anker_bane.publikasjon.slice(0, 7)}, noe som typisk gir press oppover på lønn og inflasjon.
            </div>
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
