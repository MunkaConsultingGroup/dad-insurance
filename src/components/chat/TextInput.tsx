'use client';

import { useState, KeyboardEvent } from 'react';

interface TextInputProps {
  type?: 'text' | 'number' | 'email' | 'tel';
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export default function TextInput({ type = 'text', placeholder = 'Type here...', onSubmit, disabled }: TextInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 mb-3">
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:border-slate-700
                   outline-none text-sm transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-5 py-3 rounded-full bg-slate-700 text-white text-sm font-medium
                   hover:bg-slate-800 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
