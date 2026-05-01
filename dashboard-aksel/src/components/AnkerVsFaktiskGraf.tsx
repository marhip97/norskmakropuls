'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { AnkerBane, Historikkpunkt } from '@/lib/types'

interface Props {
  /** Faktisk observerte verdier for serien. */
  historikk: Historikkpunkt[]
  /** Ankerbane som var siste offisielle, eller null. */
  ankerBane: AnkerBane | null
  /** Enhet (vises som y-akselabel). */
  enhet?: string
  /** Navn paa serien (vises i legenden for faktisk-linjen). */
  navn: string
  /** Hoyde paa grafen i px. */
  hoyde?: number
  /** Tilskjaering: antall siste punkter aa vise. */
  vinduSiste?: number
}

/**
 * Plotter en faktisk observert tidsserie sammen med den ankerbanen som var
 * siste offisielle. Visualiserer kjernen i produktprinsippet:
 * "oppdatert anslag = anker + revisjon" — brukeren ser direkte hvor faktiske
 * tall ligger i forhold til den prognosen som var offentlig naar vi sammenlignet.
 *
 * En vertikal referanselinje markerer ankerets publikasjonsdato slik at man
 * skiller historikk (foer publikasjon) fra prognose (etter publikasjon).
 */
export default function AnkerVsFaktiskGraf({
  historikk,
  ankerBane,
  enhet,
  navn,
  hoyde = 320,
  vinduSiste,
}: Props) {
  // Bygg sammenslaatt datasett indeksert paa periode (YYYY-MM).
  const punkter = new Map<string, { dato: string; faktisk?: number; anker?: number }>()
  for (const p of historikk) {
    const n = p.dato.slice(0, 7)
    punkter.set(n, { ...(punkter.get(n) ?? { dato: n }), faktisk: p.verdi })
  }
  if (ankerBane) {
    for (const p of ankerBane.bane) {
      const n = p.periode.slice(0, 7)
      punkter.set(n, { ...(punkter.get(n) ?? { dato: n }), anker: p.verdi })
    }
  }

  const data = Array.from(punkter.values()).sort((a, b) => a.dato.localeCompare(b.dato))
  const visningsdata = vinduSiste ? data.slice(-vinduSiste) : data
  const ankerPubMaaned = ankerBane?.publikasjon?.slice(0, 7)

  if (visningsdata.length === 0) {
    return (
      <div
        role="img"
        aria-label={`Ingen data for ${navn}`}
        style={{
          height: hoyde,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--a-bg-subtle)',
          borderRadius: 'var(--a-border-radius-medium)',
        }}
      >
        <span style={{ color: 'var(--a-text-subtle)' }}>Ingen data</span>
      </div>
    )
  }

  const ariaLabel = ankerBane
    ? `Tidsseriegraf for ${navn} med faktiske observasjoner og ankerbane fra ${ankerBane.publikasjon}`
    : `Tidsseriegraf for ${navn}, ankerbane mangler`

  return (
    <figure
      aria-label={ariaLabel}
      style={{ margin: 0 }}
    >
      <ResponsiveContainer width="100%" height={hoyde}>
        <ComposedChart data={visningsdata} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border-subtle)" />
          <XAxis
            dataKey="dato"
            tick={{ fontSize: 12, fill: 'var(--a-text-subtle)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--a-text-subtle)' }}
            label={enhet ? { value: enhet, angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--a-text-subtle)' } : undefined}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--a-surface-default)',
              border: '1px solid var(--a-border-default)',
              borderRadius: 'var(--a-border-radius-medium)',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {ankerBane && (
            <Line
              type="monotone"
              dataKey="anker"
              name={`Anker (PPR ${ankerBane.publikasjon.slice(0, 7)})`}
              stroke="var(--a-blue-500)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey="faktisk"
            name={navn}
            stroke="var(--a-deepblue-700)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
          {ankerPubMaaned && (
            <ReferenceLine
              x={ankerPubMaaned}
              stroke="var(--a-border-strong)"
              strokeDasharray="2 4"
              label={{
                value: 'Anker pub.',
                position: 'top',
                fontSize: 11,
                fill: 'var(--a-text-subtle)',
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {ankerBane && (
        <figcaption style={{ marginTop: 'var(--a-spacing-2)', fontSize: 13, color: 'var(--a-text-subtle)' }}>
          Stiplet linje viser PPR-banen som var offisiell ved sammenligning. Vertikal markor angir publikasjonsdato.
        </figcaption>
      )}
    </figure>
  )
}
