'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

interface Linje {
  dataKey: string
  farge: string
  navn: string
  stiplet?: boolean
}

interface Props {
  data: Record<string, unknown>[]
  xKey: string
  linjer: Linje[]
  xEtikett?: string
  yEtikett?: string
  hoyde?: number
}

export default function TidsserieGraf({
  data,
  xKey,
  linjer,
  xEtikett,
  yEtikett,
  hoyde = 300,
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: hoyde, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg-subtle)', borderRadius: 'var(--a-border-radius-medium)' }}>
        <span style={{ color: 'var(--a-text-subtle)' }}>Ingen data</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={hoyde}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border-subtle)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: 'var(--a-text-subtle)' }}
          label={xEtikett ? { value: xEtikett, position: 'insideBottom', offset: -4 } : undefined}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--a-text-subtle)' }}
          label={yEtikett ? { value: yEtikett, angle: -90, position: 'insideLeft' } : undefined}
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
        {linjer.map((l) => (
          <Line
            key={l.dataKey}
            type="monotone"
            dataKey={l.dataKey}
            name={l.navn}
            stroke={l.farge}
            strokeWidth={2}
            strokeDasharray={l.stiplet ? '5 5' : undefined}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
