import { Box, Heading, BodyShort, Label, Tag } from '@navikt/ds-react'
import type { VariabelData } from '@/lib/types'
import { newsSignal, formaterVerdi, formaterDato } from '@/lib/data'

interface Props {
  serieId: string
  data: VariabelData
}

function NewsTag({ standardisert }: { standardisert: number | null }) {
  const signal = newsSignal(standardisert)
  if (signal === 'ukjent') return null

  const label =
    signal === 'noytralt'
      ? 'Nær anker'
      : signal === 'positiv'
        ? 'Over anker'
        : 'Under anker'

  const variant =
    signal === 'noytralt' ? 'success' : signal === 'positiv' ? 'warning' : 'info'

  return (
    <Tag variant={variant} size="small">
      {label}
    </Tag>
  )
}

export default function VariabelKort({ serieId: _, data }: Props) {
  return (
    <Box
      background="surface-default"
      borderRadius="medium"
      padding="4"
      shadow="small"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--a-spacing-2)' }}>
        <Label size="small" style={{ color: 'var(--a-text-subtle)' }}>
          {data.navn}
        </Label>
        <NewsTag standardisert={data.standardisert_news} />
      </div>

      <Heading size="medium" level="3">
        {formaterVerdi(data.siste_verdi, data.enhet)}
      </Heading>

      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginTop: 'var(--a-spacing-1)' }}>
        {formaterDato(data.siste_dato)}
      </BodyShort>

      {data.news !== null && !isNaN(data.news) && (
        <BodyShort size="small" style={{ marginTop: 'var(--a-spacing-2)' }}>
          News:{' '}
          <strong>
            {data.news >= 0 ? '+' : ''}{Math.round(data.news * 100) / 100} {data.enhet}
          </strong>
        </BodyShort>
      )}

      <BodyShort size="small" style={{ color: 'var(--a-text-subtle)', marginTop: 'var(--a-spacing-1)' }}>
        {data.beskrivelse}
      </BodyShort>
    </Box>
  )
}
