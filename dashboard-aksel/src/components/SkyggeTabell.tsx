'use client'

import type { SkyggerentePunkt } from '@/lib/types'
import { formaterDelta } from '@/lib/utils'

interface Props {
  rader: SkyggerentePunkt[]
}

export default function SkyggeTabell({ rader }: Props) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Periode</th>
            <th style={{ textAlign: 'right' }}>Anker</th>
            <th style={{ textAlign: 'right' }}>Skygge</th>
            <th style={{ textAlign: 'right' }}>Revisjon</th>
          </tr>
        </thead>
        <tbody>
          {rader.map((p) => {
            const rev = p.skygge - p.anker
            const harRevisjon = Math.abs(rev) > 1e-4
            const badgeCls = !harRevisjon ? 'badge badge-neutral' : rev > 0 ? 'badge badge-info' : 'badge badge-warning'
            return (
              <tr key={p.periode}>
                <td>{p.periode.slice(0, 7)}</td>
                <td className="tr">{p.anker.toFixed(2)}</td>
                <td className="tr">{p.skygge.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={badgeCls}>
                    {harRevisjon ? formaterDelta(rev) : '0.00'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
