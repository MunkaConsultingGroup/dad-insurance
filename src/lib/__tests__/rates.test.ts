import { getEstimates } from '../rates';
import { UserProfile } from '../types';

describe('getEstimates', () => {
  it('returns quotes from all 5 carriers for a standard profile', () => {
    const profile: UserProfile = {
      age: 35,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    expect(quotes).toHaveLength(5);
    quotes.forEach((q) => {
      expect(q.monthlyRate).toBeGreaterThan(0);
      expect(q.annualRate).toBe(Math.round(q.monthlyRate * 12 * 100) / 100);
      expect(q.carrierName).toBeTruthy();
      expect(q.amBestRating).toBeTruthy();
    });
  });

  it('returns sorted quotes (cheapest first)', () => {
    const profile: UserProfile = {
      age: 45,
      gender: 'female',
      smokerStatus: 'never',
      healthClass: 'preferred',
      coverageAmount: 500000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    for (let i = 1; i < quotes.length; i++) {
      expect(quotes[i].monthlyRate).toBeGreaterThanOrEqual(quotes[i - 1].monthlyRate);
    }
  });

  it('smoker rates are significantly higher than non-smoker', () => {
    const base: UserProfile = {
      age: 40,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const smoker: UserProfile = { ...base, smokerStatus: 'current' };
    const baseQuotes = getEstimates(base);
    const smokerQuotes = getEstimates(smoker);
    expect(smokerQuotes[0].monthlyRate).toBeGreaterThan(baseQuotes[0].monthlyRate * 2);
  });

  it('interpolates for ages not in the table', () => {
    const profile: UserProfile = {
      age: 37,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    expect(quotes[0].monthlyRate).toBeGreaterThan(0);
    quotes.forEach((q) => {
      expect(q.monthlyRate).not.toBeNaN();
    });
  });

  it('returns empty array for unavailable term/age combos', () => {
    const profile: UserProfile = {
      age: 65,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 30,
    };
    const quotes = getEstimates(profile);
    expect(quotes).toHaveLength(0);
  });
});
