import { NextRequest, NextResponse } from 'next/server';
import { getEstimates } from '@/lib/rates';
import { UserProfile } from '@/lib/types';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const profile: UserProfile = {
    age: parseInt(params.get('age') || '0', 10),
    gender: (params.get('gender') as 'male' | 'female') || 'male',
    smokerStatus: (params.get('smoker') as 'never' | 'current' | 'former') || 'never',
    healthClass: (params.get('health') as UserProfile['healthClass']) || 'preferred',
    coverageAmount: parseInt(params.get('coverage') || '250000', 10),
    termLength: parseInt(params.get('term') || '20', 10),
  };

  if (profile.age < 18 || profile.age > 85) {
    return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
  }

  const quotes = getEstimates(profile);
  return NextResponse.json({ quotes });
}
