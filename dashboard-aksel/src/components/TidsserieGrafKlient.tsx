'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type TidsserieGraf from './TidsserieGraf'

const TidsserieGrafDynamic = dynamic(() => import('./TidsserieGraf'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg-subtle)', borderRadius: 'var(--a-border-radius-medium)' }}>
      <span style={{ color: 'var(--a-text-subtle)' }}>Laster graf...</span>
    </div>
  ),
})

export default function TidsserieGrafKlient(
  props: ComponentProps<typeof TidsserieGraf>
) {
  return <TidsserieGrafDynamic {...props} />
}
