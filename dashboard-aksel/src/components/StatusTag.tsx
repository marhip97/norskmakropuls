import { Tag } from '@navikt/ds-react'
import type { DataStatus } from '@/lib/types'

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Tag>['variant']> = {
  A_PROD: 'success',
  B_TEST: 'warning',
  C_FALLBACK: 'info',
  D_EXCLUDE: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  A_PROD: 'Produksjon',
  B_TEST: 'Test',
  C_FALLBACK: 'Fallback',
  D_EXCLUDE: 'Ekskludert',
}

interface Props {
  status: DataStatus | null
  visKode?: boolean
}

export default function StatusTag({ status, visKode = true }: Props) {
  if (!status) {
    return <Tag variant="neutral" size="small">Ukjent</Tag>
  }
  const variant = STATUS_VARIANT[status] ?? 'neutral'
  const label = STATUS_LABEL[status] ?? status
  return (
    <Tag variant={variant} size="small" title={status}>
      {visKode ? status : label}
    </Tag>
  )
}
