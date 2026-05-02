'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import type { Historikkpunkt } from '@/lib/types'

interface Props {
  id: string
  data: Historikkpunkt[]
  farge?: string
  hoyde?: number
}

export default function Sparkline({ id, data, farge = 'var(--a-deepblue-500)', hoyde = 44 }: Props) {
  const punkter = data.map((p) => ({ v: p.verdi }))
  if (punkter.length < 2) return null

  const gradId = `spark-${id}`

  return (
    <ResponsiveContainer width="100%" height={hoyde}>
      <AreaChart data={punkter} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" style={{ stopColor: farge, stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: farge, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={farge}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
