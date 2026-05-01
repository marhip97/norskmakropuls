export interface Historikkpunkt {
  dato: string
  verdi: number
}

export interface VariabelData {
  navn: string
  beskrivelse: string
  siste_verdi: number | null
  siste_dato: string | null
  news: number | null
  standardisert_news: number | null
  enhet: string
  gruppe: string
  historikk: Historikkpunkt[]
}

export interface SkyggerentePunkt {
  periode: string
  anker: number
  skygge: number
  over: number
  under: number
}

export interface SkyggerenteBane {
  anker_publikasjon: string
  bane: SkyggerentePunkt[]
}

export interface InflasjonDekomposisjon {
  total_surprise: number | null
  komponenter: Record<string, number>
  dominant_driver: string
  manglende_komponenter: string[]
}

export interface PipelineStatus {
  siste_kjoring: string
  variabler_hentet: number
  variabler_feil: number
}

export interface Situasjonsbilde {
  generert: string
  anker_vintage: string | null
  variabler: Record<string, VariabelData>
  skyggerentebane: SkyggerenteBane | null
  inflasjon_dekomposisjon: InflasjonDekomposisjon | null
  pipeline_status: PipelineStatus
}
