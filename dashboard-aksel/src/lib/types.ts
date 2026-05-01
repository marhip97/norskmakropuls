export interface Historikkpunkt {
  dato: string
  verdi: number
}

export interface AnkerBane {
  publikasjon: string
  bane: { periode: string; verdi: number }[]
}

export type DataStatus = 'A_PROD' | 'B_TEST' | 'C_FALLBACK' | 'D_EXCLUDE' | string

export interface VariabelData {
  navn: string
  beskrivelse: string
  siste_verdi: number | null
  siste_dato: string | null
  news: number | null
  standardisert_news: number | null
  forventet: number | null
  anker_publikasjon: string | null
  anker_bane: AnkerBane | null
  enhet: string
  gruppe: string
  frekvens: string | null
  kilde: string | null
  status: DataStatus | null
  sist_verifisert: string | null
  antall_rader: number
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

export interface KomponentBidrag {
  navn: string
  bidrag: number
}

export interface InflasjonDekomposisjon {
  total_surprise: number | null
  komponenter: Record<string, number>
  bidrag_liste: KomponentBidrag[]
  dominant_driver: string
  manglende_komponenter: string[]
  anker_publikasjon: string | null
}

export interface PipelineStatus {
  siste_kjoring: string
  variabler_hentet: number
  variabler_feil: number
  katalog_oppdatert: string | null
}

export interface Situasjonsbilde {
  generert: string
  anker_vintage: string | null
  variabler: Record<string, VariabelData>
  skyggerentebane: SkyggerenteBane | null
  inflasjon_dekomposisjon: InflasjonDekomposisjon | null
  pipeline_status: PipelineStatus
}
