'use client';

import { type ReactElement } from 'react';

// Helper to generate a row of heart SVGs
function Hearts({ count }: { count: number }): ReactElement {
  const gap = 2;
  const heartW = 14;
  const totalW = count * heartW + (count - 1) * gap;
  const offsetX = (48 - totalW) / 2;

  return (
    <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
      {Array.from({ length: count }).map((_, i) => (
        <path
          key={i}
          d="M7 3.5C5.5 1.5 3 1 1.5 2.5S0 6 1.5 8L7 13.5 12.5 8C14 6 14 4 12.5 2.5S8.5 1.5 7 3.5z"
          fill="#ef4444"
          transform={`translate(${offsetX + i * (heartW + gap)}, 5) scale(0.95)`}
        />
      ))}
    </svg>
  );
}

const icons: Record<string, ReactElement> = {
  // Gender
  male: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <circle cx="13" cy="19" r="7" />
      <path d="M18 14l7-7" />
      <path d="M21 7h4v4" />
    </svg>
  ),
  female: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <circle cx="16" cy="13" r="7" />
      <path d="M16 20v7" />
      <path d="M12 24h8" />
    </svg>
  ),

  // Smoker
  noSmoking: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <circle cx="16" cy="16" r="11" />
      <path d="M8 8l16 16" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <circle cx="16" cy="16" r="11" />
      <path d="M16 10v6l4 3" />
    </svg>
  ),
  cigarette: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <rect x="4" y="20" width="18" height="4" rx="1" />
      <path d="M25 20v4" />
      <path d="M28 20v4" />
      <path d="M22 14c0-3 2-4 2-6s-1-3-1-3" />
      <path d="M25 14c0-3 2-4 2-6s-1-3-1-3" />
    </svg>
  ),

  // Health (hearts rating)
  hearts5: <Hearts count={5} />,
  hearts4: <Hearts count={4} />,
  hearts3: <Hearts count={3} />,
  hearts1: <Hearts count={1} />,

  // Lead intro
  handshake: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <path d="M4 17l5-5 4 2 5-5 3 1 7-3" />
      <path d="M4 17l4 1 4-1 4 2 4-1 4 1 4-2" />
      <path d="M12 19l-2 4M16 20l-1 4M20 19l1 4" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <path d="M20 6c1-2 3-2 4 0l1 4" />
      <path d="M17 5c1-2 3-2 4 0l2 7" />
      <path d="M14 7c1-2 3-2 4 0l1 5" />
      <path d="M11 10c1-2 3-2 4 0l1 4" />
      <path d="M8 18c-2-4-1-6 1-7" />
      <path d="M25 14c1 6-1 11-7 13-4 1-8-1-10-5" />
    </svg>
  ),
};

interface OptionIconProps {
  name: string;
  className?: string;
}

export default function OptionIcon({ name, className }: OptionIconProps) {
  const icon = icons[name];
  if (!icon) return null;
  return <span className={className}>{icon}</span>;
}
