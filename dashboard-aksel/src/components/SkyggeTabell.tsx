'use client'

import { Table, Tag } from '@navikt/ds-react'
import type { SkyggerentePunkt } from '@/lib/types'
import { formaterDelta } from '@/lib/utils'

interface Props {
  rader: SkyggerentePunkt[]
}

export default function SkyggeTabell({ rader }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <Table size="small" zebraStripes>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">Periode</Table.HeaderCell>
            <Table.HeaderCell scope="col" style={{ textAlign: 'right' }}>Anker</Table.HeaderCell>
            <Table.HeaderCell scope="col" style={{ textAlign: 'right' }}>Skygge</Table.HeaderCell>
            <Table.HeaderCell scope="col" style={{ textAlign: 'right' }}>Revisjon</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rader.map((p) => {
            const rev = p.skygge - p.anker
            const harRevisjon = Math.abs(rev) > 1e-4
            const tagVariant = !harRevisjon ? 'neutral' : rev > 0 ? 'info' : 'warning'
            return (
              <Table.Row key={p.periode}>
                <Table.DataCell>{p.periode.slice(0, 7)}</Table.DataCell>
                <Table.DataCell style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.anker.toFixed(2)}
                </Table.DataCell>
                <Table.DataCell style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.skygge.toFixed(2)}
                </Table.DataCell>
                <Table.DataCell style={{ textAlign: 'right' }}>
                  <Tag variant={tagVariant} size="xsmall">
                    {harRevisjon ? formaterDelta(rev) : '0.00'}
                  </Tag>
                </Table.DataCell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </div>
  )
}
