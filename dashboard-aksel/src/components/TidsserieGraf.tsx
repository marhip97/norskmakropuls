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
          background: 'var(--surface-muted)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: '0.875rem' }}>Ingen data</span>
      </div>
    )
  }

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={hoyde}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={formaterXTick}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            interval="preserveStartEnd"
            label={xEtikett ? { value: xEtikett, position: 'insideBottom', offset: -4, fontSize: 11 } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={yEtikett ? { value: yEtikett, angle: -90, position: 'insideLeft', fontSize: 11, dx: 14 } : undefined}
          />
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: 13,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
            }}
            labelFormatter={(label) => formaterXTick(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

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
                fill="#ffffff"
                fillOpacity={1}
                legendType="none"
                name="Nedre band"
                connectNulls
                dot={false}
              />
            </>
          )}

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
