'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type Sparkline from './Sparkline'

const SparklineDynamic = dynamic(() => import('./Sparkline'), {
  ssr: false,
  loading: () => <div style={{ height: 44 }} />,
})

export default function SparklineKlient(props: ComponentProps<typeof Sparkline>) {
  return <SparklineDynamic {...props} />
}
