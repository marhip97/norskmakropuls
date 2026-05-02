'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
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
  historikk: Historikkpunkt[]
  ankerBane: AnkerBane | null
  enhet?: string
  navn: string
  hoyde?: number
  vinduSiste?: number
}

const MND = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des']

function formaterXTick(v: string): string {
  const parts = v.split('-')
  if (parts.length < 2) return v
  const mndIdx = parseInt(parts[1]) - 1
  if (mndIdx < 0 || mndIdx > 11) return v
  return `${MND[mndIdx]} '${parts[0].slice(2)}`
}

export default function AnkerVsFaktiskGraf({
  historikk,
  ankerBane,
  enhet = '',
  navn,
  hoyde = 320,
  vinduSiste,
}: Props) {
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
    : `Tidsseriegraf for ${navn}`

  return (
    <figure aria-label={ariaLabel} style={{ margin: 0 }}>
      <ResponsiveContainer width="100%" height={hoyde}>
        <ComposedChart data={visningsdata} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="gradFaktisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" style={{ stopColor: 'var(--a-deepblue-700)', stopOpacity: 0.22 }} />
              <stop offset="95%" style={{ stopColor: 'var(--a-deepblue-700)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border-subtle)" vertical={false} />
          <XAxis
            dataKey="dato"
            tickFormatter={formaterXTick}
            tick={{ fontSize: 11, fill: 'var(--a-text-subtle)' }}
            axisLine={{ stroke: 'var(--a-border-subtle)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--a-text-subtle)' }}
            axisLine={false}
            tickLine={false}
            width={enhet ? 48 : 36}
            label={
              enhet
                ? { value: enhet, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--a-text-subtle)', dx: 14 }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: 'var(--a-surface-default)',
              border: '1px solid var(--a-border-default)',
              borderRadius: 'var(--a-border-radius-medium)',
              fontSize: 13,
              boxShadow: 'var(--a-shadow-small)',
            }}
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value.toFixed(2) : value
              const label =
                name === 'anker'
                  ? `Anker (PPR ${ankerBane?.publikasjon?.slice(0, 7) ?? '—'})`
                  : navn
              return [`${v}${enhet ? ` ${enhet}` : ''}`, label]
            }}
            labelFormatter={(label) => formaterXTick(String(label))}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) =>
              value === 'anker'
                ? `Anker PPR ${ankerBane?.publikasjon?.slice(0, 7) ?? ''}`
                : navn
            }
          />
          {/* Faktisk serie med gradient-fill */}
          <Area
            type="monotone"
            dataKey="faktisk"
            name={navn}
            stroke="var(--a-deepblue-700)"
            strokeWidth={2.5}
            fill="url(#gradFaktisk)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--a-deepblue-700)', stroke: 'white', strokeWidth: 2 }}
            connectNulls
          />
          {/* Ankerbane: stiplet oransje linje uten fill */}
          {ankerBane && (
            <Line
              type="monotone"
              dataKey="anker"
              name="anker"
              stroke="var(--a-orange-500)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--a-orange-500)' }}
              connectNulls
            />
          )}
          {ankerPubMaaned && (
            <ReferenceLine
              x={ankerPubMaaned}
              stroke="var(--a-border-strong)"
              strokeDasharray="2 4"
              label={{
                value: 'PPR',
                position: 'top',
                fontSize: 10,
                fill: 'var(--a-text-subtle)',
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {ankerBane && (
        <figcaption style={{ marginTop: 'var(--a-spacing-2)', fontSize: 12, color: 'var(--a-text-subtle)' }}>
          Blå flate = faktisk observert. Stiplet oransje linje = PPR-anker. Vertikal markør = publikasjonsdato.
        </figcaption>
      )}
    </figure>
  )
}
