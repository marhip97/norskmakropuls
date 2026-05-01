import fs from 'fs'
import path from 'path'
import type { Situasjonsbilde } from './types'

export function loadSituasjonsbilde(): Situasjonsbilde | null {
  const filePath = path.join(process.cwd(), 'public', 'data', 'situasjonsbilde.json')
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Situasjonsbilde
  } catch {
    return null
  }
}

export function newsSignal(
  standardisert: number | null
): 'positiv' | 'noytralt' | 'negativ' | 'ukjent' {
  if (standardisert === null || isNaN(standardisert)) return 'ukjent'
  if (Math.abs(standardisert) <= 0.5) return 'noytralt'
  return standardisert > 0 ? 'positiv' : 'negativ'
}

function antallDesimaler(enhet: string): number {
  const lower = enhet.toLowerCase()
  if (lower.includes('nok') || lower.includes('usd')) return 4
  if (lower.includes('indeks')) return 2
  return 1
}

export function formaterVerdi(
  verdi: number | null,
  enhet: string
): string {
  if (verdi === null || isNaN(verdi)) return '–'
  const desimaler = antallDesimaler(enhet)
  const formatert = verdi.toLocaleString('nb-NO', {
    minimumFractionDigits: desimaler,
    maximumFractionDigits: desimaler,
  })
  return `${formatert} ${enhet}`
}

/**
 * Formater et avvik (delta) med eksplisitt fortegn (+/-) og to desimaler.
 * Konsistent format paa tvers av kort, banner og tabeller.
 */
export function formaterDelta(verdi: number | null, enhet?: string): string {
  if (verdi === null || isNaN(verdi)) return '–'
  const fortegn = verdi >= 0 ? '+' : ''
  const tall = verdi.toLocaleString('nb-NO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return enhet ? `${fortegn}${tall} ${enhet}` : `${fortegn}${tall}`
}

/** Lang norsk dato: "des. 2025" — egnet for lesbar visning paa kort. */
export function formaterDato(datoStr: string | null): string {
  if (!datoStr) return '–'
  const d = new Date(datoStr)
  return d.toLocaleDateString('nb-NO', { year: 'numeric', month: 'short' })
}

/** ISO-dato: "2025-12-01" — egnet for tabeller og maskinlesbar kontekst. */
export function formaterDatoIso(datoStr: string | null): string {
  if (!datoStr) return '–'
  return datoStr.slice(0, 10)
}

export function trendPil(news: number | null, standardisert: number | null): string {
  if (news === null || standardisert === null || isNaN(news) || isNaN(standardisert)) return ''
  if (Math.abs(standardisert) <= 0.5) return '→'
  return news > 0 ? '↑' : '↓'
}
