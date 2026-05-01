'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type AnkerVsFaktiskGraf from './AnkerVsFaktiskGraf'

const Dynamic = dynamic(() => import('./AnkerVsFaktiskGraf'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg-subtle)', borderRadius: 'var(--a-border-radius-medium)' }}>
      <span style={{ color: 'var(--a-text-subtle)' }}>Laster graf...</span>
    </div>
  ),
})

export default function AnkerVsFaktiskGrafKlient(
  props: ComponentProps<typeof AnkerVsFaktiskGraf>
) {
  return <Dynamic {...props} />
}
