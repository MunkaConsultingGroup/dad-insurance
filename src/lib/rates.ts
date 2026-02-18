import { UserProfile, CarrierQuote } from './types';
import { carriers } from './carriers';
import {
  baseRates,
  healthClassMultipliers,
  smokerMultipliers,
  coverageMultipliers,
} from '@/data/rates';

function interpolateRate(
  termRates: Record<number, number>,
  age: number
): number | null {
  const ages = Object.keys(termRates)
    .map(Number)
    .sort((a, b) => a - b);

  // Exact match
  if (termRates[age] !== undefined) {
    return termRates[age];
  }

  // Find surrounding ages for interpolation
  let lower: number | null = null;
  let upper: number | null = null;

  for (const a of ages) {
    if (a <= age) lower = a;
    if (a >= age && upper === null) upper = a;
  }

  // Out of range
  if (lower === null || upper === null) return null;
  if (lower === upper) return termRates[lower];

  // Linear interpolation
  const ratio = (age - lower) / (upper - lower);
  return termRates[lower] + ratio * (termRates[upper] - termRates[lower]);
}

export function getEstimates(profile: UserProfile): CarrierQuote[] {
  const quotes: CarrierQuote[] = [];

  for (const carrier of carriers) {
    const carrierRates = baseRates[carrier.id];
    if (!carrierRates) continue;

    const genderRates = carrierRates[profile.gender];
    if (!genderRates) continue;

    const termRates = genderRates[profile.termLength];
    if (!termRates) continue;

    const baseRate = interpolateRate(termRates, profile.age);
    if (baseRate === null) continue;

    const healthMultiplier = healthClassMultipliers[profile.healthClass] ?? 1.0;
    const smokerMultiplier = smokerMultipliers[profile.smokerStatus] ?? 1.0;
    const coverageMultiplier = coverageMultipliers[profile.coverageAmount] ?? 1.0;

    const monthlyRate = Math.round(baseRate * healthMultiplier * smokerMultiplier * coverageMultiplier * 100) / 100;
    const annualRate = Math.round(monthlyRate * 12 * 100) / 100;

    quotes.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      monthlyRate,
      annualRate,
      amBestRating: carrier.amBestRating,
    });
  }

  // Sort cheapest first
  quotes.sort((a, b) => a.monthlyRate - b.monthlyRate);

  return quotes;
}
