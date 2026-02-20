'use client';

import { useState } from 'react';

interface VerifyCodeInputProps {
  phone: string;
  onVerified: (code: string) => void;
  onChangeNumber: () => void;
}

export default function VerifyCodeInput({ phone, onVerified, onChangeNumber }: VerifyCodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async () => {
    if (code.length < 4) {
      setError('Please enter the full verification code.');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (data.success) {
        onVerified(code);
      } else {
        setError("That code didn't work. Please try again.");
        setCode('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      await fetch('/api/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {
      setError('Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mb-4 mt-2">
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Enter code"
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-[15px] text-center tracking-widest font-mono
                     focus:outline-none focus:border-slate-700 transition-colors duration-200"
          disabled={checking}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={checking || code.length < 4}
          className="px-5 py-3 rounded-xl bg-slate-700 text-white text-sm font-medium
                     hover:bg-slate-800 transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Verify'}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-2">{error}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          {resent ? 'Code sent!' : resending ? 'Sending...' : 'Resend code'}
        </button>
        <button
          onClick={onChangeNumber}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          Use a different number
        </button>
      </div>
    </div>
  );
}
