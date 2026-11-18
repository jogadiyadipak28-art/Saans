import type { Household } from '@/lib/schemas/household'

export type ResolvedPlace = {
  label: string
  latitude: number
  longitude: number
  precision: 'city' | 'pincode'
}

const CITIES: ResolvedPlace[] = [
  { label: 'Delhi', latitude: 28.61, longitude: 77.21, precision: 'city' },
  { label: 'New Delhi', latitude: 28.61, longitude: 77.21, precision: 'city' },
  { label: 'Noida', latitude: 28.58, longitude: 77.33, precision: 'city' },
  { label: 'Gurugram', latitude: 28.46, longitude: 77.03, precision: 'city' },
  { label: 'Ghaziabad', latitude: 28.67, longitude: 77.42, precision: 'city' },
  { label: 'Lucknow', latitude: 26.85, longitude: 80.95, precision: 'city' },
  { label: 'Surat', latitude: 21.17, longitude: 72.83, precision: 'city' },
  { label: 'Ahmedabad', latitude: 23.02, longitude: 72.57, precision: 'city' },
  { label: 'Vadodara', latitude: 22.31, longitude: 73.18, precision: 'city' },
  { label: 'Rajkot', latitude: 22.3, longitude: 70.8, precision: 'city' },
  { label: 'Mumbai', latitude: 19.08, longitude: 72.88, precision: 'city' },
  { label: 'Pune', latitude: 18.52, longitude: 73.86, precision: 'city' },
  { label: 'Kolkata', latitude: 22.57, longitude: 88.36, precision: 'city' },
  { label: 'Chennai', latitude: 13.08, longitude: 80.27, precision: 'city' },
  { label: 'Bengaluru', latitude: 12.97, longitude: 77.59, precision: 'city' },
  { label: 'Hyderabad', latitude: 17.39, longitude: 78.49, precision: 'city' },
  { label: 'Jaipur', latitude: 26.91, longitude: 75.79, precision: 'city' },
  { label: 'Kanpur', latitude: 26.45, longitude: 80.33, precision: 'city' },
  { label: 'Patna', latitude: 25.59, longitude: 85.14, precision: 'city' },
  { label: 'Indore', latitude: 22.72, longitude: 75.86, precision: 'city' },
  { label: 'Bhopal', latitude: 23.26, longitude: 77.41, precision: 'city' },
  { label: 'Chandigarh', latitude: 30.73, longitude: 76.78, precision: 'city' },
  { label: 'Varanasi', latitude: 25.32, longitude: 83.0, precision: 'city' },
  { label: 'Agra', latitude: 27.18, longitude: 78.02, precision: 'city' },
]

/** First two PIN digits to an approximate district centroid. Not a street address. */
const PIN_PREFIX: Record<string, { label: string; latitude: number; longitude: number }> = {
  '11': { label: 'Delhi region', latitude: 28.61, longitude: 77.21 },
  '12': { label: 'Haryana region', latitude: 29.39, longitude: 76.97 },
  '13': { label: 'Haryana region', latitude: 28.46, longitude: 77.03 },
  '14': { label: 'Punjab region', latitude: 31.63, longitude: 74.87 },
  '20': { label: 'Uttar Pradesh region', latitude: 27.18, longitude: 78.02 },
  '22': { label: 'Uttar Pradesh region', latitude: 26.85, longitude: 80.95 },
  '24': { label: 'Uttarakhand region', latitude: 30.32, longitude: 78.03 },
  '30': { label: 'Rajasthan region', latitude: 26.91, longitude: 75.79 },
  '36': { label: 'Gujarat region', latitude: 23.02, longitude: 72.57 },
  '39': { label: 'Gujarat region', latitude: 21.17, longitude: 72.83 },
  '40': { label: 'Maharashtra region', latitude: 19.08, longitude: 72.88 },
  '41': { label: 'Maharashtra region', latitude: 18.52, longitude: 73.86 },
  '45': { label: 'Madhya Pradesh region', latitude: 22.72, longitude: 75.86 },
  '46': { label: 'Madhya Pradesh region', latitude: 23.26, longitude: 77.41 },
  '50': { label: 'Telangana region', latitude: 17.39, longitude: 78.49 },
  '56': { label: 'Karnataka region', latitude: 12.97, longitude: 77.59 },
  '60': { label: 'Tamil Nadu region', latitude: 13.08, longitude: 80.27 },
  '67': { label: 'Kerala region', latitude: 9.93, longitude: 76.27 },
  '70': { label: 'West Bengal region', latitude: 22.57, longitude: 88.36 },
  '75': { label: 'Odisha region', latitude: 20.3, longitude: 85.82 },
  '80': { label: 'Bihar region', latitude: 25.59, longitude: 85.14 },
  '83': { label: 'Jharkhand region', latitude: 23.34, longitude: 85.31 },
}

export function resolvePlace(query: string): ResolvedPlace | null {
  const trimmed = query.trim()
  if (/^\d{6}$/.test(trimmed)) {
    const hit = PIN_PREFIX[trimmed.slice(0, 2)]
    if (!hit) return null
    return { label: `${hit.label} (${trimmed})`, latitude: hit.latitude, longitude: hit.longitude, precision: 'pincode' }
  }
  const city = CITIES.find((item) => item.label.toLowerCase() === trimmed.toLowerCase())
  return city ?? null
}

export const PERSONAS: Record<'delhi' | 'surat' | 'lucknow', Household> = {
  delhi: {
    locationLabel: 'Delhi NCR',
    latitude: 28.65,
    longitude: 77.3,
    locationPrecision: 'preset',
    floor: 'ground',
    windowHabit: 'closed',
    kitchenVentilation: 'exhaust',
    cookingFuel: 'lpg',
    commuteMode: 'two-wheeler',
    distanceKm: 12,
    members: { infant: 1, child: 1, adult: 2, elderly: 1 },
    respiratorySensitivity: true,
    purifierOwned: false,
    purifierCadr: 0,
    budget: 'low',
    language: 'hi',
    shareOptIn: false,
  },
  surat: {
    locationLabel: 'Surat',
    latitude: 21.17,
    longitude: 72.83,
    locationPrecision: 'preset',
    floor: 'mid',
    windowHabit: 'open',
    kitchenVentilation: 'chimney',
    cookingFuel: 'png',
    commuteMode: 'open-bus',
    distanceKm: 8,
    members: { infant: 0, child: 1, adult: 2, elderly: 0 },
    respiratorySensitivity: false,
    purifierOwned: false,
    purifierCadr: 0,
    budget: 'medium',
    language: 'gu',
    shareOptIn: false,
  },
  lucknow: {
    locationLabel: 'Lucknow',
    latitude: 26.85,
    longitude: 80.95,
    locationPrecision: 'preset',
    floor: 'high',
    windowHabit: 'sealed',
    kitchenVentilation: 'none',
    cookingFuel: 'biomass',
    commuteMode: 'walk',
    distanceKm: 3,
    members: { infant: 0, child: 0, adult: 1, elderly: 1 },
    respiratorySensitivity: true,
    purifierOwned: false,
    purifierCadr: 0,
    budget: 'none',
    language: 'hi',
    shareOptIn: false,
  },
}
