import fs from 'fs'
import path from 'path'
import type { Situasjonsbilde } from './types'

// Re-eksporter utility-funksjonene fra utils.ts slik at eksisterende
// server-komponent-imports (import ... from '@/lib/data') fortsatt fungerer.
export {
  newsSignal,
  formaterVerdi,
  formaterDelta,
  formaterDato,
  formaterDatoIso,
  trendPil,
} from './utils'

export function loadSituasjonsbilde(): Situasjonsbilde | null {
  const filePath = path.join(process.cwd(), 'public', 'data', 'situasjonsbilde.json')
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Situasjonsbilde
  } catch {
    return null
  }
}
