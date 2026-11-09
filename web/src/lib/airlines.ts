// Airline names by ICAO code, the first 3 letters of an airline callsign (ACA123 is Air Canada).
// Only airlines I am sure about. Anything else falls back to the registered owner, then the callsign.

const AIRLINES: Record<string, string> = {
  // Canada
  ACA: 'Air Canada',
  ROU: 'Air Canada Rouge',
  JZA: 'Jazz',
  WJA: 'WestJet',
  WEN: 'WestJet Encore',
  POE: 'Porter',
  SWG: 'Sunwing',
  FLE: 'Flair',
  TSC: 'Air Transat',
  CJT: 'Cargojet',

  // United States
  DAL: 'Delta',
  AAL: 'American Airlines',
  UAL: 'United',
  SWA: 'Southwest',
  JBU: 'JetBlue',
  ASA: 'Alaska Airlines',
  NKS: 'Spirit',
  FFT: 'Frontier',
  AAY: 'Allegiant',
  MXY: 'Breeze',
  SKW: 'SkyWest',
  ENY: 'Envoy',
  RPA: 'Republic Airways',
  JIA: 'PSA Airlines',
  EDV: 'Endeavor Air',
  PDT: 'Piedmont',
  GJS: 'GoJet',
  CPZ: 'Compass Airlines',
  FDX: 'FedEx',
  UPS: 'UPS',
  GTI: 'Atlas Air',
  EJA: 'NetJets',
  LXJ: 'Flexjet',

  // Further away
  BAW: 'British Airways',
  VIR: 'Virgin Atlantic',
  AFR: 'Air France',
  KLM: 'KLM',
  DLH: 'Lufthansa',
  EIN: 'Aer Lingus',
  ICE: 'Icelandair',
  THY: 'Turkish Airlines',
  UAE: 'Emirates',
  QTR: 'Qatar Airways',
  ETD: 'Etihad',
  CPA: 'Cathay Pacific',
  AMX: 'Aeromexico',
  CMP: 'Copa Airlines',
}

// Airline callsigns are 3 letters and then a flight number, like ACA123 or WJA4.
const AIRLINE_CALLSIGN = /^([A-Z]{3})\d/

// The ICAO airline code in a callsign, or null for callsigns like CGABC (a private plane's registration).
export function airlineCode(callsign: string | null): string | null {
  const match = callsign ? AIRLINE_CALLSIGN.exec(callsign.toUpperCase()) : null
  return match ? match[1] : null
}

// The airline name for a callsign, or null if it is not in the table.
export function airlineFromCallsign(callsign: string | null): string | null {
  const code = airlineCode(callsign)
  return code ? (AIRLINES[code] ?? null) : null
}

// The airline name for an ICAO code, used by the stats page.
export function airlineFromCode(code: string): string | null {
  return AIRLINES[code.toUpperCase()] ?? null
}
