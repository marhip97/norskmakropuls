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
          background: 'var(--surface-muted)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: '0.875rem' }}>Ingen data</span>
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
              <stop offset="5%"  style={{ stopColor: '#1d4ed8', stopOpacity: 0.2 }} />
              <stop offset="95%" style={{ stopColor: '#1d4ed8', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="dato"
            tickFormatter={formaterXTick}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={enhet ? 48 : 36}
            label={
              enhet
                ? { value: enhet, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b', dx: 14 }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: 13,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
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
          <Area
            type="monotone"
            dataKey="faktisk"
            name={navn}
            stroke="#1d4ed8"
            strokeWidth={2.5}
            fill="url(#gradFaktisk)"
            dot={false}
            activeDot={{ r: 5, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
            connectNulls
          />
          {ankerBane && (
            <Line
              type="monotone"
              dataKey="anker"
              name="anker"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: '#f97316' }}
              connectNulls
            />
          )}
          {ankerPubMaaned && (
            <ReferenceLine
              x={ankerPubMaaned}
              stroke="#94a3b8"
              strokeDasharray="2 4"
              label={{ value: 'PPR', position: 'top', fontSize: 10, fill: '#94a3b8' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {ankerBane && (
        <figcaption style={{ marginTop: 'var(--s-2)', fontSize: 12, color: 'var(--text-faint)' }}>
          Blå flate = faktisk observert · Stiplet oransje = PPR-anker · Vertikal markør = publikasjonsdato
        </figcaption>
      )}
    </figure>
  )
}
