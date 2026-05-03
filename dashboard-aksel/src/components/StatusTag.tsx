import type { DataStatus } from '@/lib/types'

const BADGE_CLASS: Record<string, string> = {
  A_PROD:     'badge badge-success',
  B_TEST:     'badge badge-warning',
  C_FALLBACK: 'badge badge-info',
  D_EXCLUDE:  'badge badge-neutral',
}

const STATUS_LABEL: Record<string, string> = {
  A_PROD:     'Produksjon',
  B_TEST:     'Test',
  C_FALLBACK: 'Fallback',
  D_EXCLUDE:  'Ekskludert',
}

interface Props {
  status: DataStatus | null
  visKode?: boolean
}

export default function StatusTag({ status, visKode = true }: Props) {
  if (!status) {
    return <span className="badge badge-neutral">Ukjent</span>
  }
  const cls = BADGE_CLASS[status] ?? 'badge badge-neutral'
  const label = STATUS_LABEL[status] ?? status
  return (
    <span className={cls} title={status}>
      {visKode ? status : label}
    </span>
  )
}
