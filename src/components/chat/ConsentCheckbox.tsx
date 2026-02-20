'use client';

import { useState } from 'react';

interface ConsentCheckboxProps {
  onConsent: (consented: boolean, text: string) => void;
  disabled?: boolean;
}

const CONSENT_TEXT =
  'By checking this box, I consent to receiving estimated life insurance quotes. I understand these quotes are estimates and not a final locked-in rate. I agree to be contacted by a licensed insurance agent at the phone number provided, including by autodialer, prerecorded message, or email, to help me lock in a final rate or explore additional coverage options for my family. This is not a condition of any purchase. I also agree to the Privacy Policy and Terms of Service.';

export default function ConsentCheckbox({ onConsent, disabled }: ConsentCheckboxProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="mb-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-slate-700 focus:ring-slate-700"
        />
        <span className="text-xs text-gray-600 leading-relaxed">{CONSENT_TEXT}</span>
      </label>
      <button
        onClick={() => onConsent(checked, CONSENT_TEXT)}
        disabled={!checked || disabled}
        className="mt-3 w-full px-4 py-3 rounded-full bg-slate-700 text-white text-sm font-medium
                   hover:bg-slate-800 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Yes, I consent
      </button>
    </div>
  );
}
