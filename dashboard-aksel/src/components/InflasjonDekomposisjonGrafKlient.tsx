'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type InflasjonDekomposisjonGraf from './InflasjonDekomposisjonGraf'

const Dynamic = dynamic(() => import('./InflasjonDekomposisjonGraf'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg-subtle)', borderRadius: 'var(--a-border-radius-medium)' }}>
      <span style={{ color: 'var(--a-text-subtle)' }}>Laster diagram...</span>
    </div>
  ),
})

export default function InflasjonDekomposisjonGrafKlient(
  props: ComponentProps<typeof InflasjonDekomposisjonGraf>
) {
  return <Dynamic {...props} />
}
