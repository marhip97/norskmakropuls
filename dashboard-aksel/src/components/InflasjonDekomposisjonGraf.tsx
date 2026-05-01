'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { KomponentBidrag } from '@/lib/types'

interface Props {
  bidrag: KomponentBidrag[]
  manglende: string[]
  totalSurprise: number | null
  hoyde?: number
}

const KOMPONENT_NAVN: Record<string, string> = {
  tjenester: 'Tjenester',
  importert: 'Importerte varer',
  mat: 'Mat',
  husleie: 'Husleie',
  energi: 'Energi',
}

/**
 * Horisontalt soylediagram som dekomponerer KPI-JAE-overraskelsen i bidrag
 * per komponent. Komponenter som mangler observasjoner vises som stiplete
 * plassholdere — slik at det er tydelig hvilke deler av nedbrytingen som
 * er utestaaende, ikke at de er null.
 */
export default function InflasjonDekomposisjonGraf({
  bidrag,
  manglende,
  totalSurprise,
  hoyde = 280,
}: Props) {
  const data: { navn: string; bidrag: number; mangler: boolean }[] = [
    ...bidrag.map((b) => ({
      navn: KOMPONENT_NAVN[b.navn] ?? b.navn,
      bidrag: b.bidrag,
      mangler: false,
    })),
    ...manglende.map((m) => ({
      navn: KOMPONENT_NAVN[m] ?? m,
      bidrag: 0,
      mangler: true,
    })),
  ]

  const ariaLabel =
    bidrag.length === 0
      ? 'Komponentbidrag mangler — alle delkomponenter venter paa observasjoner'
      : `Komponentbidrag til total KPI-JAE-overraskelse paa ${totalSurprise?.toFixed(2) ?? '–'} prosentpoeng`

  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        style={{
          height: hoyde,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--a-bg-subtle)',
          borderRadius: 'var(--a-border-radius-medium)',
        }}
      >
        <span style={{ color: 'var(--a-text-subtle)' }}>Ingen komponentdata</span>
      </div>
    )
  }

  return (
    <figure aria-label={ariaLabel} style={{ margin: 0 }}>
      <ResponsiveContainer width="100%" height={hoyde}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 40, left: 80, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: 'var(--a-text-subtle)' }}
            label={{
              value: 'Bidrag til total (pp)',
              position: 'insideBottom',
              offset: -4,
              fontSize: 12,
              fill: 'var(--a-text-subtle)',
            }}
          />
          <YAxis
            type="category"
            dataKey="navn"
            tick={{ fontSize: 12, fill: 'var(--a-text-default)' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--a-surface-default)',
              border: '1px solid var(--a-border-default)',
              borderRadius: 'var(--a-border-radius-medium)',
              fontSize: 13,
            }}
            formatter={(value, _name, item) => {
              const payload = (item as { payload?: { mangler?: boolean } }).payload
              if (payload?.mangler) return ['Mangler i pipeline', 'Status']
              const v = typeof value === 'number' ? value : Number(value)
              if (Number.isNaN(v)) return ['–', 'Bidrag']
              return [`${v >= 0 ? '+' : ''}${v.toFixed(3)} pp`, 'Bidrag']
            }}
          />
          <ReferenceLine x={0} stroke="var(--a-border-strong)" />
          <Bar dataKey="bidrag" isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.mangler
                    ? 'var(--a-surface-subtle)'
                    : d.bidrag >= 0
                      ? 'var(--a-deepblue-500)'
                      : 'var(--a-purple-500)'
                }
                stroke={d.mangler ? 'var(--a-border-strong)' : undefined}
                strokeDasharray={d.mangler ? '4 3' : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption style={{ marginTop: 'var(--a-spacing-2)', fontSize: 13, color: 'var(--a-text-subtle)' }}>
        Bidrag = (faktisk – anker) × kurvvekt. Stiplete soyler er plassholdere for komponenter som
        ennå ikke er i pipelinen.
      </figcaption>
    </figure>
  )
}
