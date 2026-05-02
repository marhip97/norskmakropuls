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
} from 'recharts'

interface Linje {
  dataKey: string
  farge: string
  navn: string
  stiplet?: boolean
}

interface Omraade {
  dataKeyOver: string
  dataKeyUnder: string
  farge: string
}

interface Props {
  data: Record<string, unknown>[]
  xKey: string
  linjer: Linje[]
  /** Shaded konfidensband mellom to datanokler. */
  omraade?: Omraade
  xEtikett?: string
  yEtikett?: string
  hoyde?: number
}

const MND = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des']

function formaterXTick(v: string): string {
  const parts = v.split('-')
  if (parts.length < 2) return v
  const mndIdx = parseInt(parts[1]) - 1
  if (mndIdx < 0 || mndIdx > 11) return v
  return `${MND[mndIdx]} '${parts[0].slice(2)}`
}

export default function TidsserieGraf({
  data,
  xKey,
  linjer,
  omraade,
  xEtikett,
  yEtikett,
  hoyde = 300,
}: Props) {
  const ariaLabel = `Tidsseriegraf med ${linjer.length} serier`

  if (!data || data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Ingen data tilgjengelig"
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

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={hoyde}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border-subtle)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={formaterXTick}
            tick={{ fontSize: 11, fill: 'var(--a-text-subtle)' }}
            axisLine={{ stroke: 'var(--a-border-subtle)' }}
            tickLine={false}
            interval="preserveStartEnd"
            label={xEtikett ? { value: xEtikett, position: 'insideBottom', offset: -4, fontSize: 11 } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--a-text-subtle)' }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={yEtikett ? { value: yEtikett, angle: -90, position: 'insideLeft', fontSize: 11, dx: 14 } : undefined}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--a-surface-default)',
              border: '1px solid var(--a-border-default)',
              borderRadius: 'var(--a-border-radius-medium)',
              fontSize: 13,
              boxShadow: 'var(--a-shadow-small)',
            }}
            labelFormatter={(label) => formaterXTick(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

          {/* Shaded konfidensband — rendres foer linjene slik at de havner bakerst */}
          {omraade && (
            <>
              <Area
                type="monotone"
                dataKey={omraade.dataKeyOver}
                stroke="none"
                fill={omraade.farge}
                fillOpacity={0.25}
                legendType="none"
                name="Øvre band"
                connectNulls
                dot={false}
              />
              <Area
                type="monotone"
                dataKey={omraade.dataKeyUnder}
                stroke="none"
                fill="var(--a-surface-default)"
                fillOpacity={1}
                legendType="none"
                name="Nedre band"
                connectNulls
                dot={false}
              />
            </>
          )}

          {/* Linjer i forgrunnen */}
          {linjer.map((l) => (
            <Line
              key={l.dataKey}
              type="monotone"
              dataKey={l.dataKey}
              name={l.navn}
              stroke={l.farge}
              strokeWidth={2}
              strokeDasharray={l.stiplet ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
